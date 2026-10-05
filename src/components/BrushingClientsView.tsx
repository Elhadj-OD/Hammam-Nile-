import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sale } from '../types';
import { Users, Search, X, Trophy, Receipt, FileText, Phone } from 'lucide-react';

interface BrushingClientProfile {
  key: string;
  name: string;
  phone?: string;
  visits: Sale[];
  totalSpent: number;
  lastTimestamp: number;
}

// Vue dédiée Brushing : historique des clientes de ce service uniquement
// (recherche par nom ou numéro), et classement de celles qui reviennent le
// plus souvent — sans accès au CRM général des autres départements.
export const BrushingClientsView: React.FC = () => {
  const { sales, settings } = useApp();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BrushingClientProfile | null>(null);

  const formatPrice = (val: number) => `${val.toLocaleString('fr-FR')} ${settings.currency}`;

  const brushingSales = useMemo(
    () => sales.filter(s => s.items.some(i => i.category === 'brushing')),
    [sales]
  );

  const profiles = useMemo(() => {
    const map = new Map<string, BrushingClientProfile>();
    brushingSales.forEach(s => {
      const cleanPhone = (s.customerPhone || '').replace(/\s+/g, '');
      const name = s.customerName?.trim() || 'Client Comptoir';
      const key = cleanPhone || name.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.visits.push(s);
        existing.totalSpent += s.total;
        existing.lastTimestamp = Math.max(existing.lastTimestamp, s.timestamp);
        if (!existing.phone && cleanPhone) existing.phone = s.customerPhone;
      } else {
        map.set(key, {
          key,
          name,
          phone: s.customerPhone,
          visits: [s],
          totalSpent: s.total,
          lastTimestamp: s.timestamp,
        });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => b.visits.length - a.visits.length || b.lastTimestamp - a.lastTimestamp
    );
  }, [brushingSales]);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      p => p.name.toLowerCase().includes(q) || (p.phone || '').replace(/\s+/g, '').includes(q)
    );
  }, [profiles, search]);

  const selectedHistory = useMemo(() => {
    if (!selected) return [];
    return [...selected.visits].sort((a, b) => b.timestamp - a.timestamp);
  }, [selected]);

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto pb-12">
      {/* Top Banner */}
      <div className="water-glass-light rounded-2xl p-6 border border-white/60 shadow-xs">
        <div className="flex items-center gap-2 text-[#004CB7] text-xs font-bold uppercase tracking-wider mb-1">
          <Users className="w-4 h-4" />
          <span>Brushing</span>
        </div>
        <h1 className="text-2xl font-bold font-display text-[#1C2321]">Clients Brushing</h1>
        <p className="text-sm text-[#6B7873] mt-1">
          Historique des clientes de ce service, classées par nombre de visites — recherchez par nom ou numéro.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B7873] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou numéro..."
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl focus:outline-none focus:border-[#004CB7]"
          />
        </div>
      </div>

      {/* Profiles */}
      {filteredProfiles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xs p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F7F3EC] text-[#6B7873] flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-[#B8874B]" />
          </div>
          <h4 className="text-sm font-bold text-[#1C2321]">Aucune cliente trouvée</h4>
          <p className="text-xs text-[#6B7873] mt-1">Les clientes apparaissent ici après leur premier Brushing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((p, idx) => (
            <div
              key={p.key}
              onClick={() => setSelected(p)}
              className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs cursor-pointer hover:border-[#004CB7]/40 hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#004CB7] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#1C2321] truncate">{p.name}</div>
                    {p.phone && (
                      <div className="text-[10px] text-[#6B7873] flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {p.phone}
                      </div>
                    )}
                  </div>
                </div>
                {idx < 3 && (
                  <Trophy
                    className={`w-4 h-4 shrink-0 ${
                      idx === 0 ? 'text-[#B8874B]' : idx === 1 ? 'text-[#6B7873]' : 'text-[#B8874B]/60'
                    }`}
                  />
                )}
              </div>

              <div className="mt-3 space-y-1 text-[11px] text-[#6B7873]">
                <div className="flex justify-between">
                  <span>Visites Brushing</span>
                  <span className="font-bold text-[#004CB7]">{p.visits.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dernière visite</span>
                  <span className="font-bold text-[#1C2321]">{p.visits[p.visits.length - 1]?.date}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[#E7E0D3] mt-1">
                  <span className="font-bold text-[#1C2321]">Total dépensé</span>
                  <span className="font-extrabold text-[#1C2321]">{formatPrice(p.totalSpent)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Client Detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E7E0D3] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D3]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#004CB7] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {selected.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1C2321] font-display">{selected.name}</h3>
                  {selected.phone && <p className="text-[11px] text-[#6B7873]">{selected.phone}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-full text-[#6B7873] hover:text-[#1C2321] hover:bg-[#F7F3EC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#E4EAF7]/60 border border-[#004CB7]/20">
                <div className="text-[10px] font-bold text-[#6B7873] uppercase">Visites Brushing</div>
                <div className="text-sm font-black text-[#004CB7] mt-1">{selected.visits.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F3EC] border border-[#E7E0D3]">
                <div className="text-[10px] font-bold text-[#6B7873] uppercase">Total dépensé</div>
                <div className="text-sm font-black text-[#1C2321] mt-1">{formatPrice(selected.totalSpent)}</div>
              </div>
            </div>

            <div className="mt-4 border border-[#E7E0D3] rounded-xl overflow-hidden">
              <div className="p-3 border-b border-[#E7E0D3] bg-[#F7F3EC]/50">
                <h4 className="text-[10px] font-bold text-[#1C2321] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#004CB7]" />
                  <span>Historique ({selectedHistory.length})</span>
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F7F3EC]/80 border-b border-[#E7E0D3] text-[#6B7873] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Paiement</th>
                      <th className="py-2.5 px-3 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D3]">
                    {selectedHistory.map(s => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-[#1C2321]">{s.date}</div>
                          <div className="text-[10px] text-[#6B7873]">{s.time}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[#6B7873]">
                          {s.payment === 'mobile' ? (
                            <span className="inline-flex items-center gap-1">
                              <Receipt className="w-3 h-3" /> Mobile{s.paymentDetail ? ` (${s.paymentDetail})` : ''}
                            </span>
                          ) : (
                            '💵 Espèces'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-[#1C2321]">
                          {formatPrice(s.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
