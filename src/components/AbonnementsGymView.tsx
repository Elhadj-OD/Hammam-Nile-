import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Dumbbell,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Wallet,
} from 'lucide-react';

// Durée de couverture de chaque formule Gym, en jours — la "Carte 10
// séances" est comptée sur sa durée de validité (2 mois), pas sur le
// nombre de passages. "Frais d'inscription" n'ouvre aucune période :
// ce n'est pas un abonnement en soi, juste des frais ponctuels.
const GYM_SUBSCRIPTION_DAYS: Record<string, number> = {
  'Gym - Accès à la journée': 1,
  'Gym - Abonnement Mensuel': 30,
  'Gym - Carte 10 séances': 60,
  'Gym - Abonnement 3 mois': 90,
  'Gym - Abonnement 6 mois': 180,
  'Gym - Abonnement 12 mois': 365,
};

interface Subscription {
  saleId: number;
  clientName: string;
  clientPhone?: string;
  type: string;
  montant: number;
  startTimestamp: number;
  expiryTimestamp: number;
  cashier: string;
}

export const AbonnementsGymView: React.FC = () => {
  const { sales, settings } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'actif' | 'bientot' | 'expire'>('all');

  const formatPrice = (val: number) => `${val.toLocaleString('fr-FR')} ${settings.currency}`;

  // Une ligne par prestation d'abonnement vendue — directement tirée des
  // ventes de la caisse Gym : dès qu'une vente s'y fait, elle apparaît ici
  // automatiquement, sans ressaisie.
  const subscriptions: Subscription[] = useMemo(() => {
    const rows: Subscription[] = [];
    sales.forEach(s => {
      s.items.forEach(item => {
        const days = GYM_SUBSCRIPTION_DAYS[item.name];
        if (!days) return;
        rows.push({
          saleId: s.id,
          clientName: s.customerName || 'Client Comptoir',
          clientPhone: s.customerPhone,
          type: item.name.replace('Gym - ', ''),
          montant: item.price * item.qty,
          startTimestamp: s.timestamp,
          expiryTimestamp: s.timestamp + days * 86400000,
          cashier: s.caissierName || s.caissier,
        });
      });
    });
    return rows.sort((a, b) => b.startTimestamp - a.startTimestamp);
  }, [sales]);

  const now = Date.now();
  const SOON_MS = 7 * 86400000;
  const getStatus = (expiry: number): 'actif' | 'bientot' | 'expire' => {
    if (expiry < now) return 'expire';
    if (expiry - now < SOON_MS) return 'bientot';
    return 'actif';
  };

  const filtered = subscriptions.filter(sub => {
    const matchesSearch =
      sub.clientName.toLowerCase().includes(search.toLowerCase()) ||
      (sub.clientPhone || '').includes(search);
    const status = getStatus(sub.expiryTimestamp);
    const matchesStatus = statusFilter === 'all' || statusFilter === status;
    return matchesSearch && matchesStatus;
  });

  const activeCount = subscriptions.filter(s => getStatus(s.expiryTimestamp) === 'actif').length;
  const soonCount = subscriptions.filter(s => getStatus(s.expiryTimestamp) === 'bientot').length;
  const expiredCount = subscriptions.filter(s => getStatus(s.expiryTimestamp) === 'expire').length;
  const totalRevenue = subscriptions.reduce((sum, s) => sum + s.montant, 0);

  const StatusBadge: React.FC<{ expiry: number }> = ({ expiry }) => {
    const status = getStatus(expiry);
    if (status === 'actif') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Actif
        </span>
      );
    }
    if (status === 'bientot') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3" />
          Expire bientôt
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3 h-3" />
        Expiré
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E0D3] shadow-xs">
        <div className="flex items-center gap-2 text-[#0F4C4A] text-xs font-bold uppercase tracking-wider mb-1">
          <Dumbbell className="w-4 h-4" />
          <span>Fitness Gym</span>
        </div>
        <h1 className="text-2xl font-bold font-display text-[#1C2321]">Abonnements Gym</h1>
        <p className="text-sm text-[#6B7873] mt-1">
          Synchronisé automatiquement avec la caisse Gym : chaque abonnement vendu apparaît ici, avec sa date
          d'expiration calculée selon la formule choisie.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Abonnés Actifs</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 font-display">{activeCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Expirent bientôt</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-display">{soonCount}</div>
          <p className="text-[11px] text-[#6B7873] mt-1">D'ici 7 jours</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Expirés</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 font-display">{expiredCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Revenu Abonnements</span>
            <div className="w-7 h-7 rounded-lg bg-[#F7F3EC] text-[#B8874B] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F4C4A] font-display">{formatPrice(totalRevenue)}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7873] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou téléphone..."
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl focus:outline-none focus:border-[#0F4C4A]"
          />
        </div>
        <div className="flex items-center bg-[#F7F3EC] p-1 rounded-xl border border-[#E7E0D3] text-xs">
          {(['all', 'actif', 'bientot', 'expire'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                statusFilter === s ? 'bg-[#0F4C4A] text-white shadow-xs' : 'text-[#6B7873] hover:text-[#1C2321]'
              }`}
            >
              {s === 'all' ? 'Tous' : s === 'actif' ? 'Actifs' : s === 'bientot' ? 'Bientôt' : 'Expirés'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E7E0D3] bg-[#F7F3EC]/50">
          <h3 className="text-xs font-bold text-[#1C2321] uppercase tracking-wider flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-[#0F4C4A]" />
            <span>Abonnements ({filtered.length})</span>
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F3EC] text-[#6B7873] flex items-center justify-center mx-auto mb-3">
              <Dumbbell className="w-6 h-6 text-[#B8874B]" />
            </div>
            <h4 className="text-sm font-bold text-[#1C2321]">Aucun abonnement trouvé</h4>
            <p className="text-xs text-[#6B7873] mt-1">
              Les abonnements vendus depuis la caisse Gym apparaîtront ici automatiquement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F3EC]/80 border-b border-[#E7E0D3] text-[#6B7873] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Formule</th>
                  <th className="py-3 px-4">Début</th>
                  <th className="py-3 px-4">Expiration</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                  <th className="py-3 px-4">Caissière</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D3]">
                {filtered.map(sub => (
                  <tr key={`${sub.saleId}-${sub.type}`} className="hover:bg-[#F7F3EC]/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#1C2321]">{sub.clientName}</div>
                      {sub.clientPhone && <div className="text-[10px] text-[#6B7873]">{sub.clientPhone}</div>}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1C2321]">{sub.type}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7873]">
                      {new Date(sub.startTimestamp).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7873]">
                      {new Date(sub.expiryTimestamp).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge expiry={sub.expiryTimestamp} />
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#0F4C4A]">
                      {formatPrice(sub.montant)}
                    </td>
                    <td className="py-3 px-4 text-[#6B7873]">{sub.cashier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
