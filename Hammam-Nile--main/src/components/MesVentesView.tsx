import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Receipt,
  Banknote,
  Smartphone,
  Calendar,
  Clock,
  Printer,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';

export const MesVentesView: React.FC = () => {
  const { currentUser, sales, settings, users, setLastSale } = useApp();
  const [filterUser, setFilterUser] = useState<string>('all');

  const isGerant = currentUser?.role === 'gerant';

  const displayedSales = sales.filter(s => {
    if (!isGerant) {
      return s.caissier === currentUser?.username;
    }
    if (filterUser !== 'all') {
      return s.caissier === filterUser;
    }
    return true;
  });

  const totalCollected = displayedSales.reduce((sum, s) => sum + s.total, 0);
  const cashCollected = displayedSales
    .filter(s => s.payment === 'cash')
    .reduce((sum, s) => sum + s.total, 0);
  const mobileCollected = displayedSales
    .filter(s => s.payment === 'mobile')
    .reduce((sum, s) => sum + s.total, 0);

  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} ${settings.currency}`;

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto">
      {/* Shift Overview Banner */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F4C4A] mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Journal de caisse & Commandes</span>
          </div>
          <h2 className="text-xl font-bold text-[#1C2321] font-display">
            {isGerant ? 'Historique des Commandes & Ventes' : `Mes Ventes (${currentUser?.name})`}
          </h2>
          <p className="text-xs text-[#6B7873] mt-0.5">
            Arrêté de caisse, encaissements et réimpression des tickets
          </p>
        </div>

        {isGerant && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#6B7873]">Caissière :</span>
            <select
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="bg-[#F7F3EC] border border-[#E7E0D3] text-xs font-bold rounded-xl px-3 py-1.5 text-[#1C2321] outline-hidden cursor-pointer"
            >
              <option value="all">Toutes les caissières</option>
              {users.map(u => (
                <option key={u.username} value={u.username}>
                  {u.name} ({u.role === 'gerant' ? 'Admin' : 'Caissière'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7873] uppercase tracking-wider">
              Total Encaissé
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#1C2321] font-display tracking-tight">
            {fmt(totalCollected)}
          </div>
          <div className="mt-2 text-xs text-[#6B7873]">
            {displayedSales.length} transaction{displayedSales.length > 1 ? 's' : ''} enregistrée{displayedSales.length > 1 ? 's' : ''}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7873] uppercase tracking-wider">
              Espèces (Tiroir)
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#1C2321] font-display tracking-tight">
            {fmt(cashCollected)}
          </div>
          <div className="mt-2 text-xs text-[#0F4C4A] font-bold">
            Montant liquide en caisse
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7873] uppercase tracking-wider">
              Mobile (Bankily / Masrivi)
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#F7F3EC] text-[#B8874B] flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#1C2321] font-display tracking-tight">
            {fmt(mobileCollected)}
          </div>
          <div className="mt-2 text-xs text-[#6B7873]">
            Virements électroniques
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E7E0D3] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#0F4C4A]" />
            <h3 className="font-bold text-sm text-[#1C2321]">
              Détail des tickets émis ({displayedSales.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F3EC] text-[#6B7873] font-bold border-b border-[#E7E0D3]">
              <tr>
                <th className="py-3 px-4">Heure / Date</th>
                <th className="py-3 px-4">N° Ticket</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Articles</th>
                <th className="py-3 px-4">Caissière</th>
                <th className="py-3 px-4">Paiement</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D3]">
              {displayedSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B7873]">
                    <ShoppingBag className="w-10 h-10 mx-auto stroke-1 text-[#6B7873]/50 mb-2" />
                    <p className="font-bold text-[#1C2321]">Aucune vente enregistrée</p>
                    <p className="text-[11px] text-[#6B7873] mt-0.5">
                      Les ventes que vous finalisez apparaîtront ici immédiatement.
                    </p>
                  </td>
                </tr>
              ) : (
                displayedSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-[#F7F3EC]/70 transition">
                    <td className="py-3 px-4 font-mono text-[#6B7873]">
                      {sale.time} <span className="text-[10px] text-[#6B7873]/70">({sale.date})</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#1C2321]">
                      HB-{String(sale.id).padStart(5, '0')}
                    </td>
                    <td className="py-3 px-4 text-[#1C2321] font-semibold">
                      {sale.customerName || 'Passage'}
                    </td>
                    <td className="py-3 px-4 text-[#6B7873]">
                      <div
                        className="max-w-xs truncate"
                        title={sale.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      >
                        {sale.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#1C2321]">
                      {sale.caissierName || sale.caissier}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E4E9E1] text-[#0F4C4A]">
                        {sale.paymentDetail || (sale.payment === 'cash' ? '💵 Espèces' : '📱 Mobile')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#0F4C4A]">
                      {fmt(sale.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setLastSale(sale)}
                        className="p-1.5 text-[#0F4C4A] hover:bg-[#E4E9E1] rounded-lg transition cursor-pointer"
                        title="Imprimer / Voir le ticket"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
