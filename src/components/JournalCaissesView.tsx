import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../lib/departments';
import { CaisseDepartment } from '../types';
import {
  ClipboardList,
  Printer,
  Download,
  Calendar,
  Banknote,
  Smartphone,
  Receipt,
} from 'lucide-react';

const DEPT_ORDER: CaisseDepartment[] = [
  'boutique_homme',
  'boutique_femme',
  'spa_massage',
  'coiffure_salon',
  'epilation_traditionnelle',
  'fitness_gym',
  'buvette',
];

interface LedgerRow {
  id: string;
  time: string;
  type: string;
  client: string;
  payment: string;
  amount: number;
}

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const JournalCaissesView: React.FC = () => {
  const { users, sales, laveurCommissions, settings } = useApp();
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const dayStart = new Date(`${selectedDate}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  const daySales = sales.filter(s => s.timestamp >= dayStart && s.timestamp < dayEnd);
  const dayCommissions = laveurCommissions.filter(c => c.timestamp >= dayStart && c.timestamp < dayEnd);

  const caissieres = useMemo(
    () =>
      [...users]
        .filter(u => u.role === 'caissier')
        .sort((a, b) => {
          const ai = a.department ? DEPT_ORDER.indexOf(a.department) : 99;
          const bi = b.department ? DEPT_ORDER.indexOf(b.department) : 99;
          return ai - bi;
        }),
    [users]
  );

  const sections = caissieres.map(u => {
    const rows: LedgerRow[] = [];

    daySales
      .filter(s => s.caissier.toLowerCase() === u.username.toLowerCase())
      .forEach(s => {
        rows.push({
          id: `V${s.id}`,
          time: s.time,
          type: 'Vente',
          client: s.customerName || s.customerPhone || 'Comptoir',
          payment: s.paymentDetail || (s.payment === 'cash' ? 'Espèces' : 'Mobile Money'),
          amount: s.total,
        });
      });

    dayCommissions
      .filter(c => c.recordedBy.toLowerCase() === u.username.toLowerCase())
      .forEach(c => {
        rows.push({
          id: `H${c.id}`,
          time: c.time,
          type: `Hammam — ${c.laveurName}`,
          client: c.customerPhone || '-',
          payment: c.paymentDetail || (c.payment === 'cash' ? 'Espèces' : 'Mobile Money'),
          amount: c.price + c.bonus + (c.boutiqueTotal || 0),
        });
      });

    rows.sort((a, b) => a.time.localeCompare(b.time));
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    const dept = u.department ? DEPARTMENTS[u.department] : null;

    return { user: u, dept, rows, total };
  });

  // Ventes rattachées à un identifiant qui ne correspond à aucune caissière
  // connue (compte supprimé depuis, ou vente passée par la gérante) — on ne
  // les fait jamais disparaître silencieusement.
  const knownUsernames = new Set(caissieres.map(u => u.username.toLowerCase()));
  const otherRows: LedgerRow[] = [
    ...daySales
      .filter(s => !knownUsernames.has(s.caissier.toLowerCase()))
      .map(s => ({
        id: `V${s.id}`,
        time: s.time,
        type: 'Vente',
        client: s.customerName || s.customerPhone || 'Comptoir',
        payment: s.paymentDetail || (s.payment === 'cash' ? 'Espèces' : 'Mobile Money'),
        amount: s.total,
      })),
    ...dayCommissions
      .filter(c => !knownUsernames.has(c.recordedBy.toLowerCase()))
      .map(c => ({
        id: `H${c.id}`,
        time: c.time,
        type: `Hammam — ${c.laveurName}`,
        client: c.customerPhone || '-',
        payment: c.paymentDetail || (c.payment === 'cash' ? 'Espèces' : 'Mobile Money'),
        amount: c.price + c.bonus + (c.boutiqueTotal || 0),
      })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const grandTotal = sections.reduce((sum, s) => sum + s.total, 0) + otherRows.reduce((sum, r) => sum + r.amount, 0);
  const totalCash =
    daySales.filter(s => s.payment === 'cash').reduce((sum, s) => sum + s.total, 0) +
    dayCommissions.filter(c => c.payment === 'cash').reduce((sum, c) => sum + c.price + c.bonus + (c.boutiqueTotal || 0), 0);
  const totalMobile = grandTotal - totalCash;
  const totalTransactions = sections.reduce((sum, s) => sum + s.rows.length, 0) + otherRows.length;

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    let csv = `Caisse,N°,Heure,Type,Client,Paiement,Montant (${settings.currency})\n`;
    sections.forEach(sec => {
      const caisseLabel = sec.dept ? `${sec.dept.icon} ${sec.dept.label}` : sec.user.name;
      sec.rows.forEach(r => {
        csv += `"${caisseLabel}","${r.id}","${r.time}","${r.type}","${r.client}","${r.payment}","${r.amount}"\n`;
      });
    });
    otherRows.forEach(r => {
      csv += `"Non classé","${r.id}","${r.time}","${r.type}","${r.client}","${r.payment}","${r.amount}"\n`;
    });

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal-caisses-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F4C4A] mb-1">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Vérification & Contrôle</span>
          </div>
          <h2 className="text-xl font-bold text-[#1C2321] font-display">Journal des Caisses</h2>
          <p className="text-xs text-[#6B7873] mt-0.5">
            Détail de chaque vente encaissée, caisse par caisse, pour vérification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-[#6B7873] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-xs font-bold text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
            />
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-[#E4E9E1] hover:bg-[#0F4C4A] hover:text-white text-[#0F4C4A] border border-[#0F4C4A]/20 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Enregistrer (CSV)</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-[#0A3735] hover:bg-[#0F4C4A] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E7E0D3] shadow-xs">
          <div className="text-xs text-[#6B7873] font-medium">Total Encaissé</div>
          <div className="text-xl font-bold text-[#0F4C4A] mt-1">
            {grandTotal.toLocaleString()} {settings.currency}
          </div>
          <div className="text-[11px] text-[#6B7873] mt-1">{totalTransactions} transaction(s)</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-[#6B7873] font-medium">
            <Banknote className="w-3.5 h-3.5" />
            <span>Total Espèces</span>
          </div>
          <div className="text-xl font-bold text-[#1C2321] mt-1">
            {totalCash.toLocaleString()} {settings.currency}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-[#6B7873] font-medium">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Total Mobile Money</span>
          </div>
          <div className="text-xl font-bold text-[#1C2321] mt-1">
            {totalMobile.toLocaleString()} {settings.currency}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-[#6B7873] font-medium">
            <Receipt className="w-3.5 h-3.5" />
            <span>Caisses actives</span>
          </div>
          <div className="text-xl font-bold text-[#1C2321] mt-1">
            {sections.filter(s => s.rows.length > 0).length} / {sections.length}
          </div>
        </div>
      </div>

      {/* Une section par caisse */}
      <div className="space-y-4">
        {sections.map(sec => (
          <div
            key={sec.user.username}
            className="bg-white rounded-2xl border border-[#E7E0D3] overflow-hidden shadow-xs print-break-inside-avoid"
          >
            <div className="p-4 border-b border-[#E7E0D3] flex flex-wrap items-center justify-between gap-2 bg-[#F7F3EC]/60">
              <div className="flex items-center gap-2">
                <span className="text-lg">{sec.dept?.icon || '🏪'}</span>
                <div>
                  <h3 className="font-bold text-sm text-[#1C2321]">
                    {sec.dept?.label || 'Caisse'} — {sec.user.name}
                  </h3>
                  <span className="text-[11px] text-[#6B7873] font-mono">@{sec.user.username}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[#6B7873]">Total caisse</div>
                <div className="text-base font-bold text-[#0F4C4A]">
                  {sec.total.toLocaleString()} {settings.currency}
                </div>
              </div>
            </div>

            {sec.rows.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B7873]">Aucune vente ce jour</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F3EC]/40 text-[#6B7873] font-semibold border-b border-[#E7E0D3]">
                    <tr>
                      <th className="py-2.5 px-4">N°</th>
                      <th className="py-2.5 px-4">Heure</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Client</th>
                      <th className="py-2.5 px-4">Paiement</th>
                      <th className="py-2.5 px-4 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D3]/60">
                    {sec.rows.map(r => (
                      <tr key={r.id} className="hover:bg-[#F7F3EC]/40 transition">
                        <td className="py-2.5 px-4 font-mono text-[#6B7873]">{r.id}</td>
                        <td className="py-2.5 px-4">{r.time}</td>
                        <td className="py-2.5 px-4">{r.type}</td>
                        <td className="py-2.5 px-4">{r.client}</td>
                        <td className="py-2.5 px-4">{r.payment}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-[#1C2321]">
                          {r.amount.toLocaleString()} {settings.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {otherRows.length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-300 overflow-hidden shadow-xs print-break-inside-avoid">
            <div className="p-4 border-b border-amber-200 bg-amber-50">
              <h3 className="font-bold text-sm text-amber-900">
                Non classé (identifiant sans caisse connue)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F3EC]/40 text-[#6B7873] font-semibold border-b border-[#E7E0D3]">
                  <tr>
                    <th className="py-2.5 px-4">N°</th>
                    <th className="py-2.5 px-4">Heure</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Client</th>
                    <th className="py-2.5 px-4">Paiement</th>
                    <th className="py-2.5 px-4 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E0D3]/60">
                  {otherRows.map(r => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-4 font-mono text-[#6B7873]">{r.id}</td>
                      <td className="py-2.5 px-4">{r.time}</td>
                      <td className="py-2.5 px-4">{r.type}</td>
                      <td className="py-2.5 px-4">{r.client}</td>
                      <td className="py-2.5 px-4">{r.payment}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#1C2321]">
                        {r.amount.toLocaleString()} {settings.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
