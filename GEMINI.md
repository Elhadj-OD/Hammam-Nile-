# Boutique Hammam Nile — Documentation & Spécifications Techniques

Ce fichier sert de documentation centrale et de guide de référence pour tout développeur ou modèle d'intelligence artificielle reprenant ou faisant évoluer cette application.

---

## 1. Vue d'Ensemble & Objectif du Projet

**Boutique Hammam Nile** est une application web professionnelle de point de vente (POS) et de gestion commerciale spécialement conçue pour les instituts de beauté, hammams et boutiques de cosmétiques/soins orientaux (savons noirs, huiles rares, foutas, linge de bain, accessoires traditionnels).

L'application répond à deux besoins majeurs :
1. **Un encaissement comptoir ultra-rapide** pour les caissières (utilisation de douchette code-barres ou saisie manuelle, gestion des modes de règlement en espèces et portefeuilles mobiles mauritaniens : Bankily, Masrivi, Sedad, Click).
2. **Une administration centralisée et sécurisée** pour la direction/gérante (gestion du catalogue de produits et des photos, suivi des pièces en stock, traçabilité des prélèvements internes pour les soins du hammam, facturation, devis et analyses financières).

---

## 2. Fonctionnalités Implémentées

### A. Point de Vente & Caisse (`CaisseView.tsx`)
- **Bandeau Scanner de Code-Barres dédié** :
  - Auto-focus au chargement de la caisse.
  - Compatible avec douchettes USB/Bluetooth physiques (envoi du code EAN-13 + validation automatique par touche Entrée).
  - Possibilité de saisie manuelle au clavier pour les articles dont le code-barres est endommagé ou absent.
  - Témoin visuel interactif et alertes instantanées (*« ✓ Produit ajouté au ticket »* ou *« Article introuvable »*).
- **Catalogue tactile interactif** :
  - Filtrage instantané par catégories (*Savons & Soins*, *Huiles*, *Linge*, *Accessoires*, *Coffrets*).
  - Barre de recherche textuelle temps réel.
  - Ajout direct au panier et incrémentation rapide (`+` / `–`).
- **Gestion de la Commande & Panier** :
  - Détail des lignes d'achat avec prix unitaire et sous-total.
  - Calcul dynamique en devise locale (MRU - Ouguiya) sans taxe superflue.
  - Mise en attente de commande.
- **Rattachement Client** :
  - Passage comptoir anonyme par défaut.
  - Recherche et sélection rapide dans le fichier client avec historique d'achats.
- **Règlement multi-modes** :
  - Espèces avec rendu de monnaie.
  - Paiements mobiles mauritaniens : **Bankily**, **Masrivi**, **Sedad**, **Click**.
- **Ticket de Caisse & Reçu** (`ReceiptModal.tsx`) :
  - Génération immédiate du ticket thermique avec référence unique.
  - Impression directe et option de réimpression de la dernière vente.

### B. Gestion des Produits & Catalogue (`ProduitsView.tsx` - Réservé Admin)
- **Accès strict Administrateur** (invisible pour le rôle caissière).
- **Formulaire de création et modification d'articles** :
  - Code-barres EAN-13 (scannable à la douchette lors de la création de la fiche).
  - Téléversement d'une photo réelle de l'article (support base64 / URL) ou choix d'une icône de secours.
  - Désignation et description détaillée.
  - Catégorie commerciale.
  - Prix de vente unitaire.
  - Nombre exact de **pièces disponibles en stock**.
  - Seuil d'alerte pour stock bas.
- **Table administrative de suivi** :
  - Ajustement rapide du stock en 1 clic (`+` / `–` pièces).
  - Indicateurs d'état : *Disponible*, *Alerte Stock Bas*, *Épuisé (0 pièce)*.
  - Suppression et modification complètes.

### C. Prélèvements Internes Hammam (`PrelevementsHammamView.tsx`)
- Enregistrement des produits de la boutique prélevés pour une utilisation directe dans les cabines ou les soins du Hammam (savons noirs, huiles, gants kessa, etc.).
- Sortie immédiate du stock commercial avec traçabilité de l'opératrice, de la quantité et du motif.

### D. Gestion des Ventes, Devis & Facturation
- **Historique des ventes** (`MesVentesView.tsx`) : consultation de toutes les transactions avec filtrage par date, caissière et mode de paiement.
- **Édition de Devis** (`DevisView.tsx`) et **Factures Proforma/Normalisées** (`FacturesView.tsx`) pour les entreprises ou coffrets cadeaux événementiels.

