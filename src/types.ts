export type UserRole = 'caissier' | 'gerant';
export type UserGender = 'femme' | 'homme';
export type CaisseDepartment =
  | 'boutique_femme'
  | 'boutique_homme'
  | 'hammam_bains'
  | 'spa_massage'
  | 'coiffure_salon'
  | 'epilation_traditionnelle'
  | 'fitness_gym';

export interface User {
  id?: string; // Supabase Auth user id (uuid) — absent tant que le profil n'a pas été migré
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  gender?: UserGender;
  department?: CaisseDepartment;
  locked?: boolean;
  avatar?: string;
  phone?: string;
  createdAt?: string;
  mustChangePassword?: boolean;
}

export interface PresenceRow {
  username: string;
  name: string;
  role: UserRole;
  department?: CaisseDepartment | null;
  lastActive: number;
}

export type ProductCategory = 'savons' | 'huiles' | 'linge' | 'accessoires' | 'coffrets' | 'parfums' | 'boissons' | 'snacks' | 'femmes' | 'hommes' | 'hammam_bains' | 'spa_massage' | 'coiffure_salon' | 'epilation_traditionnelle' | 'fitness_gym' | 'autres';

export interface Product {
  id: number;
  name: string;
  category: ProductCategory;
  price: number;
  qty: number;
  minQty: number;
  emoji?: string;
  image?: string;
  barcode?: string;
  description?: string;
}

export interface CartItem extends Product {
  cartQty: number;
}

export type PaymentMethod = 'cash' | 'mobile' | 'card';

export interface Sale {
  id: number;
  caissier: string;
  caissierName?: string;
  date: string;
  time: string;
  total: number;
  subtotal?: number;
  discount?: number;
  payment: PaymentMethod;
  paymentDetail?: string;
  amountReceived?: number;
  changeGiven?: number;
  items: {
    id: number;
    name: string;
    price: number;
    qty: number;
    category?: ProductCategory;
    emoji?: string;
    image?: string;
  }[];
  timestamp: number;
  customerName?: string;
  customerPhone?: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt?: string;
  purchaseCount?: number;
  totalSpent?: number;
  lastPurchaseDate?: string;
}

export interface LineItem {
  productId?: number;
  description: string;
  qty: number;
  price: number;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused';

export interface Quote {
  id: number;
  number: string;
  clientId?: number;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  items: LineItem[];
  total: number;
  validity: number; // in days
  date: string;
  status: QuoteStatus;
  notes?: string;
  timestamp: number;
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
export type PaymentTerms = 'immediate' | 'net30' | 'net60';

export interface Invoice {
  id: number;
  number: string;
  quoteNumber?: string;
  clientId?: number;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  items: LineItem[];
  total: number;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentTerms: PaymentTerms;
  paymentMethod?: PaymentMethod;
  paidDate?: string;
  notes?: string;
  timestamp: number;
}

export type MovementType = 'in' | 'out';

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  type: MovementType;
  qty: number;
  reason: string;
  date: string;
  time: string;
  timestamp: number;
  user: string;
}

export interface ShopSettings {
  shopName: string;
  slogan?: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  taxNumber?: string;
  rcNumber?: string;
  footerNote?: string;
  adminEmail?: string;
}

export interface HammamUsage {
  id: number;
  productId: number;
  productName: string;
  qty: number;
  unitPrice: number;
  totalValue: number;
  serviceOrCabin: string;
  requestedBy: string;
  takenByStaff: string;
  date: string;
  time: string;
  timestamp: number;
  notes?: string;
  customerPhone?: string;
}

export type ActiveSection =
  | 'dashboard'
  | 'caisse'
  | 'mes-ventes'
  | 'devis'
  | 'factures'
  | 'clients'
  | 'inventaire'
  | 'produits'
  | 'mouvements'
  | 'prelevements-hammam'
  | 'commissions-laveurs'
  | 'rapports'
  | 'utilisateurs'
  | 'parametres'
  | 'assistant';

export type ClientType = 'vip' | 'simple' | 'enfant';

export interface LaveurCommission {
  id: number;
  laveurName: string;
  clientType: ClientType;
  price: number;
  commission: number;
  bonus: number;
  total: number;
  payment: 'cash' | 'mobile';
  paymentDetail?: string;
  customerPhone?: string;
  date: string;
  time: string;
  timestamp: number;
  recordedBy: string;
}
