import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory } from '../types';
import { MOBILE_OPERATORS } from '../lib/mobileOperators';
import {
  Sparkles,
  Plus,
  X,
  Wallet,
  Smartphone,
  Banknote,
  Receipt,
  FileText,
  AlertCircle,
} from 'lucide-react';

export interface ServiceTab {
  key: string;
  label: string;
  filter: (p: Product) => boolean;
}

interface ServiceCaisseViewProps {
  category: ProductCategory;
  eyebrow: string;
  pageTitle: string;
  pageSubtitle: string;
  tabs?: ServiceTab[];
}

// Vue "Nouveau Service" générique pour les caisses de prestations (pas de
// panier boutique, pas de scanner, pas de commission) : Épilation et
// Coiffure & Salon l'utilisent aujourd'hui. Sélectionner une prestation
// ouvre directement le formulaire d'encaissement.
export const ServiceCaisseView: React.FC<ServiceCaisseViewProps> = ({
  category,
  eyebrow,
  pageTitle,
  pageSubtitle,
  tabs,
}) => {
  const { products, sales, currentUser, completeServiceSale, settings } = useApp();

  const [activeTab, setActiveTab] = useState<string>(tabs?.[0]?.key || '');
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [payment, setPayment] = useState<'cash' | 'mobile'>('cash');
  const [mobileOperator, setMobileOperator] = useState<string>('Bankily');
  const [customerPhone, setCustomerPhone] = useState('');
  const [formError, setFormError] = useState('');

  const formatPrice = (val: number) => `${val.toLocaleString('fr-FR')} ${settings.currency}`;

  const categoryProducts = useMemo(() => products.filter(p => p.category === category), [products, category]);
  const activeProducts = useMemo(() => {
    if (!tabs || tabs.length === 0) return categoryProducts;
    const tab = tabs.find(t => t.key === activeTab) || tabs[0];
    return categoryProducts.filter(tab.filter);
  }, [categoryProducts, tabs, activeTab]);

  const mySales = useMemo(() => {
    const now = Date.now();
    return sales.filter(s => {
      if (!currentUser || s.caissier.toLowerCase() !== currentUser.username.toLowerCase()) return false;
      if (!s.items.some(i => i.category === category)) return false;
      if (filterPeriod === 'today') return now - s.timestamp < 86400000;
      if (filterPeriod === 'week') return now - s.timestamp < 86400000 * 7;
      if (filterPeriod === 'month') return now - s.timestamp < 86400000 * 30;
      return true;
    });
  }, [sales, currentUser, filterPeriod, category]);

  const totalGeneral = mySales.reduce((sum, s) => sum + s.total, 0);
  const totalEspeces = mySales.filter(s => s.payment === 'cash').reduce((sum, s) => sum + s.total, 0);
  const totalMobile = mySales.filter(s => s.payment === 'mobile').reduce((sum, s) => sum + s.total, 0);

  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setPriceInput(product.price > 0 ? String(product.price) : '');
    setPayment('cash');
    setMobileOperator('Bankily');
    setCustomerPhone('');
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!selectedProduct) return;

    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
      setFormError('Veuillez indiquer le prix de la prestation.');
      return;
    }
    if (payment === 'mobile' && !customerPhone.trim()) {
      setFormError('Veuillez indiquer le numéro mobile money du client.');
      return;
    }

    completeServiceSale(selectedProduct, price, payment, {
      paymentDetail: payment === 'mobile' ? mobileOperator : undefined,
      customerPhone: customerPhone.trim() || undefined,
    });

    closeModal();
  };

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E0D3] shadow-xs">
        <div className="flex items-center gap-2 text-[#0F4C4A] text-xs font-bold uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          <span>{eyebrow}</span>
        </div>
        <h1 className="text-2xl font-bold font-display text-[#1C2321]">{pageTitle}</h1>
        <p className="text-sm text-[#6B7873] mt-1">{pageSubtitle}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Total Général</span>
            <div className="w-7 h-7 rounded-lg bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F4C4A] font-display">{formatPrice(totalGeneral)}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Espèces</span>
            <div className="w-7 h-7 rounded-lg bg-[#F7F3EC] text-[#1C2321] flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C2321] font-display">{formatPrice(totalEspeces)}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Mobile Money</span>
            <div className="w-7 h-7 rounded-lg bg-[#F7F3EC] text-[#B8874B] flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#B8874B] font-display">{formatPrice(totalMobile)}</div>
        </div>
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="flex items-center bg-white p-1 rounded-2xl border border-[#E7E0D3] shadow-xs w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                (activeTab || tabs[0].key) === tab.key
                  ? 'bg-[#0F4C4A] text-white shadow-xs'
                  : 'text-[#6B7873] hover:text-[#1C2321]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {activeProducts.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => openModal(p)}
            className="text-left p-4 rounded-2xl bg-white border border-[#E7E0D3] hover:border-[#0F4C4A]/50 hover:shadow-xs transition cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-sm text-[#1C2321]">{p.name}</span>
              <Plus className="w-4 h-4 text-[#0F4C4A] shrink-0" />
            </div>
            <div className="mt-2 text-xs font-bold">
              {p.price > 0 ? (
                <span className="text-[#0F4C4A]">{formatPrice(p.price)}</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <AlertCircle className="w-3 h-3" />
                  Prix à définir
                </span>
              )}
            </div>
          </button>
        ))}
        {activeProducts.length === 0 && (
          <div className="col-span-full p-8 text-center text-xs text-[#6B7873] bg-white rounded-2xl border border-[#E7E0D3]">
            Aucune prestation dans cette catégorie.
          </div>
        )}
      </div>

      {/* Historique */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E7E0D3] bg-[#F7F3EC]/50 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-[#1C2321] uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0F4C4A]" />
            <span>Mes Services ({mySales.length})</span>
          </h3>
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

        {mySales.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F3EC] text-[#6B7873] flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-[#B8874B]" />
            </div>
            <h4 className="text-sm font-bold text-[#1C2321]">Aucun service enregistré</h4>
            <p className="text-xs text-[#6B7873] mt-1">Sélectionnez une prestation ci-dessus pour commencer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F3EC]/80 border-b border-[#E7E0D3] text-[#6B7873] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Prestation</th>
                  <th className="py-3 px-4">Paiement</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D3]">
                {mySales.map(s => (
                  <tr key={s.id} className="hover:bg-[#F7F3EC]/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#1C2321]">{s.date}</div>
                      <div className="text-[10px] text-[#6B7873]">{s.time}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1C2321]">
                      {s.items.map(i => i.name).join(', ')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7873]">
                      {s.payment === 'mobile' ? (
                        <div>
                          <div className="font-semibold text-[#1C2321]">
                            📱 Mobile{s.paymentDetail ? ` (${s.paymentDetail})` : ''}
                          </div>
                          {s.customerPhone && <div className="text-[10px]">{s.customerPhone}</div>}
                        </div>
                      ) : (
                        '💵 Espèces'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-extrabold text-[#1C2321]">
                      {formatPrice(s.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Nouveau Service */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E7E0D3] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D3]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0F4C4A] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1C2321] font-display">Nouveau Service</h3>
                  <p className="text-xs text-[#6B7873]">{selectedProduct.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-[#6B7873] hover:bg-[#F7F3EC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Prix ({settings.currency}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  placeholder="ex: 500"
                  autoFocus
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-mono focus:outline-none focus:border-[#0F4C4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1.5">Paiement</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayment('cash')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      payment === 'cash'
                        ? 'bg-[#0F4C4A] border-[#0F4C4A] text-white'
                        : 'bg-[#F7F3EC] border-[#E7E0D3] text-[#1C2321] hover:bg-[#E4E9E1]'
                    }`}
                  >
                    💵 Espèces
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayment('mobile')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      payment === 'mobile'
                        ? 'bg-[#0F4C4A] border-[#0F4C4A] text-white'
                        : 'bg-[#F7F3EC] border-[#E7E0D3] text-[#1C2321] hover:bg-[#E4E9E1]'
                    }`}
                  >
                    📱 Mobile Money
                  </button>
                </div>
              </div>

              {payment === 'mobile' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#1C2321] mb-1">Opérateur</label>
                    <select
                      value={mobileOperator}
                      onChange={e => setMobileOperator(e.target.value)}
                      className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
                    >
                      {MOBILE_OPERATORS.map(op => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1C2321] mb-1">Numéro du client *</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="ex: 36 12 34 56"
                      className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
                    />
                  </div>
                </>
              )}

              {payment === 'cash' && (
                <div>
                  <label className="block text-xs font-bold text-[#1C2321] mb-1">Numéro du client (optionnel)</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="ex: 36 12 34 56"
                    className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-[#0F4C4A] hover:bg-[#0A3735] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Enregistrer le service
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
