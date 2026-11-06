-- ============================================================================
--  CAFÉ DUGOUT — DURCISSEMENT SÉCURITÉ (migration 4)
--  À coller dans : Supabase Dashboard > SQL Editor > New query > Run
--  Idempotent : peut être relancé sans casser les données.
--
--  Contenu :
--    1. Idempotence des commandes (client_ref)      -> pas de doublon hors-ligne
--    2. Compteurs de débit en base (check_rate_limit)
--    3. Intents de paiement (payment_intents)
--    4. Journal des webhooks + unicité anti-rejeu (webhook_events)
--    5. webhook_apply_payment() : application vérifiée d'un paiement
--    6. client_place_order_secure() : point d'entrée unique et validé
--    7. Hygiène des droits (GRANT/REVOKE)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. IDEMPOTENCE : une commande envoyée deux fois = une seule en base
-- ----------------------------------------------------------------------------
alter table public.orders add column if not exists client_ref uuid;
create unique index if not exists orders_client_ref_uniq
  on public.orders (client_ref) where client_ref is not null;

comment on column public.orders.client_ref is
  'UUID généré par le téléphone (file d''attente hors-ligne). Contrainte unique = anti-doublon.';

-- ----------------------------------------------------------------------------
-- 2. LIMITATION DE DÉBIT EN BASE
--    Complète le rate limiting de l'API (l'app peut être contournée :
--    un attaquant peut appeler Supabase directement avec la clé anon).
-- ----------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key,
  hits         integer not null default 0,
  window_start timestamptz not null default now()
);
alter table public.rate_limits enable row level security;
-- aucune policy : table interne, accessible seulement aux fonctions security definer

create or replace function public.check_rate_limit(p_key text, p_max integer, p_window interval)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.rate_limits;
begin
  insert into public.rate_limits (key) values (left(p_key, 200))
    on conflict (key) do nothing;

  select * into r from public.rate_limits where key = left(p_key, 200) for update;

  -- fenêtre expirée : on repart de zéro
  if r.window_start < now() - p_window then
    update public.rate_limits set hits = 1, window_start = now() where key = r.key;
    return true;
  end if;

  if r.hits >= p_max then
    return false;
  end if;

  update public.rate_limits set hits = r.hits + 1 where key = r.key;
  return true;
end $$;

revoke all on function public.check_rate_limit(text, integer, interval) from public;
grant execute on function public.check_rate_limit(text, integer, interval) to anon, authenticated, service_role;

-- purge périodique (à planifier une fois/jour depuis le dashboard, ou via pg_cron)
create or replace function public.purge_rate_limits()
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limits where window_start < now() - interval '1 hour';
$$;
revoke all on function public.purge_rate_limits() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. INTENTS DE PAIEMENT
--    Un "intent" = « la commande X doit être payée Y MRU par l'opérateur Z ».
--    Le webhook de l'opérateur ne fait que confirmer cet intent : il ne peut
--    ni inventer un montant, ni payer une commande qui n'a pas été ouverte.
-- ----------------------------------------------------------------------------
create table if not exists public.payment_intents (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  provider   text not null check (provider in ('bankily', 'masrivi', 'sedad', 'click')),
  amount     numeric(10, 2) not null check (amount > 0),
  reference  text not null,
  status     text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  paid_at    timestamptz,
  constraint payment_intents_ref_uniq unique (provider, reference)
);
alter table public.payment_intents enable row level security;
-- aucune policy : seul le service_role (webhooks) et les fonctions ci-dessous y accèdent

create index if not exists payment_intents_order_idx on public.payment_intents (order_id);

