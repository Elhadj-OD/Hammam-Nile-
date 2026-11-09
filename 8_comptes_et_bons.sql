-- ============================================================================
-- CAFÉ DUGOUT — 8. Comptes par code à 4 chiffres + bon imprimé à chaque commande
-- À exécuter une fois dans le SQL Editor (après 1 à 7).
--
-- Mots de passe (à saisir sur la page de connexion, après avoir choisi le profil) :
--     Admin 22405723 · Gérant 112233 · Serveur 123456 · Cuisine 223344
-- Le fichier peut être relancé : il met à jour les mots de passe des comptes existants.
-- Pour changer un mot de passe plus tard : voir la section 4 en bas du fichier.
-- ============================================================================

-- ---------------------------------------------------------------- 1. Comptes
do $$
declare r record; v_id uuid;
begin
  perform set_config('search_path', 'public, extensions, auth, pg_temp', true);   -- crypt() / gen_salt()

  for r in
    select * from (values
      ('admin@dugout.mr',   '22405723', 'admin',   'Admin'),
      ('gerant@dugout.mr',  '112233', 'gerant',  'Gérant'),
      ('serveur@dugout.mr', '123456', 'serveur', 'Serveur'),
      ('cuisine@dugout.mr', '223344', 'cuisine', 'Cuisine')
    ) as t(email, pin, role_name, label)
  loop
    select id into v_id from auth.users where email = r.email;
    if v_id is null then
      v_id := gen_random_uuid();
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                              confirmation_token, recovery_token, email_change_token_new, email_change)
      values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', r.email,
              crypt(r.pin, gen_salt('bf')), now(),
              '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), v_id, v_id::text,
              jsonb_build_object('sub', v_id::text, 'email', r.email, 'email_verified', true),
              'email', now(), now(), now());
    else
      update auth.users
         set encrypted_password = crypt(r.pin, gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
       where id = v_id;
    end if;

    insert into public.staff (id, full_name, role, is_active)
    values (v_id, r.label, r.role_name::public.staff_role, true)
    on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, is_active = true;
  end loop;

  -- Anciens comptes de test en @gmail.com : adresses réelles appartenant à d'autres personnes
  -- (une réinitialisation de mot de passe leur serait envoyée) -> on les supprime.
  begin
    delete from auth.users where email in ('admin@gmail.com', 'serveuse@gmail.com');
  exception when foreign_key_violation then
    raise notice 'Anciens comptes gmail conservés (des commandes y sont rattachées) : désactivez-les dans Authentication > Users.';
  end;
end $$;

-- ---------------------------------------------------------------- 2. Bons de commande
create table if not exists public.order_tickets (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  order_no    bigint,
  table_label text not null,
  by_name     text,                         -- qui a lancé la commande
  by_role     text,                         -- admin / gerant / serveur
  lines       jsonb not null,               -- [{name, qty, note}]
  note        text,
  created_at  timestamptz not null default now(),
  printed_at  timestamptz                   -- null = pas encore imprimé
);
create index if not exists order_tickets_pending_idx on public.order_tickets (created_at) where printed_at is null;
create index if not exists order_tickets_order_idx   on public.order_tickets (order_id);

alter table public.order_tickets enable row level security;
revoke all on public.order_tickets from anon, authenticated;
grant select on public.order_tickets to authenticated;
drop policy if exists order_tickets_read on public.order_tickets;
create policy order_tickets_read on public.order_tickets for select to authenticated using (public.is_team());

-- Prendre une commande (serveur, gérant, admin) : crée aussi le bon à imprimer.
create or replace function public.staff_place_order(p_table_code text, p_items jsonb, p_note text default null)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.resto_tables; v_order uuid; v_lines jsonb; v_by text; v_role text;
begin
  if not public.has_role(array['admin', 'gerant', 'serveur']::public.staff_role[]) then
    raise exception 'Non autorisé : seuls les serveurs, le gérant et l''admin prennent les commandes' using errcode = '42501';
  end if;
  select * into t from public.resto_tables where code = upper(p_table_code);
  if t.id is null then
    raise exception 'Table inconnue: %', p_table_code using errcode = '22023';
  end if;

  v_order := public.place_order_core(t.id, p_items, p_note, 'serveur', (select auth.uid()));

  select coalesce(jsonb_agg(jsonb_build_object(
           'name', m.name,
           'qty',  greatest(1, least(99, coalesce((e->>'qty')::int, 1))),
           'note', nullif(btrim(coalesce(e->>'note', '')), '')) order by m.name), '[]'::jsonb)
    into v_lines
    from jsonb_array_elements(p_items) e
    join public.menu_items m on m.id = (e->>'menu_item_id')::uuid;

  select s.full_name, s.role::text into v_by, v_role from public.staff s where s.id = auth.uid();

  insert into public.order_tickets (order_id, order_no, table_label, by_name, by_role, lines, note)
  values (v_order, (select o.order_no from public.orders o where o.id = v_order), t.label,
          v_by, v_role, v_lines, nullif(btrim(coalesce(p_note, '')), ''));
  return v_order;
end $$;

-- Le poste d'impression « réclame » les bons non imprimés (un seul poste imprime chaque bon).
create or replace function public.staff_claim_tickets(p_limit int default 10)
returns setof public.order_tickets
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_team() then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  return query
    with c as (
      select id from public.order_tickets
       where printed_at is null and created_at > now() - interval '12 hours'
       order by created_at
       limit least(greatest(p_limit, 1), 20)
       for update skip locked)
    update public.order_tickets t set printed_at = now() from c where t.id = c.id returning t.*;
end $$;

revoke all on function public.staff_claim_tickets(int) from public, anon;
grant execute on function public.staff_claim_tickets(int) to authenticated;

-- ---------------------------------------------------------------- 3. Vérification (doit lister 4 comptes)
select u.email, s.role, s.full_name, s.is_active
  from auth.users u join public.staff s on s.id = u.id
 where u.email like '%@dugout.mr' order by s.role;

-- ---------------------------------------------------------------- 4. Changer un code ou un nom plus tard
-- update auth.users set encrypted_password = extensions.crypt('NOUVEAUMOTDEPASSE', extensions.gen_salt('bf'))
--  where email = 'serveur@dugout.mr';
-- update public.staff set full_name = 'Mariem' where id = (select id from auth.users where email = 'serveur@dugout.mr');
