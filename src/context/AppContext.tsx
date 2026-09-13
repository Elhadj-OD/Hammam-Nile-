import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Product,
  CartItem,
  Sale,
  Client,
  Quote,
  Invoice,
  StockMovement,
  ShopSettings,
  ActiveSection,
  PaymentMethod,
  LineItem,
  PaymentTerms,
  HammamUsage,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_USERS_LIST,
  INITIAL_PRODUCTS,
  INITIAL_CLIENTS,
  INITIAL_SETTINGS,
  INITIAL_SALES,
  INITIAL_QUOTES,
  INITIAL_INVOICES,
  INITIAL_MOVEMENTS,
  INITIAL_HAMMAM_USAGES,
} from '../data/initialData';
import {
  testConnection,
  syncClientToFirestore,
  loadClientsFromFirestore,
  syncSaleToFirestore,
  loadSalesFromFirestore,
  sendAdminVerificationCode,
  verifyAdminSecurityCode,
  auth,
  googleProvider,
} from '../lib/firebase';
import {
  isSupabaseConfigured,
  getProductsFromSupabase,
  saveProductToSupabase,
  deleteProductFromSupabase,
  getSalesFromSupabase,
  saveSaleToSupabase,
  getClientsFromSupabase,
  saveClientToSupabase,
  deleteClientFromSupabase,
  getMovementsFromSupabase,
  saveMovementToSupabase,
  getHammamUsagesFromSupabase,
  saveHammamUsageToSupabase,
  getShopSettingsFromSupabase,
  saveShopSettingsToSupabase,
} from '../lib/supabase';
import { signInWithPopup } from 'firebase/auth';

interface AppContextType {
  currentUser: User | null;
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  switchRole: (role: UserRole) => void;
  switchUser: (username: string) => void;
  login: (username: string, password?: string) => boolean;
  logout: () => void;

  // Firebase 2FA & Cloud Sync
  firebaseConnected: boolean;
  supabaseConnected: boolean;
  isAdminVerified: boolean;
  pendingVerificationId: string | null;
  lastSentCode: string | null;
  requestAdminEmailCode: (targetEmail?: string) => Promise<{ success: boolean; code: string; message: string }>;
  verifyAdminEmailCode: (enteredCode: string) => Promise<{ success: boolean; error?: string }>;
  unlockAdminWithGoogle: () => Promise<{ success: boolean; error?: string }>;

  // Password-protected switching modal
  authModal: {
    isOpen: boolean;
    targetRole?: UserRole;
    targetUsername?: string;
    targetName?: string;
    onSuccessSection?: ActiveSection;
  };
  openAuthModal: (options: {
    targetRole?: UserRole;
    targetUsername?: string;
    targetName?: string;
    onSuccessSection?: ActiveSection;
  }) => void;
  closeAuthModal: () => void;
  verifyAndSwitch: (password: string) => { success: boolean; error?: string };

  // Users & Cashiers Management
  users: User[];
  addUser: (user: User) => void;
  updateUser: (username: string, updates: Partial<User>) => void;
  deleteUser: (username: string) => void;
  
  // Products & Inventory
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: number, updates: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
  lowStockProducts: Product[];

