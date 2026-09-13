import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Package,
  Calendar,
  Clock,
  User,
  History,
} from 'lucide-react';

export const MouvementsView: React.FC = () => {
  const { products, movements, addMovement, setActiveSection } = useApp();

  const [productId, setProductId] = useState<string>('');
  const [type, setType] = useState<'in' | 'out'>('in');
  const [qty, setQty] = useState<string>('5');
  const [reason, setReason] = useState('Livraison fournisseur');
  const [customReason, setCustomReason] = useState('');

  const commonReasons = [
    'Livraison commande fournisseur',
    'Réapprovisionnement rayon',
    'Utilisation interne cabine hammam & soins',
    'Perte, casse ou produit endommagé',
    'Ajustement après comptage physique',
    'Autre motif',
  ];

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const pId = parseInt(productId);
    const qtyNum = parseInt(qty);

    if (!pId || isNaN(qtyNum) || qtyNum <= 0) {
      alert('Veuillez sélectionner un produit et une quantité supérieure à 0');
      return;
    }

    const effectiveReason = reason === 'Autre motif' ? customReason.trim() : reason;
    if (!effectiveReason) {
      alert('Veuillez préciser le motif');
      return;
    }

    const success = addMovement({
      productId: pId,
      type,
      qty: qtyNum,
      reason: effectiveReason,
    });

    if (!success) {
      alert('Stock insuffisant pour effectuer cette sortie !');
      return;
    }

    // Reset Form
    setProductId('');
    setQty('5');
    setCustomReason('');
    alert('✓ Mouvement de stock enregistré avec succès !');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Traçabilité & Flux de Stock</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">
            Mouvements d'Entrées & Sorties
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Journalisez les réceptions de marchandises, consommations internes et ajustements de stock
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('prelevements-hammam')}
          className="px-4 py-2.5 bg-[#E4E9E1] hover:bg-[#0F4C4A] hover:text-white text-[#0F4C4A] border border-[#0F4C4A]/20 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <span>✨ Prélèvements Hammam</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Movement Registration Form */}
      <form
        onSubmit={handleAddMovement}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
      >
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span>Enregistrer une Entrée ou Sortie de Marchandise</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Product selection */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Article concerné *
            </label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              required
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choisir un produit en stock --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock actuel: {p.qty})
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sens du mouvement *
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setType('in')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  type === 'in'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>📥 Entrée</span>
              </button>

              <button
                type="button"
                onClick={() => setType('out')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  type === 'out'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>📤 Sortie</span>
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantité (unités) *
            </label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={e => setQty(e.target.value)}
              required
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motif de l'opération
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              {commonReasons.map((r, i) => (
                <option key={i} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reason === 'Autre motif' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Préciser la raison *
              </label>
              <input
                type="text"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="ex: Échantillon offert client VIP"
                required
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Valider le Mouvement</span>
          </button>
        </div>
      </form>

      {/* Movement Audit Trail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">
              Journal d'Audit des Mouvements ({movements.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Article</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4 text-center">Quantité</th>
                <th className="py-3 px-4">Motif / Justificatif</th>
                <th className="py-3 px-4 text-right">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Aucun mouvement enregistré</p>
                  </td>
                </tr>
              ) : (
                movements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <span className="font-medium">{m.date}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">{m.time}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{m.productName}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.type === 'in'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {m.type === 'in' ? '📥 ENTRÉE' : '📤 SORTIE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-extrabold text-slate-900">
                      {m.type === 'in' ? `+${m.qty}` : `-${m.qty}`}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{m.reason}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{m.user}</td>
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
