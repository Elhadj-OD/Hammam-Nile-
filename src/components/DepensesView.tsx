import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Wallet,
  Plus,
  X,
  Trash2,
  ShoppingBasket,
  FileText,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';

export const DepensesView: React.FC = () => {
  const { expenses, addExpense, deleteExpense, settings } = useApp();

  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const formatPrice = (val: number) => `${val.toLocaleString('fr-FR')} ${settings.currency}`;

  const filteredExpenses = useMemo(() => {
    const now = Date.now();
    return expenses.filter(e => {
      if (filterPeriod === 'today') return now - e.timestamp < 86400000;
      if (filterPeriod === 'week') return now - e.timestamp < 86400000 * 7;
      if (filterPeriod === 'month') return now - e.timestamp < 86400000 * 30;
      return true;
    });
  }, [expenses, filterPeriod]);

  const totalPeriod = filteredExpenses.reduce((sum, e) => sum + e.price, 0);

  const totalThisMonth = useMemo(() => {
    const now = new Date();
    return expenses
      .filter(e => {
        const d = new Date(e.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + e.price, 0);
  }, [expenses]);

  const resetForm = () => {
    setShowAddModal(false);
    setName('');
    setPrice('');
    setQty('');
    setNotes('');
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setFormError('Veuillez indiquer un prix valide.');
      return;
    }
    const qtyValue = qty.trim() ? parseFloat(qty) : undefined;
    const res = addExpense({ name, price: priceValue, qty: qtyValue, notes });
    if (!res.success) {
      setFormError(res.error || "Impossible d'ajouter cette dépense.");
      return;
    }
    resetForm();
  };

  const handleDelete = (id: number, label: string) => {
    if (window.confirm(`Supprimer la dépense « ${label} » ?`)) {
      deleteExpense(id);
    }
  };

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto pb-12">
      {/* Top Banner */}
      <div className="water-glass-light rounded-2xl p-6 border border-white/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <div className="flex items-center gap-2 text-[#004CB7] text-xs font-bold uppercase tracking-wider mb-1">
            <Wallet className="w-4 h-4" />
            <span>Dépenses</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-[#1C2321]">Dépenses & Achats</h1>
          <p className="text-sm text-[#6B7873] mt-1">
            Produits achetés au marché ou chez un fournisseur, pour suivre ce qui est dépensé chaque mois.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="relative bg-[#004CB7] hover:bg-[#002E6E] text-white px-5 py-3 rounded-full font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une dépense</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Total ce mois-ci</span>
            <div className="w-7 h-7 rounded-lg bg-[#E4EAF7] text-[#004CB7] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#004CB7] font-display">{formatPrice(totalThisMonth)}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Total période affichée</span>
            <div className="w-7 h-7 rounded-lg bg-[#F7F3EC] text-[#B8874B] flex items-center justify-center">
              <ShoppingBasket className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C2321] font-display">{formatPrice(totalPeriod)}</div>
        </div>
      </div>

      {/* Historique */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E7E0D3] bg-[#F7F3EC]/50 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-[#1C2321] uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#004CB7]" />
            <span>Dépenses ({filteredExpenses.length})</span>
          </h3>
          <div className="flex items-center bg-[#F7F3EC] p-1 rounded-xl border border-[#E7E0D3] text-xs">
            {(['today', 'week', 'month', 'all'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPeriod(p)}
                className={`px-2.5 py-1.5 rounded-full font-bold transition cursor-pointer ${
                  filterPeriod === p ? 'bg-[#004CB7] text-white shadow-xs' : 'text-[#6B7873] hover:text-[#1C2321]'
                }`}
              >
                {p === 'today' ? 'Jour' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Tout'}
              </button>
            ))}
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F3EC] text-[#6B7873] flex items-center justify-center mx-auto mb-3">
              <ShoppingBasket className="w-6 h-6 text-[#B8874B]" />
            </div>
            <h4 className="text-sm font-bold text-[#1C2321]">Aucune dépense enregistrée</h4>
            <p className="text-xs text-[#6B7873] mt-1">Cliquez sur « Ajouter une dépense » pour commencer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F3EC]/80 border-b border-[#E7E0D3] text-[#6B7873] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Produit</th>
                  <th className="py-3 px-4">Note</th>
                  <th className="py-3 px-4">Ajouté par</th>
                  <th className="py-3 px-4 text-right">Prix</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D3]">
                {filteredExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-[#F7F3EC]/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#1C2321]">{e.date}</div>
                      <div className="text-[10px] text-[#6B7873]">{e.time}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1C2321]">
                      {e.name}
                      {e.qty != null && <span className="text-[10px] text-[#6B7873] ml-1">×{e.qty}</span>}
                    </td>
                    <td className="py-3 px-4 text-[#6B7873]">{e.notes || '—'}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7873]">{e.addedBy}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-extrabold text-[#1C2321]">
                      {formatPrice(e.price)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(e.id, e.name)}
                        title="Supprimer"
                        className="p-1.5 rounded-full text-rose-600 hover:bg-rose-50 cursor-pointer"
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

      {/* Modal: Ajouter une dépense */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E7E0D3] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D3]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#004CB7] text-white flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#1C2321] font-display">Ajouter une dépense</h3>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 rounded-full text-[#6B7873] hover:bg-[#F7F3EC] cursor-pointer"
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
                <label className="block text-xs font-bold text-[#1C2321] mb-1">Produit acheté *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ex: Tomates, oignons, savon noir..."
                  required
                  autoFocus
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] focus:outline-none focus:border-[#004CB7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C2321] mb-1">
                    Prix ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="ex: 1500"
                    required
                    className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-mono focus:outline-none focus:border-[#004CB7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C2321] mb-1">Quantité (optionnel)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    placeholder="ex: 5"
                    className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-mono focus:outline-none focus:border-[#004CB7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">Note (optionnel)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ex: Marché du lundi"
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] focus:outline-none focus:border-[#004CB7]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#004CB7] hover:bg-[#002E6E] text-white rounded-full text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Enregistrer la dépense
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
