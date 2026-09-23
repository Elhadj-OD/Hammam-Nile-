import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  UserGender,
  CaisseDepartment,
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
  PresenceRow,
  LaveurCommission,
  ClientType,
} from '../types';
import { CLIENT_TYPE_GRID } from '../lib/laveurCommissions';
import {
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
} from '../lib/firebase';
import {
  isSupabaseConfigured,
  supabase,
  subscribeToTable,
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
  getLaveurCommissionsFromSupabase,
  saveLaveurCommissionToSupabase,
  deleteLaveurCommissionFromSupabase,
  getShopSettingsFromSupabase,
  saveShopSettingsToSupabase,
  getPresenceFromSupabase,
  upsertPresenceToSupabase,
  clearPresenceFromSupabase,
} from '../lib/supabase';
import {
  signInWithUsername,
  signOutUser,
  fetchOwnProfile,
  fetchAllProfiles,
  createStaffUser,
  updateStaffUser,
  deleteStaffUser,
  resetStaffPassword,
  changeOwnPassword,
} from '../lib/supabaseAuth';

interface AppContextType {
  currentUser: User | null;
  authLoading: boolean;
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  switchRole: (role: UserRole) => void;
  switchUser: (username: string) => void;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  completePasswordChange: (newPassword: string) => Promise<{ success: boolean; error?: string }>;

  // Cloud Sync
  firebaseConnected: boolean;
  supabaseConnected: boolean;

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
  verifyAndSwitch: (password: string) => Promise<{ success: boolean; error?: string }>;

