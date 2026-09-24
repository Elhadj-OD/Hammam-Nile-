import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CLIENT_TYPE_GRID } from '../lib/laveurCommissions';
import { ClientType, LaveurCommission } from '../types';
import {
  Users,
  UserPlus,
  Search,
  X,
  Trash2,
  Wallet,
  Gift,
  TrendingUp,
  FileText,
  AlertCircle,
  ChevronRight,
  Percent,
} from 'lucide-react';

interface LaveurProfile {
  laveurId: number | null;
  name: string;
  count: number;
  commission: number;
  bonus: number;
  total: number;
  lastTimestamp: number;
}

export const LaveursView: React.FC = () => {
  const { laveurs, addLaveur, deleteLaveur, laveurCommissions, settings } = useApp();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLaveurName, setNewLaveurName] = useState('');
  const [addError, setAddError] = useState('');
  const [selectedLaveur, setSelectedLaveur] = useState<string | null>(null);
  const [detailPeriod, setDetailPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

  const formatPrice = (val: number) => `${val.toLocaleString('fr-FR')} ${settings.currency}`;

  // Fiche par laveur : union du registre (laveurs) et des noms utilisés
  // dans l'historique des services (au cas où un service a été enregistré
  // avant que le laveur soit déclaré dans le registre).
  const profiles = useMemo(() => {
    const map = new Map<string, LaveurProfile>();

    laveurs.forEach(l => {
      map.set(l.name.toLowerCase(), {
        laveurId: l.id,
        name: l.name,
        count: 0,
        commission: 0,
        bonus: 0,
        total: 0,
        lastTimestamp: 0,
      });
    });

    laveurCommissions.forEach(c => {
      const key = c.laveurName.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.commission += c.commission;
        existing.bonus += c.bonus;
        existing.total += c.total;
        existing.lastTimestamp = Math.max(existing.lastTimestamp, c.timestamp);
      } else {
        map.set(key, {
          laveurId: null,
          name: c.laveurName,
          count: 1,
          commission: c.commission,
          bonus: c.bonus,
          total: c.total,
          lastTimestamp: c.timestamp,
        });
      }
    });

    return Array.from(map.values())
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [laveurs, laveurCommissions, search]);

  const handleAddLaveur = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addLaveur(newLaveurName);
    if (!res.success) {
      setAddError(res.error || "Impossible d'ajouter ce laveur.");
      return;
    }
    setShowAddModal(false);
    setNewLaveurName('');
    setAddError('');
  };

  const handleDeleteLaveur = (p: LaveurProfile) => {
    if (p.laveurId === null) return;
    if (
      window.confirm(
        `Retirer ${p.name} du registre ? Son historique de services (${p.count} service(s)) reste conservé.`
      )
    ) {
      deleteLaveur(p.laveurId);
    }
  };

  const selectedProfile = profiles.find(p => p.name === selectedLaveur) || null;

  const detailHistory = useMemo(() => {
    if (!selectedLaveur) return [];
    const now = Date.now();
    return laveurCommissions
      .filter(c => c.laveurName.toLowerCase() === selectedLaveur.toLowerCase())
      .filter(c => {
        if (detailPeriod === 'today') return now - c.timestamp < 86400000;
        if (detailPeriod === 'week') return now - c.timestamp < 86400000 * 7;
        if (detailPeriod === 'month') return now - c.timestamp < 86400000 * 30;
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [laveurCommissions, selectedLaveur, detailPeriod]);

  const detailTotals = detailHistory.reduce(
    (acc, c) => ({
      commission: acc.commission + c.commission,
      bonus: acc.bonus + c.bonus,
      total: acc.total + c.total,
    }),
    { commission: 0, bonus: 0, total: 0 }
  );

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E0D3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0F4C4A] text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Laveurs</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-[#1C2321]">Profils des Laveurs</h1>
          <p className="text-sm text-[#6B7873] mt-1">
            Chaque laveur (juste un nom, pas de compte) avec ce qu'il a gagné : commissions fixes + bonus. Cliquez sur une fiche pour voir le détail de ses services.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="bg-[#0F4C4A] hover:bg-[#0A3735] text-white px-5 py-3 rounded-full font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Ajouter un Laveur</span>
        </button>
      </div>

      {/* Grille de commission (référence : le pourcentage/montant par type de client) */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xs p-5">
        <h3 className="text-xs font-bold text-[#6B7873] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Percent className="w-4 h-4 text-[#B8874B]" />
          <span>Grille de Commission (par service)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(CLIENT_TYPE_GRID) as ClientType[]).map(ct => {
            const g = CLIENT_TYPE_GRID[ct];
            const pct = Math.round((g.commission / g.price) * 100);
            return (
              <div key={ct} className="p-3.5 rounded-xl border border-[#E7E0D3] bg-[#F7F3EC]/70">
                <div className="text-xs font-bold text-[#1C2321]">{g.label}</div>
                <div className="mt-2 flex items-baseline justify-between text-[11px] text-[#6B7873]">
                  <span>Prix service</span>
                  <span className="font-bold text-[#1C2321]">{formatPrice(g.price)}</span>
                </div>
                <div className="flex items-baseline justify-between text-[11px] text-[#6B7873]">
                  <span>Commission laveur</span>
                  <span className="font-bold text-[#0F4C4A]">
                    {formatPrice(g.commission)} <span className="text-[#B8874B]">({pct}%)</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B7873] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un laveur..."
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl focus:outline-none focus:border-[#0F4C4A]"
          />
        </div>
      </div>

      {/* Profiles Grid */}
      {profiles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xs p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F7F3EC] text-[#6B7873] flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-[#B8874B]" />
          </div>
          <h4 className="text-sm font-bold text-[#1C2321]">Aucun laveur trouvé</h4>
          <p className="text-xs text-[#6B7873] mt-1">Cliquez sur « Ajouter un Laveur » pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(p => (
            <div
              key={p.name}
              onClick={() => {
                setSelectedLaveur(p.name);
                setDetailPeriod('all');
              }}
              className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs cursor-pointer hover:border-[#0F4C4A]/40 hover:shadow-sm transition group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#0F4C4A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#1C2321] truncate">{p.name}</div>
                    <div className="text-[10px] text-[#6B7873]">{p.count} service(s)</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#6B7873] group-hover:text-[#0F4C4A] shrink-0" />
              </div>

              <div className="mt-3 space-y-1 text-[11px] text-[#6B7873]">
                <div className="flex justify-between">
                  <span>Commissions</span>
                  <span className="font-bold text-[#0F4C4A]">{formatPrice(p.commission)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bonus</span>
                  <span className="font-bold text-[#B8874B]">{formatPrice(p.bonus)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[#E7E0D3] mt-1">
                  <span className="font-bold text-[#1C2321]">Total gagné</span>
                  <span className="font-extrabold text-[#1C2321]">{formatPrice(p.total)}</span>
                </div>
              </div>

              {p.laveurId !== null && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteLaveur(p);
                  }}
                  title="Retirer du registre"
                  className="mt-3 w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Retirer du registre</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Laveur */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E0D3]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D3]">
              <h3 className="font-bold text-base text-[#1C2321] font-display">Ajouter un Laveur</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setNewLaveurName('');
                  setAddError('');
                }}
                className="p-1.5 rounded-lg text-[#6B7873] hover:text-[#1C2321] hover:bg-[#F7F3EC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddLaveur} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">Nom du laveur *</label>
                <input
                  type="text"
                  value={newLaveurName}
                  onChange={e => setNewLaveurName(e.target.value)}
                  placeholder="ex: Mohamed"
                  required
                  autoFocus
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewLaveurName('');
                    setAddError('');
                  }}
                  className="flex-1 py-2.5 bg-[#F7F3EC] text-[#1C2321] border border-[#E7E0D3] rounded-xl text-xs font-bold hover:bg-[#E4E9E1] transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0F4C4A] text-white rounded-xl text-xs font-bold hover:bg-[#0A3735] transition shadow-xs cursor-pointer"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Laveur Detail */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E7E0D3] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D3]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0F4C4A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedProfile.name.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="font-bold text-base text-[#1C2321] font-display">{selectedProfile.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLaveur(null)}
                className="p-1.5 rounded-lg text-[#6B7873] hover:text-[#1C2321] hover:bg-[#F7F3EC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Period filter */}
            <div className="mt-4 flex items-center bg-[#F7F3EC] p-1 rounded-xl border border-[#E7E0D3] text-xs w-fit">
              {(['today', 'week', 'month', 'all'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDetailPeriod(p)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    detailPeriod === p ? 'bg-[#0F4C4A] text-white shadow-xs' : 'text-[#6B7873] hover:text-[#1C2321]'
                  }`}
                >
                  {p === 'today' ? 'Jour' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Tout'}
                </button>
              ))}
            </div>

            {/* KPI mini */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#E4E9E1]/60 border border-[#0F4C4A]/20">
                <div className="text-[10px] font-bold text-[#6B7873] uppercase flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Commissions
                </div>
                <div className="text-sm font-black text-[#0F4C4A] mt-1">{formatPrice(detailTotals.commission)}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F3EC] border border-[#E7E0D3]">
                <div className="text-[10px] font-bold text-[#6B7873] uppercase flex items-center gap-1">
                  <Gift className="w-3 h-3" /> Bonus
                </div>
                <div className="text-sm font-black text-[#B8874B] mt-1">{formatPrice(detailTotals.bonus)}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F3EC] border border-[#E7E0D3]">
                <div className="text-[10px] font-bold text-[#6B7873] uppercase flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Total
                </div>
                <div className="text-sm font-black text-[#1C2321] mt-1">{formatPrice(detailTotals.total)}</div>
              </div>
            </div>

            {/* History table */}
            <div className="mt-4 border border-[#E7E0D3] rounded-xl overflow-hidden">
              <div className="p-3 border-b border-[#E7E0D3] bg-[#F7F3EC]/50">
                <h4 className="text-[10px] font-bold text-[#1C2321] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#0F4C4A]" />
                  <span>Détail des Services ({detailHistory.length})</span>
                </h4>
              </div>
              {detailHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B7873]">Aucun service sur cette période.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F7F3EC]/80 border-b border-[#E7E0D3] text-[#6B7873] font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Commission</th>
                        <th className="py-2.5 px-3 text-right">Bonus</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E0D3]">
                      {detailHistory.map((c: LaveurCommission) => (
                        <tr key={c.id}>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-[#1C2321]">{c.date}</div>
                            <div className="text-[10px] text-[#6B7873]">{c.time}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E4E9E1] text-[#0F4C4A]">
                              {CLIENT_TYPE_GRID[c.clientType].label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#0F4C4A]">
                            {formatPrice(c.commission)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-[#B8874B]">
                            {c.bonus > 0 ? formatPrice(c.bonus) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-[#1C2321]">
                            {formatPrice(c.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
