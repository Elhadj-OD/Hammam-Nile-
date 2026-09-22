-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — INSTALLATION COMPLETE SUPABASE
-- A copier-coller EN ENTIER dans Supabase > SQL Editor (pas Logs), puis "Run".
--
-- Ce script fait tout en une fois, sans risque, et peut être relancé
-- plusieurs fois sans problème :
--   1) Crée les 6 tables de l'application si elles n'existent pas déjà
--      (products, sales, clients, stock_movements, hammam_usages,
--      shop_settings), avec la sécurité (RLS) et le temps réel.
--   2) Insère les 187 articles de la boutique (12 articles hammam
--      d'origine + 125 Boutique Femme + 50 Boutique Homme).
--      ON CONFLICT (id) DO NOTHING : si un article avec cet id existe
--      déjà, la ligne est ignorée — vos données ne sont jamais écrasées.
-- ==============================================================================

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table des Paramètres Boutique
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id INT PRIMARY KEY DEFAULT 1,
  settings JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Activer Row Level Security (RLS) avec politique ouverte pour le POS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hammam_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès (permettant la synchronisation directe depuis l'application avec la clé anon)
DROP POLICY IF EXISTS "Public access for products" ON public.products;
CREATE POLICY "Public access for products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for sales" ON public.sales;
CREATE POLICY "Public access for sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for clients" ON public.clients;
CREATE POLICY "Public access for clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for stock_movements" ON public.stock_movements;
CREATE POLICY "Public access for stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for hammam_usages" ON public.hammam_usages;
CREATE POLICY "Public access for hammam_usages" ON public.hammam_usages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for shop_settings" ON public.shop_settings;
CREATE POLICY "Public access for shop_settings" ON public.shop_settings FOR ALL USING (true) WITH CHECK (true);

-- Activer les notifications temps réel (Realtime) sur les tables critiques
-- (protégé contre une exécution répétée : ignore l'erreur si déjà activé)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hammam_usages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;


-- ==============================================================================
-- INSERTION DES 187 ARTICLES DE LA BOUTIQUE
-- ==============================================================================

INSERT INTO public.products (id, name, category, price, qty, "minQty", emoji, description)
VALUES
  (1, 'Savon noir Ghassoul', 'savons', 150, 50, 10, '🧼', 'Savon noir traditionnel purifiant'),
  (2, 'Gant Kessa', 'accessoires', 80, 80, 15, '🧤', 'Gant exfoliant de gommage traditionnel'),
  (3, 'Huile d''argan 100ml', 'huiles', 350, 25, 5, '🫙', 'Huile vierge pure et précieuse'),
  (4, 'Gommage épices', 'savons', 200, 30, 8, '🧴', 'Gommage tonifiant aux épices orientales'),
  (5, 'Serviette brodée', 'linge', 450, 20, 5, '🧺', 'Serviette de bain brodée de prestige'),
  (6, 'Peignoir éponge', 'linge', 900, 15, 4, '👘', 'Peignoir de hammam doux et absorbant'),
  (7, 'Coffret rituel', 'coffrets', 1500, 12, 3, '🎁', 'Pack rituel complet bien-être & spa'),
  (8, 'Huile eucalyptus', 'huiles', 250, 22, 6, '🌿', 'Huile essentielle d''eucalyptus purifiante'),
  (9, 'Sandales hammam', 'accessoires', 120, 40, 10, '🩴', 'Sandales légères antidérapantes'),
  (10, 'Savon rassoul-miel', 'savons', 180, 35, 8, '🍯', 'Savon douceur au miel et rassoul'),
  (11, 'Drap de bain', 'linge', 550, 18, 5, '🛁', 'Grand drap de bain confort'),
  (12, 'Coffret voyage', 'coffrets', 750, 14, 4, '🎒', 'Mini trousse complète voyage hammam'),
  (13, 'Jaclin (jedora)', 'femmes', 0, 0, 5, '💄', NULL),
  (14, 'Neseem (burham)', 'femmes', 0, 0, 5, '💄', NULL),
  (15, 'Tulipān negro (fresa & nata)', 'femmes', 0, 0, 5, '💄', NULL),
  (16, 'Tulipān negro (candy fantasy)', 'femmes', 0, 0, 5, '💄', NULL),
  (17, 'Tulipān negro (body mist)', 'femmes', 0, 0, 5, '🌸', NULL),
  (18, 'Tulipān negro (coco pure white)', 'femmes', 0, 0, 5, '💄', NULL),
  (19, 'Melano (exotic beach)', 'femmes', 0, 0, 5, '💄', NULL),
  (20, 'Melano (pear gloss)', 'femmes', 0, 0, 5, '💄', NULL),
  (21, 'Bien etre (eau de Cologne)', 'femmes', 0, 0, 5, '🌸', NULL),
  (22, 'Saphir (select blue)', 'femmes', 0, 0, 5, '💄', NULL),
  (23, 'Venus (déodorant océan)', 'femmes', 0, 0, 5, '🧴', NULL),
  (24, 'Olive oil (huile)', 'femmes', 0, 0, 5, '🫙', NULL),
  (25, 'Sensitélial (gel nettoyant)', 'femmes', 0, 0, 5, '💧', NULL),
  (26, 'Romance (eau de parfum)', 'femmes', 0, 0, 5, '🌸', NULL),
  (27, 'Elixir de miel (sérum réparateur)', 'femmes', 0, 0, 5, '💧', NULL),
  (28, 'Venus (sun flower)', 'femmes', 0, 0, 5, '💄', NULL),
  (29, 'Nivea mousse (eau hydratante)', 'femmes', 0, 0, 5, '💄', NULL),
  (30, 'Nexton baby (spray moustique)', 'femmes', 0, 0, 5, '💄', NULL),
  (31, 'Sébionex (gel nettoyant)', 'femmes', 0, 0, 5, '💧', NULL),
  (32, 'Johnsons (huile baby)', 'femmes', 0, 0, 5, '🫙', NULL),
  (33, 'Le ptt marseiliais (sublimante)', 'femmes', 0, 0, 5, '💄', NULL),
  (34, 'Selon pro vitamine E (hair food)', 'femmes', 0, 0, 5, '💄', NULL),
  (35, 'Vaseline (cocoa radiant body oil)', 'femmes', 0, 0, 5, '🫙', NULL),
  (36, 'Desert flower (shampoo)', 'femmes', 0, 0, 5, '🧴', NULL),
  (37, 'Lana inceller (huile termini...)', 'femmes', 0, 0, 5, '🫙', NULL),
  (38, 'Nike woman (parfum)', 'femmes', 0, 0, 5, '🌸', NULL),
  (39, 'L''Oréal paris elseve (parfum)', 'femmes', 0, 0, 5, '🌸', NULL),
  (40, 'L''Oréal paris elseve (sérum hydratante)', 'femmes', 0, 0, 5, '💧', NULL),
  (41, 'Venus new (mousse de douche)', 'femmes', 0, 0, 5, '💄', NULL),
  (42, 'Calliderme (gel intime)', 'femmes', 0, 0, 5, '💧', NULL),
  (43, 'Nuevo novo (huile coco et aleovera)', 'femmes', 0, 0, 5, '🫙', NULL),
  (44, 'Nivea (lait de corps)', 'femmes', 0, 0, 5, '🧴', NULL),
  (45, 'Nuevo novo (elixir de juventud)', 'femmes', 0, 0, 5, '💄', NULL),
  (46, 'Rose Berry elastic & transculent (huile)', 'femmes', 0, 0, 5, '🫙', NULL),
  (47, 'L''Oréal elseve sérum (huile extraordinaire coco)', 'femmes', 0, 0, 5, '🫙', NULL),
  (48, 'Dove intensiva (crema nutriente)', 'femmes', 0, 0, 5, '🧴', NULL),
  (49, 'Cosmolive (pink champagne)', 'femmes', 0, 0, 5, '💄', NULL),
  (50, 'Cosmolive (hair perfectore)', 'femmes', 0, 0, 5, '💄', NULL),
  (51, 'Dexeryl (crème)', 'femmes', 0, 0, 5, '🧴', NULL),
  (52, 'Johnsons baby (champoo)', 'femmes', 0, 0, 5, '🧴', NULL),
  (53, 'Licorice root (face wash)', 'femmes', 0, 0, 5, '💄', NULL),
  (54, 'Palette intensive (crème color)', 'femmes', 0, 0, 5, '🧴', NULL),
  (55, 'Mixa éclait (lait de corps)', 'femmes', 0, 0, 5, '🧴', NULL),
  (56, 'SHaumar (pot vaselina neutra)', 'femmes', 0, 0, 5, '💄', NULL),
  (57, 'L''Oréal paris (excellence creme)', 'femmes', 0, 0, 5, '🧴', NULL),
  (58, 'ZARA hot sexy (parfum)', 'femmes', 0, 0, 5, '🌸', NULL),
  (59, 'Roskstar old spice (parfum)', 'femmes', 0, 0, 5, '🌸', NULL),
  (60, 'Volume & body (lait de corps)', 'femmes', 0, 0, 5, '🧴', NULL),
  (61, 'Amalfi (color crème)', 'femmes', 0, 0, 5, '🧴', NULL),
  (62, 'Jaclin hair mist (parfum)', 'femmes', 0, 0, 5, '🌸', NULL),
  (63, 'Karatin salon level (hair mask)', 'femmes', 0, 0, 5, '🧖‍♀️', NULL),
  (64, 'Schwarzkopf (pure color)', 'femmes', 0, 0, 5, '🎨', NULL),
  (65, 'L''Oréal paris (coloration soin glossy)', 'femmes', 0, 0, 5, '🎨', NULL),
  (66, 'Syoss zéro ammoniac (oil color)', 'femmes', 0, 0, 5, '🫙', NULL),
  (67, 'Kativa karatina (lait de corps)', 'femmes', 0, 0, 5, '🧴', NULL),
  (68, 'Byphasse avocat (gel de douche exfoliant)', 'femmes', 0, 0, 5, '💧', NULL),
  (69, 'Sanitas (lime ongle électrique)', 'femmes', 0, 0, 5, '💅', NULL),
  (70, 'Revlon colorsilk (pour cheveux)', 'femmes', 0, 0, 5, '💄', NULL),
  (71, 'Diamond liss (spay lissant brillance vernis)', 'femmes', 0, 0, 5, '💅', NULL),
  (72, 'Laser white (strengthening oil)', 'femmes', 0, 0, 5, '🫙', NULL),
  (73, 'Venus (sérum anti frizz)', 'femmes', 0, 0, 5, '💧', NULL),
  (74, 'Mixa (huile anti vergetures)', 'femmes', 0, 0, 5, '🫙', NULL),
  (75, 'L''Oréal paris elseve soin magique (huil pour cheveux)', 'femmes', 0, 0, 5, '💄', NULL),
  (76, 'Baslque (sérum total repair)', 'femmes', 0, 0, 5, '💧', NULL),
  (77, 'Medix5.5 vitamine c+ (lait de corps)', 'femmes', 0, 0, 5, '🧴', NULL),
  (78, 'Vaseline (petit pot)', 'femmes', 0, 0, 5, '🧴', NULL),
  (79, 'Ikt wax stick (crème)', 'femmes', 0, 0, 5, '🧴', NULL),
  (80, 'Nile (émall pour ongles)', 'femmes', 0, 0, 5, '💅', NULL),
  (81, 'Japan flower (crème hydratante)', 'femmes', 0, 0, 5, '🧴', NULL),
  (82, 'Saada baby (Vaseline)', 'femmes', 0, 0, 5, '🧴', NULL),
  (83, 'Skin doctor Goat milk (lait de corps)', 'femmes', 0, 0, 5, '🧴', NULL),
  (84, 'Cosmolive (pot haire mask)', 'femmes', 0, 0, 5, '🧖‍♀️', NULL),
  (85, 'Argán hydratante (lait de corps)', 'femmes', 0, 0, 5, '🧴', NULL),
  (86, 'Colgate max white charbon', 'femmes', 0, 0, 5, '🪥', NULL),
  (87, 'Egl risky business (parfum)', 'femmes', 0, 0, 5, '🌸', NULL),
  (88, 'Honey gel sleep mask', 'femmes', 0, 0, 5, '💧', NULL),
  (89, 'Collagen booster (pot crème)', 'femmes', 0, 0, 5, '🧴', NULL),
  (90, 'Secrat (parfum)', 'femmes', 0, 0, 5, '🌸', NULL),
  (91, 'Vaseline blanche pot', 'femmes', 0, 0, 5, '🧴', NULL),
  (92, 'Gants visage', 'femmes', 0, 0, 5, '🧤', NULL),
  (93, 'Gants kisseu nile', 'femmes', 0, 0, 5, '🧤', NULL),
  (94, 'Pierre pour pieds', 'femmes', 0, 0, 5, '🪨', NULL),
  (95, 'Pantene Superalimento', 'femmes', 0, 0, 5, '🧴', NULL),
  (96, 'Chaussettes', 'femmes', 0, 0, 5, '🧦', NULL),
  (97, 'Rasoir femme', 'femmes', 0, 0, 5, '🪒', NULL),
  (98, 'Ziala sachets (masque visage liquide)', 'femmes', 0, 0, 5, '🧖‍♀️', NULL),
  (99, 'Gants simple', 'femmes', 0, 0, 5, '🧤', NULL),
  (100, 'Brosse a dents', 'femmes', 0, 0, 5, '🪮', NULL),
  (101, 'Brosse cheveux', 'femmes', 0, 0, 5, '🪮', NULL),
  (102, 'Byphasse (huile de ricin fortifiant)', 'femmes', 0, 0, 5, '🫙', NULL),
  (103, 'Papaya hair drink (huile)', 'femmes', 0, 0, 5, '🫙', NULL),
  (104, 'Évoluderm keratine liquide', 'femmes', 0, 0, 5, '💄', NULL),
  (105, 'Amalfi aloe vera (crème idratante)', 'femmes', 0, 0, 5, '🧴', NULL),
  (106, 'Brosse cheveux fine', 'femmes', 0, 0, 5, '🪮', NULL),
  (107, 'Labello Boom a levre', 'femmes', 0, 0, 5, '💄', NULL),
  (108, 'Melano spotfree (crème visage)', 'femmes', 0, 0, 5, '🧴', NULL),
  (109, 'Body lotion (crème corps)', 'femmes', 0, 0, 5, '🧴', NULL),
  (110, 'Dax pomade pot', 'femmes', 0, 0, 5, '💄', NULL),
  (111, 'Collagen pro 7.3 (hair color)', 'femmes', 0, 0, 5, '🎨', NULL),
  (112, 'Bighai (lait parfum + masque)', 'femmes', 0, 0, 5, '🌸', NULL),
  (113, 'Sk-hans (4 crème main)', 'femmes', 0, 0, 5, '🧴', NULL),
  (114, 'Chouchou', 'femmes', 0, 0, 5, '🎀', NULL),
  (115, 'Calliderme (crème main et ongles)', 'femmes', 0, 0, 5, '🧴', NULL),
  (116, 'Beauty city BB crème', 'femmes', 0, 0, 5, '🧴', NULL),
  (117, 'Argan (crème corps)', 'femmes', 0, 0, 5, '🧴', NULL),
  (118, 'Bamboo charcoal (pour net)', 'femmes', 0, 0, 5, '💄', NULL),
  (119, 'Crème déodorant', 'femmes', 0, 0, 5, '🧴', NULL),
  (120, 'Magic clean (crème)', 'femmes', 0, 0, 5, '🧴', NULL),
  (121, 'Net (crème pour le corps)', 'femmes', 0, 0, 5, '🧴', NULL),
  (122, 'Captain (parfum)', 'femmes', 0, 0, 5, '🌸', NULL),
  (123, 'Boîte crème pour enfant', 'femmes', 0, 0, 5, '🧴', NULL),
  (124, 'Cosmolive micellar water (pour peau)', 'femmes', 0, 0, 5, '💧', NULL),
  (125, 'Nature (savon triangle)', 'femmes', 0, 0, 5, '🧼', NULL),
  (126, 'Mini ventilateur', 'femmes', 0, 0, 5, '🌀', NULL),
  (127, 'Face fresh gold', 'femmes', 0, 0, 5, '💄', NULL),
  (128, 'Épingle pour voile', 'femmes', 0, 0, 5, '📌', NULL),
  (129, 'Pastil (sérum cheveux)', 'femmes', 0, 0, 5, '💧', NULL),
  (130, 'Le chat (savons)', 'femmes', 0, 0, 5, '💄', NULL),
  (131, 'Mustela (crème de corps)', 'femmes', 0, 0, 5, '🧴', NULL),
  (132, 'Vitfé (crème pour os)', 'femmes', 0, 0, 5, '🧴', NULL),
  (133, 'Sulfure8 kids (crème cheveux)', 'femmes', 0, 0, 5, '🧴', NULL),
  (134, 'Calliderme gel intime', 'femmes', 0, 0, 5, '💧', NULL),
  (135, 'Évoluderm après shampoo', 'femmes', 0, 0, 5, '🧴', NULL),
  (136, 'Miss wendy (gel aloe vera)', 'femmes', 0, 0, 5, '💧', NULL),
  (137, 'Hashmi (colle cil)', 'femmes', 0, 0, 5, '👁️', NULL),
  (138, 'Dialabé', 'hommes', 0, 22, 4, '🧵', NULL),
  (139, 'Sous-vêtements', 'hommes', 0, 17, 3, '🩲', NULL),
  (140, 'T-shirt', 'hommes', 0, 1, 1, '👕', NULL),
  (141, 'Pantalon fine', 'hommes', 0, 12, 2, '👖', NULL),
  (142, 'Champoo', 'hommes', 0, 15, 3, '🧴', NULL),
  (143, 'Gamme', 'hommes', 0, 2, 1, '🎁', NULL),
  (144, 'L''Oréal men crème de peau', 'hommes', 0, 4, 1, '🧴', NULL),
  (145, 'Poudre', 'hommes', 0, 4, 1, '🧴', NULL),
  (146, 'Parfum 2K', 'hommes', 0, 14, 3, '🌸', NULL),
  (147, 'Parfum Aroma', 'hommes', 0, 23, 5, '🌸', NULL),
  (148, 'Gel nettoyant', 'hommes', 0, 3, 1, '💧', NULL),
  (149, 'Herbal inhaler (menthe)', 'hommes', 0, 6, 1, '💨', NULL),
  (150, 'Chaussettes (paire)', 'hommes', 0, 5, 1, '🧦', NULL),
  (151, 'Parfum Jacklin', 'hommes', 0, 34, 7, '🌸', NULL),
  (152, 'Vaseline (paquet)', 'hommes', 0, 1, 1, '🧴', NULL),
  (153, 'Gamme Poseidon', 'hommes', 0, 1, 1, '🎁', NULL),
  (154, 'Gamme Night Lure', 'hommes', 0, 1, 1, '🎁', NULL),
  (155, 'Vaseline Sada', 'hommes', 0, 1, 1, '🧴', NULL),
  (156, 'Mousse à raser', 'hommes', 0, 22, 4, '🪒', NULL),
  (157, 'Baume après-rasage', 'hommes', 0, 22, 4, '🪒', NULL),
  (158, 'Parfum Onlyou', 'hommes', 0, 6, 1, '🌸', NULL),
  (159, 'Stick 5ml', 'hommes', 0, 13, 3, '🧴', NULL),
  (160, 'Stick 3ml', 'hommes', 0, 2, 1, '🧴', NULL),
  (161, 'Stick 2ml', 'hommes', 0, 5, 1, '🧴', NULL),
  (162, 'Parfum AXE', 'hommes', 0, 7, 1, '🌸', NULL),
  (163, 'Gamme visage', 'hommes', 0, 3, 1, '🎁', NULL),
  (164, 'Champoo barbe', 'hommes', 0, 3, 1, '🧔', NULL),
  (165, 'Savon à raser', 'hommes', 0, 2, 1, '🧼', NULL),
  (166, 'Eau de Cologne barbe', 'hommes', 0, 1, 1, '🌸', NULL),
  (167, 'Teinture cheveux (paquet)', 'hommes', 0, 1, 1, '🎨', NULL),
  (168, 'Baume après-rasage 5ml', 'hommes', 0, 1, 1, '🪒', NULL),
  (169, 'Pommade coco (pot)', 'hommes', 0, 1, 1, '🧴', NULL),
  (170, 'Savon olive (pot)', 'hommes', 0, 1, 1, '🧼', NULL),
  (171, 'Sachet karité 2cent', 'hommes', 0, 11, 2, '🧴', NULL),
  (172, 'Chapelet', 'hommes', 0, 3, 1, '📿', NULL),
  (173, 'Dove Men (bouteille)', 'hommes', 0, 2, 1, '🧴', NULL),
  (174, 'Boubou Chigueu 10 mètres', 'hommes', 0, 4, 1, '🥻', NULL),
  (175, 'Boubou Chigueu 8 mètres', 'hommes', 0, 4, 1, '🥻', NULL),
  (176, 'Boubou Chigueu Saoudite', 'hommes', 0, 8, 2, '🥻', NULL),
  (177, 'Boubou Joumani', 'hommes', 0, 12, 2, '🥻', NULL),
  (178, 'Boubou Dollar', 'hommes', 0, 3, 1, '🥻', NULL),
  (179, 'Baume après-rasage Brute', 'hommes', 0, 3, 1, '🪒', NULL),
  (180, 'Longue chaîne', 'hommes', 0, 2, 1, '⛓️', NULL),
  (181, 'Casquette', 'hommes', 0, 5, 1, '🧢', NULL),
  (182, 'Trikko', 'hommes', 0, 3, 1, '🧥', NULL),
  (183, 'Culotte enfant', 'hommes', 0, 11, 2, '🩲', NULL),
  (184, 'Signal (dentifrice)', 'hommes', 0, 8, 2, '🪥', NULL),
  (185, 'Briquets', 'hommes', 0, 1, 1, '🔥', NULL),
  (186, 'Calpet', 'hommes', 0, 3, 1, '🧣', NULL),
  (187, 'Bague', 'hommes', 0, 8, 2, '💍', NULL)
ON CONFLICT (id) DO NOTHING;