  // Users & Cashiers Management
  users: User[];
  addUser: (user: {
    username: string;
    name: string;
    email: string;
    role: UserRole;
    gender?: UserGender;
    department?: CaisseDepartment;
    phone?: string;
    avatar?: string;
  }) => Promise<{ success: boolean; error?: string; tempPassword?: string }>;
  updateUser: (username: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (username: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (username: string) => Promise<{ success: boolean; error?: string; tempPassword?: string }>;

  // Présence (qui est connecté, pour le contrôle des heures par l'admin)
  presence: PresenceRow[];


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

  // Commissions Laveurs
  laveurCommissions: LaveurCommission[];
  addLaveurCommission: (data: {
    laveurName: string;
    clientType: ClientType;
    bonus: number;
  }) => LaveurCommission;
  deleteLaveurCommission: (id: number) => void;

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
  // Équipe (profils) : chargée depuis Supabase (table profiles) une fois
  // authentifié — plus aucun identifiant/mot de passe stocké côté client.
  const [users, setUsers] = useState<User[]>([]);

  // Identité : dérivée de la session Supabase Auth, jamais reconstruite à
  // partir d'un objet brut en localStorage (voir onAuthStateChange plus bas).
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshUsers = async () => {
    const profiles = await fetchAllProfiles();
    if (profiles.length > 0) setUsers(profiles);
  };

  const [activeSection, setActiveSection] = useState<ActiveSection>('caisse');
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // Firebase Cloud Sync State
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(isSupabaseConfigured());

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

  const [laveurCommissions, setLaveurCommissions] = useState<LaveurCommission[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-laveur-commissions`);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-settings`);
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  // Présence : qui est connecté, pour le contrôle des heures par l'admin
  const [presence, setPresence] = useState<PresenceRow[]>([]);

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
    localStorage.setItem(`${STORAGE_KEY}-laveur-commissions`, JSON.stringify(laveurCommissions));
  }, [laveurCommissions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-settings`, JSON.stringify(settings));
  }, [settings]);

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
        const [sbProducts, sbSales, sbClients, sbMovements, sbUsages, sbCommissions, sbSettings] = await Promise.all([
          getProductsFromSupabase(),
          getSalesFromSupabase(),
          getClientsFromSupabase(),
          getMovementsFromSupabase(),
          getHammamUsagesFromSupabase(),
          getLaveurCommissionsFromSupabase(),
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
        if (sbCommissions && sbCommissions.length > 0) setLaveurCommissions(sbCommissions);
        if (sbSettings) setSettings(sbSettings);

        setSupabaseConnected(true);
      } catch (err) {
        console.warn('Supabase sync warning:', err);
      }
    }
    loadSupabase();
  }, []);

  // Synchronisation temps réel : sans ça, un changement fait sur un
  // appareil (ex: la gérante ajoute un produit sur sa tablette) n'apparaît
  // sur les autres (ex: la caisse d'une vendeuse) qu'au prochain
  // rechargement complet de la page — ce que les policies "publiques" ne
  // suffisent pas à garantir, il faut un abonnement actif.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const upsertById = <T extends { id: number }>(list: T[], row: T): T[] => {
      const idx = list.findIndex(x => x.id === row.id);
      if (idx >= 0) {
        const next = [...list];
        next[idx] = row;
        return next;
      }
      return [row, ...list];
    };
    const removeById = <T extends { id: number }>(list: T[], id: number): T[] => list.filter(x => x.id !== id);

    const unsubscribers = [
      subscribeToTable<Product>('products', ({ eventType, new: row, old }) => {
        setProducts(prev => {
          if (eventType === 'DELETE') return removeById(prev, (old as Product).id);
          return upsertById(prev, row as Product);
        });
      }),
      subscribeToTable<Sale>('sales', ({ eventType, new: row }) => {
        if (eventType === 'DELETE') return;
        setSales(prev => upsertById(prev, row as Sale).sort((a, b) => b.timestamp - a.timestamp));
      }),
      subscribeToTable<Client>('clients', ({ eventType, new: row, old }) => {
        setClients(prev => {
          if (eventType === 'DELETE') return removeById(prev, (old as Client).id);
          return upsertById(prev, row as Client);
        });
      }),
      subscribeToTable<StockMovement>('stock_movements', ({ eventType, new: row }) => {
        if (eventType !== 'INSERT') return;
        setMovements(prev => (prev.some(m => m.id === (row as StockMovement).id) ? prev : [row as StockMovement, ...prev]));
      }),
      subscribeToTable<HammamUsage>('hammam_usages', ({ eventType, new: row, old }) => {
        setHammamUsages(prev => {
          if (eventType === 'DELETE') return removeById(prev, (old as HammamUsage).id);
          return prev.some(u => u.id === (row as HammamUsage).id) ? prev : upsertById(prev, row as HammamUsage);
        });
      }),
      subscribeToTable<LaveurCommission>('laveur_commissions', ({ eventType, new: row, old }) => {
        setLaveurCommissions(prev => {
          if (eventType === 'DELETE') return removeById(prev, (old as LaveurCommission).id);
          return prev.some(c => c.id === (row as LaveurCommission).id) ? prev : upsertById(prev, row as LaveurCommission);
        });
      }),
      subscribeToTable<{ id: number; settings: ShopSettings }>('shop_settings', ({ new: row }) => {
        if (row?.settings) setSettings(row.settings);
      }),
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  // Session Supabase Auth : restaure la session existante au chargement,
  // puis reste synchronisé (autre onglet, rafraîchissement de token,
  // déconnexion). C'est la SEULE source de vérité pour "qui est connecté" —
  // plus aucun objet utilisateur brut n'est lu depuis localStorage.
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      if (session) {
        const profile = await fetchOwnProfile();
        if (active && profile) {
          setCurrentUser(profile);
          if (profile.role === 'gerant') setActiveSection('dashboard');
          else setActiveSection('caisse');
          refreshUsers();
        }
      }
      if (active) setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT' || !session) {
        setCurrentUser(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const profile = await fetchOwnProfile();
        if (active && profile) {
          setCurrentUser(profile);
          refreshUsers();
        }
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Équipe : se resynchronise en direct dès qu'un profil change côté
  // serveur (ex: la gérante modifie un rôle ou déverrouille un compte
  // depuis un autre appareil). Nécessite une session active (RLS lecture
  // réservée aux comptes authentifiés) : abonnement recréé à la connexion.
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUser) return;
    const unsubscribe = subscribeToTable('profiles', () => {
      refreshUsers();
    });
    return unsubscribe;
  }, [currentUser?.id]);

  const touchPresence = (user: User) => {
    upsertPresenceToSupabase({
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department || null,
      lastActive: Date.now(),
    });
  };

  // Présence : signal régulier tant qu'une session reste ouverte sur cet appareil
  useEffect(() => {
    if (!currentUser) return;
    touchPresence(currentUser);
    const interval = setInterval(() => touchPresence(currentUser), 45000);
    return () => clearInterval(interval);
  }, [currentUser?.username]);

  // Présence : l'admin récupère régulièrement qui est actuellement connecté
  useEffect(() => {
    if (currentUser?.role !== 'gerant') return;
    const fetchPresence = async () => {
      const rows = await getPresenceFromSupabase();
      if (rows) setPresence(rows);
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 15000);
    return () => clearInterval(interval);
  }, [currentUser?.role]);

  // Auth & Team Management — toute écriture passe par api/admin-users.ts
  // (clé service_role côté serveur), jamais directement sur Supabase
  // depuis le client : la table profiles n'a aucune policy d'écriture.
  const addUser = async (newUser: {
    username: string;
    name: string;
    email: string;
    role: UserRole;
    gender?: UserGender;
    department?: CaisseDepartment;
    phone?: string;
    avatar?: string;
  }) => {
    const res = await createStaffUser(newUser);
    if (res.success) await refreshUsers();
    return res;
  };

  const updateUser = async (username: string, updates: Partial<User>) => {
    const res = await updateStaffUser(username, updates);
    if (res.success) {
      await refreshUsers();
      if (currentUser?.username === username) {
        const refreshed = await fetchOwnProfile();
        if (refreshed) setCurrentUser(refreshed);
      }
    }
    return res;
  };

  const deleteUser = async (username: string) => {
    if (users.length <= 1) return { success: false, error: 'Impossible de supprimer le seul utilisateur du système.' };
    const res = await deleteStaffUser(username);
    if (res.success) await refreshUsers();
    return res;
  };

  const resetUserPassword = async (username: string) => {
    return resetStaffPassword(username);
  };

  const completePasswordChange = async (newPassword: string) => {
    const res = await changeOwnPassword(newPassword);
    if (res.success) {
      const refreshed = await fetchOwnProfile();
      if (refreshed) setCurrentUser(refreshed);
    }
    return res;
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

  const verifyAndSwitch = async (passwordInput: string): Promise<{ success: boolean; error?: string }> => {
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

    if (!cleanPass) {
      return { success: false, error: `Mot de passe incorrect pour ${targetUser.name}.` };
    }

    const signIn = await signInWithUsername(targetUser.username, cleanPass);
    if (!signIn.success) {
      return { success: false, error: `Mot de passe incorrect pour ${targetUser.name}.` };
    }

    const profile = await fetchOwnProfile();
    if (!profile) {
      return { success: false, error: 'Profil introuvable pour ce compte.' };
    }

    setCurrentUser(profile);
    touchPresence(profile);
    if (authModal.onSuccessSection) {
      setActiveSection(authModal.onSuccessSection);
    } else if (profile.role === 'gerant') {
      setActiveSection('dashboard');
    } else {
      setActiveSection('caisse');
    }

    closeAuthModal();
    return { success: true };
  };

  // Un compte verrouillé par l'admin ne peut pas changer d'espace depuis l'appareil partagé
  const switchUser = (username: string) => {
    if (currentUser?.username.toLowerCase() === username.toLowerCase()) return;
    if (currentUser?.locked && currentUser.role !== 'gerant') return;
    openAuthModal({ targetUsername: username });
  };

  const switchRole = (role: UserRole) => {
    if (currentUser?.role === role) return;
    if (currentUser?.locked && currentUser.role !== 'gerant') return;
    openAuthModal({ targetRole: role });
  };

  const login = async (username: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUsername = username.toLowerCase().trim();
    const cleanPass = (password || '').trim();
    if (!cleanUsername || !cleanPass) {
      return { success: false, error: 'Identifiant ou code incorrect.' };
    }

    const signIn = await signInWithUsername(cleanUsername, cleanPass);
    if (!signIn.success) {
      return { success: false, error: signIn.error || 'Identifiant ou code incorrect.' };
    }

    const profile = await fetchOwnProfile();
    if (!profile) {
      return { success: false, error: 'Profil introuvable pour ce compte. Contactez la gérante.' };
    }

    setCurrentUser(profile);
    touchPresence(profile);
    await refreshUsers();
    if (profile.role === 'gerant') {
      setActiveSection('dashboard');
    } else {
      setActiveSection('caisse');
    }
    return { success: true };
  };

  const logout = () => {
    if (currentUser) clearPresenceFromSupabase(currentUser.username);
    signOutUser();
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

  // Commissions Laveurs
  const addLaveurCommission = (data: {
    laveurName: string;
    clientType: ClientType;
    bonus: number;
  }): LaveurCommission => {
    const grid = CLIENT_TYPE_GRID[data.clientType];
    const now = new Date();
    const bonus = Math.max(0, data.bonus || 0);
    const newCommission: LaveurCommission = {
      id: Date.now(),
      laveurName: data.laveurName.trim(),
      clientType: data.clientType,
      price: grid.price,
      commission: grid.commission,
      bonus,
      total: grid.commission + bonus,
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.getTime(),
      recordedBy: currentUser?.username || 'admin',
    };
    setLaveurCommissions(prev => [newCommission, ...prev]);
    saveLaveurCommissionToSupabase(newCommission);
    return newCommission;
  };

  const deleteLaveurCommission = (id: number) => {
    setLaveurCommissions(prev => prev.filter(c => c.id !== id));
    deleteLaveurCommissionFromSupabase(id);
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
    setCart([]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        authLoading,
        activeSection,
        setActiveSection,
        switchRole,
        switchUser,
        login,
        logout,
        completePasswordChange,
        authModal,
        openAuthModal,
        closeAuthModal,
        verifyAndSwitch,
        users,
        addUser,
        updateUser,
        deleteUser,
        resetUserPassword,
        presence,
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
        laveurCommissions,
        addLaveurCommission,
        deleteLaveurCommission,
        settings,
        updateSettings,
        resetDemoData,
        lastSale,
        setLastSale,
        firebaseConnected,
        supabaseConnected,
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