-- Création d'un intent par l'équipe (POS) : renvoie la référence à transmettre
-- à l'opérateur de paiement.
create or replace function public.staff_create_payment_intent(
  p_order uuid, p_provider text, p_amount numeric default null, p_reference text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_role public.staff_role; v_total numeric; v_paid numeric; v_left numeric;
        v_amount numeric; v_ref text; v_id uuid;
begin
  select role into v_role from public.staff where id = auth.uid() and is_active;
  if v_role is null or v_role not in ('admin', 'gerant', 'serveur') then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  if p_provider not in ('bankily', 'masrivi', 'sedad', 'click') then
    raise exception 'Opérateur inconnu' using errcode = '22023';
  end if;

  select subtotal into v_total from public.orders where id = p_order;
  if v_total is null then
    raise exception 'Commande inconnue' using errcode = '22023';
  end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = p_order;
  v_left := round(v_total - v_paid, 2);
  if v_left <= 0 then
    raise exception 'Commande déjà payée' using errcode = '22023';
  end if;

  v_amount := round(coalesce(p_amount, v_left), 2);
  if v_amount <= 0 or v_amount > v_left + 0.01 then
    raise exception 'Montant invalide (reste à payer : % MRU)', v_left using errcode = '22023';
  end if;

  v_ref := coalesce(nullif(btrim(p_reference), ''), 'CC-' || substr(replace(p_order::text, '-', ''), 1, 8) || '-' || floor(random() * 100000)::text);

  insert into public.payment_intents (order_id, provider, amount, reference)
  values (p_order, p_provider, v_amount, v_ref)
  returning id into v_id;

  return jsonb_build_object('intent_id', v_id, 'reference', v_ref, 'amount', v_amount, 'provider', p_provider);
end $$;

revoke all on function public.staff_create_payment_intent(uuid, text, numeric, text) from public, anon;
grant execute on function public.staff_create_payment_intent(uuid, text, numeric, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. JOURNAL DES WEBHOOKS (idempotence + piste d'audit)
-- ----------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id          bigserial primary key,
  provider    text not null,
  event_id    text not null,
  reference   text,
  amount      numeric(10, 2),
  status      text,
  payload     jsonb not null,
  received_at timestamptz not null default now(),
  constraint webhook_events_uniq unique (provider, event_id)
);
alter table public.webhook_events enable row level security;
-- aucune policy : service_role uniquement

create index if not exists webhook_events_received_idx on public.webhook_events (received_at desc);

-- ----------------------------------------------------------------------------
-- 5. APPLICATION D'UN PAIEMENT CONFIRMÉ PAR UN WEBHOOK
--    security definer + EXECUTE réservé au service_role : appelée uniquement
--    par /api/payments/webhook/[provider], après vérification de la signature.
--
--    Garanties :
--      - un même event_id n'est jamais traité deux fois (contrainte unique)
--      - le montant reçu doit correspondre à l'intent (tolérance 1 centime)
--      - le paiement ne peut pas dépasser le reste à payer
--      - tout est tracé (webhook_events.payload)
-- ----------------------------------------------------------------------------
create or replace function public.webhook_apply_payment(
  p_provider text, p_event_id text, p_reference text, p_amount numeric,
  p_status text, p_payload jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_intent public.payment_intents; v_total numeric; v_paid numeric; v_left numeric; v_take numeric;
begin
  -- 5.1 idempotence : l'insertion échoue silencieusement si l'événement existe déjà
  insert into public.webhook_events (provider, event_id, reference, amount, status, payload)
  values (p_provider, p_event_id, p_reference, p_amount, p_status, coalesce(p_payload, '{}'::jsonb))
  on conflict (provider, event_id) do nothing;

  if not found then
    return jsonb_build_object('duplicate', true, 'result', 'already_processed');
  end if;

  -- 5.2 l'intent correspondant doit exister (référence + opérateur)
  select * into v_intent from public.payment_intents
   where provider = p_provider and reference = p_reference
   for update;

  if v_intent.id is null then
    return jsonb_build_object('duplicate', false, 'result', 'no_intent');
  end if;

  if p_status <> 'paid' then
    update public.payment_intents set status = p_status where id = v_intent.id;
    return jsonb_build_object('duplicate', false, 'result', p_status);
  end if;

  if v_intent.status = 'paid' then
    return jsonb_build_object('duplicate', false, 'result', 'already_paid');
  end if;

  -- 5.3 le montant annoncé par l'opérateur doit être celui de l'intent
  if abs(coalesce(p_amount, 0) - v_intent.amount) > 0.01 then
    update public.payment_intents set status = 'failed' where id = v_intent.id;
    return jsonb_build_object('duplicate', false, 'result', 'amount_mismatch');
  end if;

  -- 5.4 on n'encaisse jamais plus que le reste à payer
  select subtotal into v_total from public.orders where id = v_intent.order_id;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = v_intent.order_id;
  v_left := round(coalesce(v_total, 0) - v_paid, 2);
  if v_left <= 0 then
    update public.payment_intents set status = 'paid', paid_at = now() where id = v_intent.id;
    return jsonb_build_object('duplicate', false, 'result', 'nothing_left');
  end if;
  v_take := least(v_intent.amount, v_left);

  insert into public.payments (order_id, amount, method, phone, received_by)
  values (v_intent.order_id, v_take, p_provider::public.payment_method, null, null);

  update public.payment_intents set status = 'paid', paid_at = now() where id = v_intent.id;

  return jsonb_build_object(
    'duplicate', false, 'result', 'paid',
    'order_id', v_intent.order_id, 'amount', v_take, 'provider', p_provider
  );
end $$;

revoke all on function public.webhook_apply_payment(text, text, text, numeric, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.webhook_apply_payment(text, text, text, numeric, text, jsonb)
  to service_role;

-- ----------------------------------------------------------------------------
-- 6. POINT D'ENTRÉE UNIQUE DES COMMANDES CLIENT
--    Appelée par /api/orders (validateurs Zod + rate limiting déjà passés).
--    Re-vérifie TOUT en base : table active, produits existants et disponibles,
--    prix relus dans menu_items, quantités bornées, débit, idempotence.
-- ----------------------------------------------------------------------------
create or replace function public.client_place_order_secure(
  p_code text default null,
  p_token text default null,
  p_items jsonb default '[]'::jsonb,
  p_note text default null,
  p_client_ref uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.resto_tables; v_order uuid; v_existing uuid; v_item jsonb; v_qty int;
begin
  -- 6.0 idempotence : si ce client_ref a déjà produit une commande, on renvoie la même
  if p_client_ref is not null then
    select o.id into v_existing from public.orders o where o.client_ref = p_client_ref;
    if v_existing is not null then
      return jsonb_build_object(
        'order_id', v_existing,
        'order', public._client_order_json((select table_id from public.orders where id = v_existing)),
        'duplicate', true
      );
    end if;
  end if;

  -- 6.1 résolution de la table : jeton QR (secret) OU code fourni par le client
  if p_token is not null and btrim(p_token) <> '' then
    begin
      select * into t from public.resto_tables
       where qr_token = btrim(p_token)::uuid and is_active;
    exception when invalid_text_representation then
      raise exception 'QR invalide' using errcode = '22023';
    end;
  elsif p_code is not null and btrim(p_code) <> '' then
    select * into t from public.resto_tables
     where code = upper(btrim(p_code)) and is_active;
  end if;

  if t.id is null then
    raise exception 'Table inconnue ou fermée' using errcode = '22023';
  end if;

  -- 6.2 débit : 10 envois/minute par table (en plus du throttle applicatif)
  if not public.check_rate_limit('order:' || t.code, 10, '1 minute') then
    raise exception 'Trop de commandes envoyées. Patientez une minute.' using errcode = '22023';
  end if;

  -- 6.3 forme des articles (le détail prix est fait par place_order_core)
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Panier vide' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'Trop d''articles (30 max)' using errcode = '22023';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      perform (v_item ->> 'menu_item_id')::uuid;
    exception when others then
      raise exception 'Article invalide' using errcode = '22023';
    end;
    v_qty := coalesce((v_item ->> 'qty')::int, 0);
    if v_qty < 1 or v_qty > 20 then
      raise exception 'Quantité invalide (1 à 20)' using errcode = '22023';
    end if;
  end loop;

  -- 6.4 création (prix relus en base, totaux recalculés par trigger)
  v_order := public.place_order_core(t.id, p_items, p_note, 'client', null);

  if p_client_ref is not null then
    update public.orders set client_ref = p_client_ref
     where id = v_order and client_ref is null;
  end if;

  return jsonb_build_object(
    'order_id', v_order,
    'order', public._client_order_json(t.id),
    'duplicate', false
  );
end $$;

revoke all on function public.client_place_order_secure(text, text, jsonb, text, uuid) from public;
grant execute on function public.client_place_order_secure(text, text, jsonb, text, uuid)
  to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. HYGIÈNE DES DROITS
-- ----------------------------------------------------------------------------

-- 7.1 Les chemins historiques restent ouverts pour compatibilité (ancienne
--     version « 1 fichier HTML »). Une fois que tout le monde utilise l'app
--     Next.js / PWA, décommentez les deux lignes ci-dessous : les commandes ne
--     pourront alors passer QUE par /api/orders (validation + débit + idempotence).
--
-- revoke execute on function public.client_place_order(uuid, jsonb, text) from anon, authenticated;
-- revoke execute on function public.client_place_order_by_table(text, jsonb, text) from anon, authenticated;

-- 7.2 Aucune fonction d'administration ne doit être exécutable par Anon.
revoke execute on function public.promote_staff(text, public.staff_role, text) from anon;
revoke all on function public.purge_rate_limits() from anon, authenticated;

-- 7.3 La table resto_tables contient les jetons QR (secrets) : le rôle public
--     n'y accède pas, seulement au minimum utile via la vue v_tables_public
--     (code + libellé). L'équipe connectée garde l'accès complet.
revoke select on public.resto_tables from anon;
grant select (code, label, seats, is_active) on public.resto_tables to authenticated;

-- 7.4 Rappel : la clé service_role ne doit JAMAIS être exposée au navigateur.
--     (contrôle de bon sens, visible dans les logs du SQL Editor)

-- ----------------------------------------------------------------------------
-- 8. VÉRIFICATION
-- ----------------------------------------------------------------------------
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('check_rate_limit', 'webhook_apply_payment',
                        'client_place_order_secure', 'staff_create_payment_intent')) as fonctions_installees,
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name in ('payment_intents', 'webhook_events', 'rate_limits')) as tables_creees,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'client_ref') as colonne_client_ref;
-- Attendu : 4 | 3 | 1