### E. Fichier Clients & CRM (`ClientsView.tsx`)
- Répertoire complet des clientes (nom, téléphone, adresse, date d'anniversaire, notes).
- Suivi du volume d'achats, panier moyen et cumul des visites.

### F. Inventaire & Mouvements de Stock (`InventaireView.tsx`, `MouvementsView.tsx`)
- Vue globale de la valorisation du stock marchand.
- Journal d'audit complet de toutes les entrées, ventes et sorties d'articles.

### G. Gestion de l'Équipe & Rôles (`CaissieresView.tsx`, `AuthSwitchModal.tsx`)
- Séparation stricte des rôles :
  - **Administratrice** (`gerant` / Sophia) : accès total à toutes les rubriques, paramètres, statistiques et gestion catalogue.
  - **Caissière** (`caissier` / Elhadj) : accès limité à la Caisse, à l'Inventaire en lecture et aux Sorties Hammam.
- Basculement d'utilisateur sécurisé avec code PIN / mot de passe.

### H. Rapports & Statistiques Financières (`RapportsView.tsx`)
- Chiffre d'affaires journalier, hebdomadaire et mensuel.
- Répartition des ventes par mode de paiement (Espèces vs Mobile).
- Top des articles les plus vendus.

---

## 3. Structure des Fichiers

```
gestion-boutique-hammam---pro/
├── public/
│   └── logo.svg                 # Logo SVG vectoriel Hammam Nile
├── src/
│   ├── components/              # Vues et composants modulaires
│   │   ├── AuthSwitchModal.tsx   # Modal de déverrouillage / changement d'utilisateur
│   │   ├── CaisseView.tsx        # Écran principal POS (scanner, catalogue, panier, encaissement)
│   │   ├── CaissieresView.tsx    # Gestion du personnel et des codes d'accès
│   │   ├── ClientsView.tsx       # Répertoire CRM clients
│   │   ├── DashboardView.tsx     # Tableau de bord synthétique (KPIs, alertes)
│   │   ├── DevisView.tsx         # Gestion et édition des devis
│   │   ├── DocumentModal.tsx     # Prévisualisation et impression de documents
│   │   ├── FacturesView.tsx      # Gestion et édition des factures
│   │   ├── HammamNileLogo.tsx    # Composant blason et typographie officielle
│   │   ├── Header.tsx            # En-tête supérieur (opérateur actif, date/heure, menu mobile)
│   │   ├── InventaireView.tsx    # Visualisation du stock et alertes de réassort
│   │   ├── LoginView.tsx         # Écran de connexion initial
│   │   ├── MesVentesView.tsx     # Historique des transactions de caisse
│   │   ├── MouvementsView.tsx    # Journal des flux d'entrées / sorties
│   │   ├── ParametresView.tsx    # Configuration générale (devise, boutique, imprimante)
│   │   ├── PrelevementsHammamView.tsx # Sorties de stock pour usage interne cabines
│   │   ├── ProduitsView.tsx      # Gestion du catalogue articles (Admin)
│   │   ├── RapportsView.tsx      # Statistiques financières et graphiques
│   │   ├── ReceiptModal.tsx      # Modal de prévisualisation et impression ticket thermique
│   │   └── Sidebar.tsx           # Barre de navigation latérale avec filtrage par rôle
│   ├── context/
│   │   └── AppContext.tsx        # State manager global (produits, panier, ventes, clients, auth)
│   ├── data/
│   │   └── initialData.ts        # Données de démonstration et catalogue initial
│   ├── lib/
│   │   └── firebase.ts           # Configuration optionnelle de synchronisation Cloud Firestore
│   ├── types.ts                  # Définitions TypeScript strictes (Product, Sale, User, etc.)
│   ├── App.tsx                   # Point d'entrée React et aiguilleur de navigation
│   ├── index.css                 # Styles Tailwind et variables CSS
│   └── main.tsx                  # Montage ReactDOM
├── index.html                    # HTML racine avec polices et métadonnées
├── package.json                  # Dépendances et scripts de build Vite
├── tsconfig.json                 # Configuration TypeScript
├── vite.config.ts                # Configuration du bundler Vite
└── GEMINI.md                     # Documentation pour le projet et modèles IA
```

---

## 4. Technologies Utilisées

- **Frontend Core** : React 19, TypeScript (~5.8).
- **Bundler & Serveur de Dev** : Vite 6 (démarrage instantané, HMR réactif).
- **Styling & Design System** : Tailwind CSS v4 + Vanilla CSS personnalisé.
- **Iconographie** : Lucide React.
- **Gestion d'État** : React Context API (`AppContext`) couplé à `localStorage` pour la persistance locale instantanée sans latence réseau.
- **Backend optionnel** : Intégration Firebase / Cloud Firestore prête à l'emploi (`src/lib/firebase.ts`).
- **Gestion de Version** : Git / GitHub (`https://github.com/Elhadj-OD/Hammam-Nile-`).

---

## 5. Décisions de Design & Ergonomie

1. **Identité Visuelle Hammam / Spa Oriental Haut de Gamme** :
   - Palette de couleurs artisanale et apaisante :
     - Émeraude foncé / Vert Hammam : `#0F4C4A` / `#0A3735`
     - Vert sauge doux pour les fonds actifs : `#E4E9E1`
     - Cuivre / Or antique pour l'accentuation : `#B8874B`
     - Fond parchemin chaleureux : `#F7F3EC` / `#E9E3D6`
     - Bleu nuit Nil : `#004CB7`
   - Typographies : police élégante à empattement pour les titres (*Iowan Old Style / Georgia / Playfair*), cursive gracieuse pour la marque (*Alex Brush / Great Vibes*), et police sans-serif claire et lisible pour l'encaissement.

2. **Expérience Caisse Épurée et Haute Vitesse** :
   - Les caissières doivent pouvoir encaisser en moins de 10 secondes :
     - La douchette scanne et valide immédiatement.
     - Boutons de règlement gros format (Espèces ou Mobile d'un simple clic).
     - Pas de formulaires superflus bloquant la vente.

3. **Spécificités Locales (Mauritanie)** :
   - Monnaie par défaut : **MRU (Ouguiya)**.
   - Intégration directe des applications de paiement mobile majeures en Mauritanie (*Bankily, Masrivi, Sedad, Click*).
   - Pas de taxe TVA superflue ajoutée au total comptoir (calcul direct `Sous-total - Remise = Total net`).

4. **Cloisonnement des Rôles** :
   - L'administration des prix, du catalogue et des suppressions est verrouillée derrière le rôle `gerant`.
   - La caissière se concentre sur l'accueil, le scan, les sorties hammam et l'encaissement.

---

## 6. Instructions pour un Futur Modèle d'IA

Lors de toute intervention future sur ce projet, le modèle IA doit respecter impérativement les règles suivantes :

1. **Préserver l'architecture du State Global (`AppContext.tsx`)** :
   - Toutes les entités (`products`, `cart`, `sales`, `clients`, `hammamUsages`, `currentUser`) transitent par `AppContext`.
   - Toute modification de structure de données dans `types.ts` doit être répercutée dans `initialData.ts` et dans les méthodes correspondantes de `AppContext.tsx`.

2. **Ne pas casser le workflow Douchette / Scanner de Code-barres** :
   - Dans `CaisseView.tsx`, l'élément `scanInputRef` et l'écouteur `handleBarcodeKey` sur la touche `Enter` doivent rester prioritaires pour garantir la compatibilité avec toutes les douchettes USB physiques.
   - Les codes-barres doivent être stockés sous la propriété optionnelle `barcode?: string` dans l'objet `Product`.

3. **Respecter la séparation des rôles Admin / Caissier** :
   - Ne jamais donner la possibilité à un profil `caissier` de modifier les prix de vente ou de supprimer des produits.
   - Les actions sensibles (suppression d'historique, export complet, modification des paramètres système) doivent systématiquement vérifier `currentUser?.role === 'gerant'`.

4. **Garantir la compatibilité TypeScript et le build Vite** :
   - Toujours vérifier que `npm run build` s'exécute avec un code de sortie `0` sans erreur de typage.
   - Ne jamais introduire de variables non déclarées ou de types `any` implicites.

5. **Cohérence du Design System** :
   - Conserver les bordures arrondies (`rounded-2xl`, `rounded-xl`), les ombres douces et les teintes de la charte graphique (`#0F4C4A`, `#B8874B`, `#F7F3EC`, `#E4E9E1`).
   - Ne pas réintroduire de framework UI lourd ou de styles disparates qui dénatureraient l'ambiance artisanale et élégante de Hammam Nile.