  // Cart & POS
  cart: CartItem[];
  addToCart: (product: Product) => void;
  updateCartQty: (productId: number, delta: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  cartTotal: number;
  completeSale: (
    paymentMethod: PaymentMethod,
    customerName?: string,
    details?: {
      amountReceived?: number;
      changeGiven?: number;
      discount?: number;
      paymentDetail?: string;
      customerPhone?: string;
    }
  ) => Sale | null;

  // Sales
  sales: Sale[];

  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => Client;
  updateClient: (id: number, updates: Partial<Client>) => void;
  deleteClient: (id: number) => void;

  // Quotes (Devis)
  quotes: Quote[];
  createQuote: (quoteData: {
    clientId?: number;
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    clientAddress?: string;
    items: LineItem[];
    validity: number;
    notes?: string;
  }) => Quote;
  convertQuoteToInvoice: (quoteId: number) => Invoice | null;
  deleteQuote: (id: number) => void;

  // Invoices (Factures)
  invoices: Invoice[];
  createInvoice: (invoiceData: {
    clientId?: number;
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    clientAddress?: string;
    items: LineItem[];
    paymentTerms: PaymentTerms;
    notes?: string;
  }) => Invoice;
  markInvoicePaid: (id: number, paymentMethod?: PaymentMethod) => void;
  deleteInvoice: (id: number) => void;

  // Stock movements
  movements: StockMovement[];
  addMovement: (movementData: {
    productId: number;
    type: 'in' | 'out';
    qty: number;
    reason: string;
  }) => boolean;

  // Prélèvements Hammam (Produits boutique utilisés par le hammam)
  hammamUsages: HammamUsage[];
  addHammamUsage: (data: {
    productId: number;
    qty: number;
    serviceOrCabin: string;
    requestedBy: string;
    notes?: string;
  }) => boolean;
  deleteHammamUsage: (id: number) => void;

  // Settings
  settings: ShopSettings;
  updateSettings: (newSettings: Partial<ShopSettings>) => void;
  resetDemoData: () => void;

  // Last Completed Sale (for receipt modal)
  lastSale: Sale | null;
  setLastSale: (sale: Sale | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'hammam-nile-v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-users`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as User[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const ensured = [...parsed];
          const sophiaIndex = ensured.findIndex(u => u.username.toLowerCase() === 'sophia');
          if (sophiaIndex >= 0) {
            ensured[sophiaIndex] = { ...ensured[sophiaIndex], password: '2630', role: 'gerant', name: 'Sophia' };
          } else {
            ensured.push(INITIAL_USERS_LIST[1]);
          }
          const elhadjIndex = ensured.findIndex(u => u.username.toLowerCase() === 'elhadj');
          if (elhadjIndex >= 0) {
            ensured[elhadjIndex] = { ...ensured[elhadjIndex], password: '3454', role: 'caissier', name: 'Elhadj' };
          } else {
            ensured.unshift(INITIAL_USERS_LIST[0]);
          }
          return ensured;
        }
      } catch {
        return INITIAL_USERS_LIST;
      }
    }
    return INITIAL_USERS_LIST;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(`${STORAGE_KEY}-current-user`);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        if (parsed && (parsed.username.toLowerCase() === 'sophia' || parsed.username.toLowerCase() === 'elhadj')) {
          return parsed;
        }
      } catch {
        return null;
      }
    }
    // Demande systématiquement un mot de passe à la première visite pour protéger les deux parties
    return null;
  });

  const [activeSection, setActiveSection] = useState<ActiveSection>('caisse');
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // Firebase Cloud & 2FA State
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(isSupabaseConfigured());
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY}-admin-verified`) === 'true';
  });
  const [pendingVerificationId, setPendingVerificationId] = useState<string | null>(null);
  const [lastSentCode, setLastSentCode] = useState<string | null>(null);

  // App Data
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-products`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Product[];
        // Check if products have emojis and match current catalog
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].emoji) {
          return parsed;
        }
      } catch {
        return INITIAL_PRODUCTS;
      }
    }
    return INITIAL_PRODUCTS;
  });

  const [cart, setCart] = useState<CartItem[]>([]);

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-sales`);
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-clients`);
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  const [quotes, setQuotes] = useState<Quote[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-quotes`);
    return saved ? JSON.parse(saved) : INITIAL_QUOTES;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-invoices`);
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-movements`);
    return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
  });

  const [hammamUsages, setHammamUsages] = useState<HammamUsage[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-hammam-usages`);
    return saved ? JSON.parse(saved) : INITIAL_HAMMAM_USAGES;
  });

  const [settings, setSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-settings`);
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-sales`, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-clients`, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-quotes`, JSON.stringify(quotes));
  }, [quotes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-invoices`, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-movements`, JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-hammam-usages`, JSON.stringify(hammamUsages));
  }, [hammamUsages]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-settings`, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-users`, JSON.stringify(users));
  }, [users]);

  // Firebase initialization and initial sync
  useEffect(() => {
    testConnection().then(connected => {
      setFirebaseConnected(connected);
      if (connected) {
        // Load any newly recorded clients from Firestore
        loadClientsFromFirestore()
          .then(cloudClients => {
            if (cloudClients && cloudClients.length > 0) {
              setClients(prev => {
                const merged = [...prev];
                for (const cc of cloudClients) {
                  const idx = merged.findIndex(c => c.id === cc.id);
                  if (idx >= 0) {
                    merged[idx] = { ...merged[idx], ...cc };
                  } else {
                    merged.push(cc);
                  }
                }
                return merged;
              });
            }
          })
          .catch(console.error);

        // Load any newly recorded sales from Firestore
        loadSalesFromFirestore()
          .then(cloudSales => {
            if (cloudSales && cloudSales.length > 0) {
              setSales(prev => {
                const merged = [...prev];
                for (const cs of cloudSales) {
                  if (!merged.some(s => s.id === cs.id)) {
                    merged.push(cs);
                  }
                }
                return merged.sort((a, b) => b.timestamp - a.timestamp);
              });
            }
          })
          .catch(console.error);
      }
    });
  }, []);

  // Supabase initial load and cloud synchronization
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    async function loadSupabase() {
      try {
        const [sbProducts, sbSales, sbClients, sbMovements, sbUsages, sbSettings] = await Promise.all([
          getProductsFromSupabase(),
          getSalesFromSupabase(),
          getClientsFromSupabase(),
          getMovementsFromSupabase(),
          getHammamUsagesFromSupabase(),
          getShopSettingsFromSupabase(),
        ]);

        if (sbProducts && sbProducts.length > 0) {
          setProducts(sbProducts);
        } else if (products.length > 0) {
          // Push local catalog to Supabase if empty on cloud
          sbProducts?.length === 0 && products.forEach(p => saveProductToSupabase(p));
        }

        if (sbSales && sbSales.length > 0) setSales(sbSales);
        if (sbClients && sbClients.length > 0) setClients(sbClients);
        if (sbMovements && sbMovements.length > 0) setMovements(sbMovements);
        if (sbUsages && sbUsages.length > 0) setHammamUsages(sbUsages);
        if (sbSettings) setSettings(sbSettings);

        setSupabaseConnected(true);
      } catch (err) {
        console.warn('Supabase sync warning:', err);
      }
    }
    loadSupabase();
  }, []);

  const requestAdminEmailCode = async (
    targetEmail?: string
  ): Promise<{ success: boolean; code: string; message: string }> => {
    const emailToUse = (targetEmail || settings.adminEmail || 'elhadji3454@gmail.com')
      .trim()
      .toLowerCase();
    const res = await sendAdminVerificationCode(emailToUse);
    if (res.success) {
      setPendingVerificationId(res.verificationId);
      setLastSentCode(res.code);
      return {
        success: true,
        code: res.code,
        message: `Code de sécurité envoyé avec succès à ${emailToUse}. Veuillez consulter vos emails sur votre téléphone pour relever le code à 6 chiffres.`,
      };
    }
    return {
      success: false,
      code: '',
      message: "Échec de la génération du code de vérification Firebase.",
    };
  };

  const verifyAdminEmailCode = async (
    enteredCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    const clean = (enteredCode || '').trim();
    if (!clean) {
      return { success: false, error: 'Veuillez saisir le code à 6 chiffres.' };
    }

    // Direct match with latest dispatched code in state
    if (lastSentCode && clean === lastSentCode.trim()) {
      setIsAdminVerified(true);
      localStorage.setItem(`${STORAGE_KEY}-admin-verified`, 'true');
      const sophia =
        users.find(u => u.username.toLowerCase() === 'sophia') || INITIAL_USERS_LIST[1];
      setCurrentUser(sophia);
      return { success: true };
    }

    // Check with Firestore database verification document
    if (pendingVerificationId) {
      const res = await verifyAdminSecurityCode(pendingVerificationId, clean);
      if (res.valid) {
        setIsAdminVerified(true);
        localStorage.setItem(`${STORAGE_KEY}-admin-verified`, 'true');
        const sophia =
          users.find(u => u.username.toLowerCase() === 'sophia') || INITIAL_USERS_LIST[1];
        setCurrentUser(sophia);
        return { success: true };
      }
      return { success: false, error: res.message };
    }

    return {
      success: false,
      error: 'Code de sécurité invalide ou expiré. Veuillez redemander un nouveau code.',
    };
  };

  const unlockAdminWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setIsAdminVerified(true);
        localStorage.setItem(`${STORAGE_KEY}-admin-verified`, 'true');
        const sophia =
          users.find(u => u.username.toLowerCase() === 'sophia') || INITIAL_USERS_LIST[1];
        setCurrentUser(sophia);
        return { success: true };
      }
      return { success: false, error: 'Connexion Google annulée.' };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur lors de la connexion Google Firebase.',
      };
    }
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${STORAGE_KEY}-current-user`, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(`${STORAGE_KEY}-current-user`);
    }
  }, [currentUser]);

  // Auth & Team Management
  const addUser = (newUser: User) => {
    setUsers(prev => {
      const exists = prev.some(u => u.username.toLowerCase() === newUser.username.toLowerCase());
      if (exists) {
        return prev.map(u => u.username.toLowerCase() === newUser.username.toLowerCase() ? { ...u, ...newUser } : u);
      }
      return [...prev, newUser];
    });
  };

  const updateUser = (username: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.username === username ? { ...u, ...updates } : u));
    if (currentUser?.username === username) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUser = (username: string) => {
    if (users.length <= 1) return;
    setUsers(prev => prev.filter(u => u.username !== username));
    if (currentUser?.username === username) {
      const remaining = users.filter(u => u.username !== username);
      if (remaining.length > 0) {
        setCurrentUser(remaining[0]);
      }
    }
  };

  // Password-protected switching modal
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    targetRole?: UserRole;
    targetUsername?: string;
    targetName?: string;
    onSuccessSection?: ActiveSection;
  }>({ isOpen: false });

  const openAuthModal = (options: {
    targetRole?: UserRole;
    targetUsername?: string;
    targetName?: string;
    onSuccessSection?: ActiveSection;
  }) => {
    let resolvedName = options.targetName;
    if (!resolvedName) {
      if (options.targetRole === 'gerant') {
        const u = users.find(x => x.role === 'gerant');
        resolvedName = u ? `${u.name} (Admin)` : 'Sophia (Admin)';
      } else if (options.targetRole === 'caissier') {
        const u = users.find(x => x.role === 'caissier');
        resolvedName = u ? `${u.name} (Caissier)` : 'Elhadj (Caissier)';
      } else if (options.targetUsername) {
        const found = users.find(u => u.username.toLowerCase() === options.targetUsername?.toLowerCase());
        resolvedName = found ? `${found.name} (${found.role === 'gerant' ? 'Admin' : 'Caissier'})` : options.targetUsername;
      }
    }
    setAuthModal({
      isOpen: true,
      targetRole: options.targetRole,
      targetUsername: options.targetUsername,
      targetName: resolvedName,
      onSuccessSection: options.onSuccessSection,
    });
  };

  const closeAuthModal = () => {
    setAuthModal(prev => ({ ...prev, isOpen: false }));
  };

  const verifyAndSwitch = (passwordInput: string): { success: boolean; error?: string } => {
    const cleanPass = (passwordInput || '').trim();
    let targetUser: User | undefined;

    if (authModal.targetUsername) {
      targetUser = users.find(u => u.username.toLowerCase() === authModal.targetUsername?.toLowerCase());
    } else if (authModal.targetRole) {
      targetUser = users.find(u => u.role === authModal.targetRole);
    }

    if (!targetUser) {
      return { success: false, error: 'Utilisateur cible introuvable.' };
    }

    if (!cleanPass || targetUser.password !== cleanPass) {
      return {
        success: false,
        error: `Mot de passe incorrect pour ${targetUser.name}.`,
      };
    }

    setCurrentUser(targetUser);
    if (authModal.onSuccessSection) {
      setActiveSection(authModal.onSuccessSection);
    } else if (targetUser.role === 'gerant') {
      setActiveSection('dashboard');
    } else {
      setActiveSection('caisse');
    }

    closeAuthModal();
    return { success: true };
  };

  const switchUser = (username: string) => {
    if (currentUser?.username.toLowerCase() === username.toLowerCase()) return;
    openAuthModal({ targetUsername: username });
  };

  const switchRole = (role: UserRole) => {
    if (currentUser?.role === role) return;
    openAuthModal({ targetRole: role });
  };

  const login = (username: string, password?: string): boolean => {
    const cleanUsername = username.toLowerCase().trim();
    const cleanPass = (password || '').trim();
    const user = users.find(
      u => u.username.toLowerCase() === cleanUsername || u.name.toLowerCase() === cleanUsername
    );
    if (!user) return false;
    if (!cleanPass || user.password !== cleanPass) return false;
    setCurrentUser(user);
    if (user.role === 'gerant') {
      setActiveSection('dashboard');
    } else {
      setActiveSection('caisse');
    }
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setCart([]);
    setActiveSection('dashboard');
  };

  // Products
  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProduct: Product = { ...productData, id: newId };
    setProducts(prev => [newProduct, ...prev]);
    saveProductToSupabase(newProduct);

    // Track movement if initial stock > 0
    if (newProduct.qty > 0) {
      const newMovement: StockMovement = {
        id: Date.now(),
        productId: newProduct.id,
        productName: newProduct.name,
        type: 'in',
        qty: newProduct.qty,
        reason: 'Création produit & stock initial',
        date: new Date().toLocaleDateString('fr-FR'),
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        user: currentUser?.username || 'admin',
      };
      setMovements(prev => [newMovement, ...prev]);
      saveMovementToSupabase(newMovement);
    }
  };

  const updateProduct = (id: number, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          saveProductToSupabase(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const deleteProduct = (id: number) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    deleteProductFromSupabase(id);
  };

  const lowStockProducts = products.filter(p => p.qty <= p.minQty);

  // Cart & POS
  const addToCart = (product: Product) => {
    if (product.qty <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.cartQty >= product.qty) {
          return prev;
        }
        return prev.map(item =>
          item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item
        );
      }
      return [...prev, { ...product, cartQty: 1 }];
    });
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.id === productId) {
            const product = products.find(p => p.id === productId);
            const max = product ? product.qty : item.qty;
            const newQty = item.cartQty + delta;
            if (newQty > max) return item;
            return { ...item, cartQty: newQty };
          }
          return item;
        })
        .filter(item => item.cartQty > 0);
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.cartQty, 0);

  const completeSale = (
    paymentMethod: PaymentMethod,
    customerName?: string,
    details?: {
      amountReceived?: number;
      changeGiven?: number;
      discount?: number;
      paymentDetail?: string;
      customerPhone?: string;
    }
  ): Sale | null => {
    if (cart.length === 0) return null;

    const timestamp = Date.now();
    const now = new Date();
    const subtotal = cartTotal;
    const discount = details?.discount || 0;
    const total = Math.max(0, subtotal - discount);

    // Deduct stock
    setProducts(prev =>
      prev.map(prod => {
        const cartMatch = cart.find(c => c.id === prod.id);
        if (cartMatch) {
          return { ...prod, qty: Math.max(0, prod.qty - cartMatch.cartQty) };
        }
        return prod;
      })
    );

    // Record stock movements
    const newMovements: StockMovement[] = cart.map(item => ({
      id: Math.random() * 1000000 + Date.now(),
      productId: item.id,
      productName: item.name,
      type: 'out',
      qty: item.cartQty,
      reason: `Vente Caisse #${sales.length + 1} (${customerName || 'Comptoir'})`,
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      timestamp,
      user: currentUser?.username || 'caissier',
    }));
    setMovements(prev => [...newMovements, ...prev]);

    const newSale: Sale = {
      id: sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 1 : 1,
      caissier: currentUser?.username || 'caissier',
      caissierName: currentUser?.name || 'Caissier',
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      subtotal,
      discount,
      total,
      payment: paymentMethod,
      paymentDetail: details?.paymentDetail || (paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'card' ? 'Carte Bancaire' : 'Mobile Money'),
      amountReceived: details?.amountReceived,
      changeGiven: details?.changeGiven,
      items: cart.map(c => ({
        id: c.id,
        name: c.name,
        price: c.price,
        qty: c.cartQty,
        category: c.category,
        emoji: c.emoji,
        image: c.image,
      })),
      timestamp,
      customerName: customerName || 'Client Comptoir',
      customerPhone: details?.customerPhone,
    };

    setSales(prev => [newSale, ...prev]);
    setCart([]);
    setLastSale(newSale);

    // Sync sale to Firebase Firestore & Supabase
    syncSaleToFirestore(newSale).catch(console.error);
    saveSaleToSupabase(newSale);
    newMovements.forEach(m => saveMovementToSupabase(m));

    // Auto-update or create client in directory with purchase details
    const cleanCustomerName = (customerName || '').trim();
    const cleanCustomerPhone = (details?.customerPhone || '').trim();

    if (
      cleanCustomerName &&
      cleanCustomerName.toLowerCase() !== 'client comptoir' &&
      cleanCustomerName.toLowerCase() !== 'comptoir' &&
      cleanCustomerName.toLowerCase() !== 'passage' &&
      cleanCustomerName.toLowerCase() !== 'passage boutique'
    ) {
      setClients(prev => {
        const matchIdx = prev.findIndex(c => {
          if (cleanCustomerPhone && c.phone && c.phone.replace(/\s+/g, '') === cleanCustomerPhone.replace(/\s+/g, '')) {
            return true;
          }
          return c.name.toLowerCase().trim() === cleanCustomerName.toLowerCase();
        });

        if (matchIdx >= 0) {
          const existing = prev[matchIdx];
          const updated: Client = {
            ...existing,
            phone: cleanCustomerPhone || existing.phone,
            purchaseCount: (existing.purchaseCount || 0) + 1,
            totalSpent: (existing.totalSpent || 0) + total,
            lastPurchaseDate: now.toLocaleDateString('fr-FR'),
          };
          const updatedList = [...prev];
          updatedList[matchIdx] = updated;
          syncClientToFirestore(updated).catch(console.error);
          saveClientToSupabase(updated);
          return updatedList;
        } else {
          const newId = prev.length > 0 ? Math.max(...prev.map(c => c.id)) + 1 : 1;
          const newClient: Client = {
            id: newId,
            name: cleanCustomerName,
            phone: cleanCustomerPhone,
            email: '',
            address: '',
            notes: 'Enregistré automatiquement lors du passage en caisse',
            purchaseCount: 1,
            totalSpent: total,
            lastPurchaseDate: now.toLocaleDateString('fr-FR'),
            createdAt: now.toISOString().split('T')[0],
          };
          syncClientToFirestore(newClient).catch(console.error);
          saveClientToSupabase(newClient);
          return [newClient, ...prev];
        }
      });
    }

    return newSale;
  };

  // Clients
  const addClient = (clientData: Omit<Client, 'id'>): Client => {
    const newId = clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1;
    const newClient: Client = {
      ...clientData,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
      purchaseCount: clientData.purchaseCount || 0,
      totalSpent: clientData.totalSpent || 0,
    };
    setClients(prev => [newClient, ...prev]);
    syncClientToFirestore(newClient).catch(console.error);
    saveClientToSupabase(newClient);
    return newClient;
  };

  const updateClient = (id: number, updates: Partial<Client>) => {
    setClients(prev =>
      prev.map(c => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          syncClientToFirestore(updated).catch(console.error);
          saveClientToSupabase(updated);
          return updated;
        }
        return c;
      })
    );
  };

  const deleteClient = (id: number) => {
    setClients(prev => prev.filter(c => c.id !== id));
    deleteClientFromSupabase(id);
  };

  // Quotes (Devis)
  const generateQuoteNumber = (): string => {
    const now = new Date();
    const prefix = `DEV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = quotes.filter(q => q.number.startsWith(prefix)).length + 1;
    return `${prefix}${String(count).padStart(4, '0')}`;
  };

  const createQuote = (quoteData: {
    clientId?: number;
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    clientAddress?: string;
    items: LineItem[];
    validity: number;
    notes?: string;
  }): Quote => {
    const total = quoteData.items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const newQuote: Quote = {
      id: quotes.length > 0 ? Math.max(...quotes.map(q => q.id)) + 1 : 1,
      number: generateQuoteNumber(),
      ...quoteData,
      total,
      date: new Date().toLocaleDateString('fr-FR'),
      status: 'draft',
      timestamp: Date.now(),
    };

    setQuotes(prev => [newQuote, ...prev]);
    return newQuote;
  };

  const convertQuoteToInvoice = (quoteId: number): Invoice | null => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return null;

    const now = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const prefix = `FAC${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = invoices.filter(i => i.number.startsWith(prefix)).length + 1;
    const invNumber = `${prefix}${String(count).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      id: invoices.length > 0 ? Math.max(...invoices.map(i => i.id)) + 1 : 1,
      number: invNumber,
      quoteNumber: quote.number,
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      clientEmail: quote.clientEmail,
      clientAddress: quote.clientAddress,
      items: quote.items,
      total: quote.total,
      date: now.toLocaleDateString('fr-FR'),
      dueDate: dueDate.toLocaleDateString('fr-FR'),
      status: 'issued',
      paymentTerms: 'net30',
      notes: `Facture générée suite à l'acceptation du devis ${quote.number}`,
      timestamp: Date.now(),
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setQuotes(prev => prev.map(q => (q.id === quoteId ? { ...q, status: 'accepted' } : q)));
    return newInvoice;
  };

  const deleteQuote = (id: number) => {
    setQuotes(prev => prev.filter(q => q.id !== id));
  };

  // Invoices (Factures)
  const generateInvoiceNumber = (): string => {
    const now = new Date();
    const prefix = `FAC${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = invoices.filter(i => i.number.startsWith(prefix)).length + 1;
    return `${prefix}${String(count).padStart(4, '0')}`;
  };

  const createInvoice = (invoiceData: {
    clientId?: number;
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    clientAddress?: string;
    items: LineItem[];
    paymentTerms: PaymentTerms;
    notes?: string;
  }): Invoice => {
    const total = invoiceData.items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const now = new Date();
    const dueDate = new Date();
    if (invoiceData.paymentTerms === 'net30') dueDate.setDate(dueDate.getDate() + 30);
    else if (invoiceData.paymentTerms === 'net60') dueDate.setDate(dueDate.getDate() + 60);

    const newInvoice: Invoice = {
      id: invoices.length > 0 ? Math.max(...invoices.map(i => i.id)) + 1 : 1,
      number: generateInvoiceNumber(),
      ...invoiceData,
      total,
      date: now.toLocaleDateString('fr-FR'),
      dueDate: dueDate.toLocaleDateString('fr-FR'),
      status: invoiceData.paymentTerms === 'immediate' ? 'issued' : 'issued',
      timestamp: Date.now(),
    };

    setInvoices(prev => [newInvoice, ...prev]);
    return newInvoice;
  };

  const markInvoicePaid = (id: number, paymentMethod: PaymentMethod = 'mobile') => {
    setInvoices(prev =>
      prev.map(inv => {
        if (inv.id === id) {
          return {
            ...inv,
            status: 'paid',
            paidDate: new Date().toLocaleDateString('fr-FR'),
            paymentMethod,
          };
        }
        return inv;
      })
    );
  };

  const deleteInvoice = (id: number) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
  };

  // Movements
  const addMovement = (movementData: {
    productId: number;
    type: 'in' | 'out';
    qty: number;
    reason: string;
  }): boolean => {
    const product = products.find(p => p.id === movementData.productId);
    if (!product) return false;

    if (movementData.type === 'out' && product.qty < movementData.qty) {
      return false;
    }

    const delta = movementData.type === 'in' ? movementData.qty : -movementData.qty;
    setProducts(prev =>
      prev.map(p => (p.id === movementData.productId ? { ...p, qty: p.qty + delta } : p))
    );

    const now = new Date();
    const newMovement: StockMovement = {
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      type: movementData.type,
      qty: movementData.qty,
      reason: movementData.reason,
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      user: currentUser?.username || 'admin',
    };

    setMovements(prev => [newMovement, ...prev]);
    saveMovementToSupabase(newMovement);
    return true;
  };

  // Prélèvements Hammam (Produits pris par le hammam sur le stock boutique)
  const addHammamUsage = (data: {
    productId: number;
    qty: number;
    serviceOrCabin: string;
    requestedBy: string;
    notes?: string;
  }): boolean => {
    const product = products.find(p => p.id === data.productId);
    if (!product) return false;
    if (product.qty < data.qty) return false;

    // Déduire du stock de la boutique
    setProducts(prev =>
      prev.map(p => (p.id === data.productId ? { ...p, qty: Math.max(0, p.qty - data.qty) } : p))
    );

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const newUsage: HammamUsage = {
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      qty: data.qty,
      unitPrice: product.price,
      totalValue: data.qty * product.price,
      serviceOrCabin: data.serviceOrCabin,
      requestedBy: data.requestedBy,
      takenByStaff: currentUser?.name || (currentUser?.role === 'gerant' ? 'Aïchetou' : 'Fatimetou'),
      date: dateStr,
      time: timeStr,
      timestamp: Date.now(),
      notes: data.notes,
    };

    setHammamUsages(prev => [newUsage, ...prev]);
    saveHammamUsageToSupabase(newUsage);

    // Tracé automatique dans le registre des mouvements de stock
    const newMovement: StockMovement = {
      id: Date.now() + 1,
      productId: product.id,
      productName: product.name,
      type: 'out',
      qty: data.qty,
      reason: `Prélèvement Hammam (${data.serviceOrCabin}) - Demandé par ${data.requestedBy}`,
      date: dateStr,
      time: timeStr,
      timestamp: Date.now(),
      user: currentUser?.username || 'admin',
    };
    setMovements(prev => [newMovement, ...prev]);
    saveMovementToSupabase(newMovement);

    return true;
  };

  const deleteHammamUsage = (id: number) => {
    const item = hammamUsages.find(u => u.id === id);
    if (!item) return;

    // Réintégrer le stock en boutique
    setProducts(prev =>
      prev.map(p => (p.id === item.productId ? { ...p, qty: p.qty + item.qty } : p))
    );

    // Mouvement d'annulation
    const now = new Date();
    const newMovement: StockMovement = {
      id: Date.now(),
      productId: item.productId,
      productName: item.productName,
      type: 'in',
      qty: item.qty,
      reason: `Annulation prélèvement Hammam #${item.id} (Retour en boutique)`,
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      user: currentUser?.username || 'admin',
    };
    setMovements(prev => [newMovement, ...prev]);

    setHammamUsages(prev => prev.filter(u => u.id !== id));
  };

  // Settings
  const updateSettings = (newSettings: Partial<ShopSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setClients(INITIAL_CLIENTS);
    setSales(INITIAL_SALES);
    setQuotes(INITIAL_QUOTES);
    setInvoices(INITIAL_INVOICES);
    setMovements(INITIAL_MOVEMENTS);
    setHammamUsages(INITIAL_HAMMAM_USAGES);
    setSettings(INITIAL_SETTINGS);
    setUsers(INITIAL_USERS_LIST);
    setCurrentUser(null);
    setCart([]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeSection,
        setActiveSection,
        switchRole,
        switchUser,
        login,
        logout,
        authModal,
        openAuthModal,
        closeAuthModal,
        verifyAndSwitch,
        users,
        addUser,
        updateUser,
        deleteUser,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        lowStockProducts,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartTotal,
        completeSale,
        sales,
        clients,
        addClient,
        updateClient,
        deleteClient,
        quotes,
        createQuote,
        convertQuoteToInvoice,
        deleteQuote,
        invoices,
        createInvoice,
        markInvoicePaid,
        deleteInvoice,
        movements,
        addMovement,
        hammamUsages,
        addHammamUsage,
        deleteHammamUsage,
        settings,
        updateSettings,
        resetDemoData,
        lastSale,
        setLastSale,
        firebaseConnected,
        supabaseConnected,
        isAdminVerified,
        pendingVerificationId,
        lastSentCode,
        requestAdminEmailCode,
        verifyAdminEmailCode,
        unlockAdminWithGoogle,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
