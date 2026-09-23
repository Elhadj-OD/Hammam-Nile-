-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — SCHEMA SUPABASE (POSTGRESQL)
-- Copiez-collez ce script dans le "SQL Editor" de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Table des Produits
CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'savons',
  price NUMERIC NOT NULL DEFAULT 0,
  qty INT NOT NULL DEFAULT 0,
  "minQty" INT NOT NULL DEFAULT 5,
  emoji TEXT DEFAULT '🧼',
  image TEXT,
  barcode TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par code-barres et catégorie
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- 2. Table des Ventes (Historique caisse)
CREATE TABLE IF NOT EXISTS public.sales (
  id BIGINT PRIMARY KEY,
  caissier TEXT NOT NULL,
  "caissierName" TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  total NUMERIC NOT NULL,
  subtotal NUMERIC,
  discount NUMERIC DEFAULT 0,
  payment TEXT NOT NULL DEFAULT 'cash',
  "paymentDetail" TEXT,
  "amountReceived" NUMERIC,
  "changeGiven" NUMERIC,
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  timestamp BIGINT NOT NULL,
  "customerName" TEXT DEFAULT 'Comptoir',
  "customerPhone" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON public.sales(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sales_caissier ON public.sales(caissier);

-- 3. Table des Clients (CRM)
CREATE TABLE IF NOT EXISTS public.clients (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  "createdAt" TEXT,
  "purchaseCount" INT DEFAULT 0,
  "totalSpent" NUMERIC DEFAULT 0,
  "lastPurchaseDate" TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);

-- 4. Table des Mouvements de Stock (Audit Entrées / Sorties)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id BIGSERIAL PRIMARY KEY,
  "productId" BIGINT NOT NULL,
  "productName" TEXT NOT NULL,
  type TEXT NOT NULL, -- 'in' ou 'out'
  qty INT NOT NULL,
  reason TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  "user" TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des Prélèvements Hammam (Sorties de stock usage interne)
CREATE TABLE IF NOT EXISTS public.hammam_usages (
  id BIGSERIAL PRIMARY KEY,
  "productId" BIGINT NOT NULL,
  "productName" TEXT NOT NULL,
  qty INT NOT NULL,
  "unitPrice" NUMERIC NOT NULL,
  "totalValue" NUMERIC NOT NULL,
  "serviceOrCabin" TEXT,
  "requestedBy" TEXT,
  "takenByStaff" TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  notes TEXT,
  "customerPhone" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table des Paramètres Boutique
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id INT PRIMARY KEY DEFAULT 1,
  settings JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table de Présence (qui est connecté, sur quelle caisse — contrôle des heures)
-- Ne contient jamais de mot de passe.
CREATE TABLE IF NOT EXISTS public.presence (
  username TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  "lastActive" BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table des Profils (identité applicative liée à Supabase Auth)
-- Remplace l'ancienne liste d'utilisateurs stockée en clair côté client
-- (src/data/initialData.ts). Un profil n'existe que pour un compte Supabase
-- Auth réel (id = auth.users.id) ; aucun mot de passe n'est stocké ici,
-- Supabase Auth le gère lui-même (hashé, jamais lisible).
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'caissier' CHECK (role IN ('caissier', 'gerant')),
  gender TEXT CHECK (gender IN ('femme', 'homme')),
  department TEXT,
  locked BOOLEAN NOT NULL DEFAULT false,
  avatar TEXT,
  phone TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 9. Activer Row Level Security (RLS) avec politique ouverte pour le POS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hammam_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- profiles : lecture réservée aux comptes authentifiés (liste d'équipe,
-- écran "switch user"). AUCUNE policy INSERT/UPDATE/DELETE cliente :
-- toute écriture passe par api/admin-users.ts (clé service_role côté
-- serveur), qui vérifie que l'appelant est 'gerant' avant de modifier
-- un autre compte que le sien.
DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;
CREATE POLICY "Authenticated read profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politiques d'accès (permettant la synchronisation directe depuis l'application avec la clé anon)
-- Chaque table n'ouvre que les opérations réellement utilisées par l'application
-- (voir src/lib/supabase.ts) : les journaux d'audit sont en écriture seule
-- (insert-only, jamais modifiés ni supprimés) et les ventes/paramètres ne sont
-- jamais supprimés depuis le client.
DROP POLICY IF EXISTS "Public access for products" ON public.products;
CREATE POLICY "Public read for products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public insert for products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete for products" ON public.products FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public access for sales" ON public.sales;
CREATE POLICY "Public read for sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Public insert for sales" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for sales" ON public.sales FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for clients" ON public.clients;
CREATE POLICY "Public read for clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Public insert for clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for clients" ON public.clients FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete for clients" ON public.clients FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public access for stock_movements" ON public.stock_movements;
CREATE POLICY "Public read for stock_movements" ON public.stock_movements FOR SELECT USING (true);
CREATE POLICY "Public insert for stock_movements" ON public.stock_movements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for hammam_usages" ON public.hammam_usages;
CREATE POLICY "Public read for hammam_usages" ON public.hammam_usages FOR SELECT USING (true);
CREATE POLICY "Public insert for hammam_usages" ON public.hammam_usages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for shop_settings" ON public.shop_settings;
CREATE POLICY "Public read for shop_settings" ON public.shop_settings FOR SELECT USING (true);
CREATE POLICY "Public insert for shop_settings" ON public.shop_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for shop_settings" ON public.shop_settings FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for presence" ON public.presence;
CREATE POLICY "Public access for presence" ON public.presence FOR ALL USING (true) WITH CHECK (true);

-- Activer les notifications temps réel (Realtime) sur les tables critiques
-- Indispensable pour que les changements faits sur un appareil (ex: la
-- gérante ajoute un produit) apparaissent sans rechargement de page sur
-- les autres appareils connectés (ex: la caisse d'une vendeuse).
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hammam_usages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
