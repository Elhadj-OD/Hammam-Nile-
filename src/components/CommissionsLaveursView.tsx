import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ClientType, LaveurCommission } from '../types';
import { CLIENT_TYPE_GRID } from '../lib/laveurCommissions';
import { MOBILE_OPERATORS } from '../lib/mobileOperators';
import {
  Users,
  Plus,
  Wallet,
  Gift,
  TrendingUp,
  FileText,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  ShoppingBag,
  Minus,
  Pencil,
  PackagePlus,
} from 'lucide-react';

interface BoutiqueCartItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
  emoji?: string;
}

export const CommissionsLaveursView: React.FC = () => {
  const { laveurCommissions, addLaveurCommission, deleteLaveurCommission, settings, products, addProduct } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLaveur, setFilterLaveur] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // Form state
  const [laveurName, setLaveurName] = useState('');
  const [clientType, setClientType] = useState<ClientType>('simple');
  const [bonus, setBonus] = useState<number>(0);
  const [payment, setPayment] = useState<'cash' | 'mobile'>('cash');
  const [mobileOperator, setMobileOperator] = useState<string>('Bankily');
  const [customerPhone, setCustomerPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [boutiqueCart, setBoutiqueCart] = useState<BoutiqueCartItem[]>([]);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductQty, setNewProductQty] = useState('1');

  const formatPrice = (val: number) => `${val.toLocaleString('fr-FR')} ${settings.currency}`;

  const knownLaveurs = useMemo(
    () => Array.from(new Set(laveurCommissions.map(c => c.laveurName))).sort(),
    [laveurCommissions]
  );

  const filteredCommissions = useMemo(() => {
    return laveurCommissions.filter(c => {
      const matchesSearch =
        c.laveurName.toLowerCase().includes(search.toLowerCase()) ||
        c.recordedBy.toLowerCase().includes(search.toLowerCase());

      const matchesLaveur = filterLaveur === 'all' || c.laveurName === filterLaveur;

      let matchesPeriod = true;
      const now = Date.now();
      if (filterPeriod === 'today') matchesPeriod = now - c.timestamp < 86400000;
      else if (filterPeriod === 'week') matchesPeriod = now - c.timestamp < 86400000 * 7;
      else if (filterPeriod === 'month') matchesPeriod = now - c.timestamp < 86400000 * 30;

      return matchesSearch && matchesLaveur && matchesPeriod;
    });
  }, [laveurCommissions, search, filterLaveur, filterPeriod]);

  const totalCommissions = filteredCommissions.reduce((sum, c) => sum + c.commission, 0);
  const totalBonus = filteredCommissions.reduce((sum, c) => sum + c.bonus, 0);
  const totalGeneral = filteredCommissions.reduce((sum, c) => sum + c.total, 0);

  // Récapitulatif par laveur (sur la période filtrée)
  const perLaveur = useMemo(() => {
    const map: Record<string, { count: number; commission: number; bonus: number; total: number }> = {};
    filteredCommissions.forEach(c => {
      if (!map[c.laveurName]) map[c.laveurName] = { count: 0, commission: 0, bonus: 0, total: 0 };
      map[c.laveurName].count += 1;
      map[c.laveurName].commission += c.commission;
      map[c.laveurName].bonus += c.bonus;
      map[c.laveurName].total += c.total;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filteredCommissions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!laveurName.trim()) {
      setFormError('Veuillez indiquer le nom du laveur.');
      return;
    }
    if (bonus < 0) {
      setFormError('Le bonus ne peut pas être négatif.');
      return;
    }
    if (payment === 'mobile' && !customerPhone.trim()) {
      setFormError('Veuillez indiquer le numéro mobile money du client.');
      return;
    }

    addLaveurCommission({
      laveurName: laveurName.trim(),
      clientType,
      bonus,
      payment,
      paymentDetail: payment === 'mobile' ? mobileOperator : undefined,
      customerPhone: payment === 'mobile' ? customerPhone.trim() : undefined,
      products: boutiqueCart.map(item => ({ productId: item.productId, qty: item.qty, price: item.price })),
    });

    setShowAddModal(false);
    setLaveurName('');
    setClientType('simple');
    setBonus(0);
    setPayment('cash');
    setMobileOperator('Bankily');
    setCustomerPhone('');
    setFormError('');
    setProductSearch('');
    setBoutiqueCart([]);
    setEditingPriceId(null);
    setShowNewProductForm(false);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductQty('1');
  };

  const productMatches = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p => p.name.toLowerCase().includes(q) && p.qty > 0).slice(0, 6);
  }, [products, productSearch]);

  const addProductToCart = (productId: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    setBoutiqueCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) {
        return prev.map(i =>
          i.productId === productId ? { ...i, qty: Math.min(i.qty + 1, prod.qty) } : i
        );
      }
      return [...prev, { productId: prod.id, name: prod.name, price: prod.price, qty: 1, emoji: prod.emoji }];
    });
    setProductSearch('');
  };

  const changeCartQty = (productId: number, delta: number) => {
    setBoutiqueCart(prev =>
      prev
        .map(i => {
          if (i.productId !== productId) return i;
          const prod = products.find(p => p.id === productId);
          const max = prod?.qty ?? i.qty;
          const nextQty = Math.max(0, Math.min(i.qty + delta, max));
          return { ...i, qty: nextQty };
        })
        .filter(i => i.qty > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setBoutiqueCart(prev => prev.filter(i => i.productId !== productId));
  };

  const boutiqueSubtotal = boutiqueCart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const handleDelete = (c: LaveurCommission) => {
    if (window.confirm(`Supprimer ce service de ${c.laveurName} (${formatPrice(c.total)}) ?`)) {
      deleteLaveurCommission(c.id);
    }
  };

  const grid = CLIENT_TYPE_GRID[clientType];

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E0D3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0F4C4A] text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Hammam</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-[#1C2321]">Hammam — Services & Commissions</h1>
          <p className="text-sm text-[#6B7873] mt-1">
            Enregistrez chaque service par type de client — la commission fixe se calcule automatiquement, plus un bonus/pourboire optionnel. Vous pouvez aussi ajouter les articles boutique achetés par le même client.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="bg-[#0F4C4A] hover:bg-[#0A3735] text-white px-5 py-3 rounded-full font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Service</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7873] uppercase tracking-wider">Commissions Fixes</span>
            <div className="w-8 h-8 rounded-xl bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F4C4A] mt-2 font-display">{formatPrice(totalCommissions)}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7873] uppercase tracking-wider">Bonus / Pourboires</span>
            <div className="w-8 h-8 rounded-xl bg-[#F7F3EC] text-[#B8874B] flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C2321] mt-2 font-display">{formatPrice(totalBonus)}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7873] uppercase tracking-wider">Total Général</span>
            <div className="w-8 h-8 rounded-xl bg-[#F7F3EC] text-[#0F4C4A] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C2321] mt-2 font-display">{formatPrice(totalGeneral)}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7873] uppercase tracking-wider">Services</span>
            <div className="w-8 h-8 rounded-xl bg-[#F7F3EC] text-[#1C2321] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C2321] mt-2 font-display">{filteredCommissions.length}</div>
        </div>
      </div>

      {/* Per-Laveur Breakdown */}
      {perLaveur.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <h3 className="text-xs font-bold text-[#6B7873] uppercase tracking-wider mb-3">Récapitulatif par Laveur</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {perLaveur.map(([name, data]) => (
              <div
                key={name}
                onClick={() => setFilterLaveur(filterLaveur === name ? 'all' : name)}
                className={`p-3.5 rounded-xl border transition cursor-pointer ${
                  filterLaveur === name
                    ? 'bg-[#E4E9E1] border-[#0F4C4A] shadow-xs'
                    : 'bg-[#F7F3EC]/70 border-[#E7E0D3] hover:bg-[#E4E9E1]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#1C2321] line-clamp-1">{name}</span>
                  <span className="text-[10px] text-[#6B7873]">{data.count} service(s)</span>
                </div>
                <div className="mt-2 space-y-0.5 text-[11px] text-[#6B7873]">
                  <div className="flex justify-between">
                    <span>Commissions</span>
                    <span className="font-bold text-[#0F4C4A]">{formatPrice(data.commission)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bonus</span>
                    <span className="font-bold text-[#B8874B]">{formatPrice(data.bonus)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#E7E0D3] mt-1">
                    <span className="font-bold text-[#1C2321]">Total</span>
                    <span className="font-extrabold text-[#1C2321]">{formatPrice(data.total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7873] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par laveur ou enregistré par..."
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl focus:outline-none focus:border-[#0F4C4A]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {knownLaveurs.length > 0 && (
            <select
              value={filterLaveur}
              onChange={e => setFilterLaveur(e.target.value)}
              className="text-xs p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-semibold focus:outline-none focus:border-[#0F4C4A]"
            >
              <option value="all">Tous les laveurs</option>
              {knownLaveurs.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center bg-[#F7F3EC] p-1 rounded-xl border border-[#E7E0D3] text-xs">
            {(['today', 'week', 'month', 'all'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPeriod(p)}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filterPeriod === p ? 'bg-[#0F4C4A] text-white shadow-xs' : 'text-[#6B7873] hover:text-[#1C2321]'
                }`}
              >
                {p === 'today' ? 'Jour' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Tout'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E7E0D3] bg-[#F7F3EC]/50">
          <h3 className="text-xs font-bold text-[#1C2321] uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0F4C4A]" />
            <span>Détail des Services ({filteredCommissions.length})</span>
          </h3>
        </div>

        {filteredCommissions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F3EC] text-[#6B7873] flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-[#B8874B]" />
            </div>
            <h4 className="text-sm font-bold text-[#1C2321]">Aucun service trouvé</h4>
            <p className="text-xs text-[#6B7873] mt-1 max-w-sm mx-auto">
              Cliquez sur « Nouveau Service » pour enregistrer une commission de laveur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F3EC]/80 border-b border-[#E7E0D3] text-[#6B7873] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Laveur</th>
                  <th className="py-3 px-4">Type Client</th>
                  <th className="py-3 px-4">Paiement</th>
                  <th className="py-3 px-4 text-right">Commission</th>
                  <th className="py-3 px-4 text-right">Bonus</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Enregistré par</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D3]">
                {filteredCommissions.map(c => (
                  <tr key={c.id} className="hover:bg-[#F7F3EC]/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#1C2321]">{c.date}</div>
                      <div className="text-[10px] text-[#6B7873]">{c.time}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#1C2321]">{c.laveurName}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E4E9E1] text-[#0F4C4A] border border-[#0F4C4A]/20">
                        {CLIENT_TYPE_GRID[c.clientType].label}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7873]">
                      {c.payment === 'mobile' ? (
                        <div>
                          <div className="font-semibold text-[#1C2321]">
                            📱 Mobile{c.paymentDetail ? ` (${c.paymentDetail})` : ''}
                          </div>
                          {c.customerPhone && <div className="text-[10px]">{c.customerPhone}</div>}
                        </div>
                      ) : (
                        '💵 Espèces'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-[#0F4C4A]">
                      {formatPrice(c.commission)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-[#B8874B]">
                      {c.bonus > 0 ? formatPrice(c.bonus) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-extrabold text-[#1C2321]">
                      {formatPrice(c.total)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7873]">{c.recordedBy}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        title="Supprimer"
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add New Service */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E7E0D3] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D3]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0F4C4A] text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1C2321] font-display">Nouveau Service</h3>
                  <p className="text-[11px] text-[#6B7873]">Commission calculée automatiquement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setProductSearch('');
                  setBoutiqueCart([]);
                  setShowNewProductForm(false);
                  setEditingPriceId(null);
                }}
                className="p-1.5 rounded-lg text-[#6B7873] hover:text-[#1C2321] hover:bg-[#F7F3EC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Laveur name */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">Nom du laveur *</label>
                <input
                  type="text"
                  list="laveur-suggestions"
                  value={laveurName}
                  onChange={e => setLaveurName(e.target.value)}
                  placeholder="ex: Mohamed"
                  required
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                />
                <datalist id="laveur-suggestions">
                  {knownLaveurs.map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              {/* Client type */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1.5">Type de client *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CLIENT_TYPE_GRID) as ClientType[]).map(ct => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setClientType(ct)}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                        clientType === ct
                          ? 'bg-[#0F4C4A] border-[#0F4C4A] text-white shadow-xs'
                          : 'bg-[#F7F3EC] border-[#E7E0D3] text-[#1C2321] hover:bg-[#E4E9E1]'
                      }`}
                    >
                      <div className="text-xs font-bold">{CLIENT_TYPE_GRID[ct].label}</div>
                      <div className={`text-[10px] mt-0.5 ${clientType === ct ? 'text-white/80' : 'text-[#6B7873]'}`}>
                        {formatPrice(CLIENT_TYPE_GRID[ct].commission)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1.5">Mode de paiement du client *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayment('cash')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      payment === 'cash'
                        ? 'bg-[#0F4C4A] border-[#0F4C4A] text-white shadow-xs'
                        : 'bg-[#F7F3EC] border-[#E7E0D3] text-[#1C2321] hover:bg-[#E4E9E1]'
                    }`}
                  >
                    Espèces
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayment('mobile')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      payment === 'mobile'
                        ? 'bg-[#0F4C4A] border-[#0F4C4A] text-white shadow-xs'
                        : 'bg-[#F7F3EC] border-[#E7E0D3] text-[#1C2321] hover:bg-[#E4E9E1]'
                    }`}
                  >
                    Mobile Money
                  </button>
                </div>
                {payment === 'mobile' && (
                  <>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {MOBILE_OPERATORS.map(op => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => setMobileOperator(op)}
                          className={`flex-1 min-w-[65px] py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                            mobileOperator === op
                              ? 'bg-[#0F4C4A] text-white border-[#0F4C4A]'
                              : 'bg-[#F7F3EC] text-[#1C2321] border-[#E7E0D3] hover:bg-[#E4E9E1]'
                          }`}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="Numéro mobile money du client"
                      required
                      className="mt-2 w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
                    />
                  </>
                )}
              </div>

              {/* Bonus */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Bonus / Pourboire (optionnel)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={bonus}
                  onChange={e => setBonus(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-mono focus:outline-none focus:border-[#0F4C4A]"
                />
              </div>

              {/* Boutique products (optional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#1C2321] flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Articles boutique achetés (optionnel)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewProductForm(v => !v)}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#0F4C4A] hover:text-[#0A3735] cursor-pointer"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    <span>Nouveau produit</span>
                  </button>
                </div>

                {showNewProductForm && (
                  <div className="mb-2 p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl space-y-2">
                    <input
                      type="text"
                      value={newProductName}
                      onChange={e => setNewProductName(e.target.value)}
                      placeholder="Nom du nouveau produit"
                      className="w-full text-xs p-2 bg-white border border-[#E7E0D3] rounded-lg text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={newProductPrice}
                        onChange={e => setNewProductPrice(e.target.value)}
                        placeholder={`Prix (${settings.currency})`}
                        className="w-full text-xs p-2 bg-white border border-[#E7E0D3] rounded-lg text-[#1C2321] font-mono focus:outline-none focus:border-[#0F4C4A]"
                      />
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={newProductQty}
                        onChange={e => setNewProductQty(e.target.value)}
                        placeholder="Quantité en stock"
                        className="w-full text-xs p-2 bg-white border border-[#E7E0D3] rounded-lg text-[#1C2321] font-mono focus:outline-none focus:border-[#0F4C4A]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const priceNum = parseInt(newProductPrice) || 0;
                        const qtyNum = Math.max(1, parseInt(newProductQty) || 1);
                        if (!newProductName.trim() || priceNum <= 0) return;
                        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
                        addProduct({
                          name: newProductName.trim(),
                          category: 'autres',
                          price: priceNum,
                          qty: qtyNum,
                          minQty: 0,
                        });
                        setBoutiqueCart(prev => [
                          ...prev,
                          { productId: newId, name: newProductName.trim(), price: priceNum, qty: 1 },
                        ]);
                        setNewProductName('');
                        setNewProductPrice('');
                        setNewProductQty('1');
                        setShowNewProductForm(false);
                      }}
                      className="w-full py-2 bg-[#0F4C4A] text-white rounded-lg text-xs font-bold hover:bg-[#0A3735] transition cursor-pointer"
                    >
                      Créer et ajouter au panier
                    </button>
                  </div>
                )}

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#6B7873] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Rechercher un produit boutique existant..."
                    className="w-full text-xs pl-8 pr-3 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl focus:outline-none focus:border-[#0F4C4A]"
                  />
                </div>
                {productMatches.length > 0 && (
                  <div className="mt-1.5 border border-[#E7E0D3] rounded-xl overflow-hidden divide-y divide-[#E7E0D3]">
                    {productMatches.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductToCart(p.id)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs bg-white hover:bg-[#F7F3EC] transition cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[#1C2321] font-semibold">
                          {p.emoji && <span>{p.emoji}</span>}
                          <span>{p.name}</span>
                        </span>
                        <span className="text-[#6B7873] font-bold">{formatPrice(p.price)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {boutiqueCart.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {boutiqueCart.map(item => (
                      <div
                        key={item.productId}
                        className="p-2 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {item.emoji && <span>{item.emoji}</span>}
                            <span className="font-semibold text-[#1C2321] truncate">{item.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => changeCartQty(item.productId, -1)}
                              className="w-6 h-6 rounded-lg bg-white border border-[#E7E0D3] flex items-center justify-center hover:bg-[#E4E9E1] cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center font-bold">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => changeCartQty(item.productId, 1)}
                              className="w-6 h-6 rounded-lg bg-white border border-[#E7E0D3] flex items-center justify-center hover:bg-[#E4E9E1] cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#6B7873]">Prix unitaire</span>
                            {editingPriceId === item.productId ? (
                              <input
                                type="number"
                                min="0"
                                step="1"
                                autoFocus
                                value={item.price}
                                onChange={e => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setBoutiqueCart(prev =>
                                    prev.map(i => (i.productId === item.productId ? { ...i, price: val } : i))
                                  );
                                }}
                                onBlur={() => setEditingPriceId(null)}
                                className="w-16 text-right font-bold text-[#0F4C4A] bg-white border border-[#0F4C4A]/40 rounded-lg px-1 py-0.5 font-mono focus:outline-none"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditingPriceId(item.productId)}
                                title="Modifier le prix pour cette vente"
                                className="font-bold text-[#0F4C4A] flex items-center gap-0.5 cursor-pointer hover:underline"
                              >
                                <Pencil className="w-2.5 h-2.5 opacity-60" />
                                {formatPrice(item.price)}
                              </button>
                            )}
                          </div>
                          <span className="font-extrabold text-[#1C2321] w-16 text-right">
                            {formatPrice(item.price * item.qty)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-[#E4E9E1]/60 p-3.5 rounded-xl border border-[#0F4C4A]/20 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#0A3735]">
                  <span>Prix du service ({CLIENT_TYPE_GRID[clientType].label})</span>
                  <span className="font-bold">{formatPrice(grid.price)}</span>
                </div>
                <div className="flex justify-between text-[#0A3735]">
                  <span>Commission fixe (laveur)</span>
                  <span className="font-bold">{formatPrice(grid.commission)}</span>
                </div>
                <div className="flex justify-between text-[#0A3735]">
                  <span>Bonus (laveur)</span>
                  <span className="font-bold">{formatPrice(bonus)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[#0F4C4A]/20 font-extrabold text-[#0F4C4A]">
                  <span>Total commission laveur</span>
                  <span>{formatPrice(grid.commission + bonus)}</span>
                </div>
                {boutiqueCart.length > 0 && (
                  <>
                    <div className="flex justify-between text-[#B8874B] pt-1.5 border-t border-[#0F4C4A]/20">
                      <span>Articles boutique (→ inventaire)</span>
                      <span className="font-bold">{formatPrice(boutiqueSubtotal)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-[#0F4C4A]/20 text-sm font-extrabold text-[#1C2321]">
                      <span>Total payé par le client</span>
                      <span>{formatPrice(grid.commission + bonus + boutiqueSubtotal)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setProductSearch('');
                    setBoutiqueCart([]);
                    setShowNewProductForm(false);
                    setEditingPriceId(null);
                  }}
                  className="flex-1 py-2.5 bg-[#F7F3EC] text-[#1C2321] border border-[#E7E0D3] rounded-xl text-xs font-bold hover:bg-[#E4E9E1] transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0F4C4A] text-white rounded-xl text-xs font-bold hover:bg-[#0A3735] transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer le Service</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
