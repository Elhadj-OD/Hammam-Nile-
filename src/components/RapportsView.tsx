import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Sale } from '../types';
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Download,
  Printer,
  DollarSign,
  ShoppingBag,
  Users,
  Wallet,
  Smartphone,
  CalendarDays,
  Clock,
  ArrowUpRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';

type StatsPeriod = 'daily' | 'weekly' | 'monthly';

export const RapportsView: React.FC = () => {
  const { sales, settings, users } = useApp();

  // Period Toggle: daily, weekly, monthly
  const [period, setPeriod] = useState<StatsPeriod>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const formatPrice = (val: number) => {
    return `${val.toLocaleString('fr-FR')} ${settings.currency}`;
  };

  // Filter sales according to period
  const filteredSales = useMemo(() => {
    if (period === 'daily') {
      const [year, month, day] = selectedDate.split('-');
      const targetDateFormatted = `${parseInt(day)}/${parseInt(month)}/${year}`;
      const targetDateZeroPadded = `${day}/${month}/${year}`;

      return sales.filter(s => {
        if (!s.date) return false;
        // Support both "12/09/2026" or locale string formats
        return s.date === targetDateFormatted || s.date === targetDateZeroPadded;
      });
    }

    if (period === 'weekly') {
      // 7 days ending on selected date
      const endTimestamp = new Date(selectedDate).setHours(23, 59, 59, 999);
      const startTimestamp = endTimestamp - 7 * 24 * 60 * 60 * 1000;

      return sales.filter(s => {
        const time = s.timestamp || (s.date ? new Date(s.date).getTime() : 0);
        return time >= startTimestamp && time <= endTimestamp;
      });
    }

    if (period === 'monthly') {
      const [year, month] = selectedMonth.split('-').map(Number);
      return sales.filter(s => {
        if (s.timestamp) {
          const d = new Date(s.timestamp);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        }
        // Fallback parse "DD/MM/YYYY"
        const parts = s.date.split('/');
        if (parts.length === 3) {
          return parseInt(parts[2]) === year && parseInt(parts[1]) === month;
        }
        return false;
      });
    }

    return sales;
  }, [sales, period, selectedDate, selectedMonth]);

  // Aggregate Metrics
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalTransactions = filteredSales.length;
  const averageBasket = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  const cashSales = filteredSales.filter(s => s.payment === 'cash');
  const cashTotal = cashSales.reduce((sum, s) => sum + s.total, 0);

  const mobileSales = filteredSales.filter(s => s.payment === 'mobile');
  const mobileTotal = mobileSales.reduce((sum, s) => sum + s.total, 0);

  // Cashier Breakdown
  const salesByCashier = useMemo(() => {
    const map: Record<string, { name: string; count: number; total: number; avatar?: string }> = {};

    filteredSales.forEach(s => {
      const cKey = (s.caissier || 'caissier').toLowerCase();
      if (!map[cKey]) {
        const userObj = users.find(u => u.username.toLowerCase() === cKey);
        map[cKey] = {
          name: s.caissierName || userObj?.name || s.caissier,
          count: 0,
          total: 0,
          avatar: userObj?.avatar,
        };
      }
      map[cKey].count += 1;
      map[cKey].total += s.total;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredSales, users]);

  // Top Products Sold
  const topProducts = useMemo(() => {
    const map: Record<string, { id: number; name: string; qty: number; total: number; emoji?: string; image?: string }> = {};

    filteredSales.forEach(s => {
      s.items.forEach(item => {
        const key = item.name;
        if (!map[key]) {
          map[key] = {
            id: item.id,
            name: item.name,
            qty: 0,
            total: 0,
            emoji: item.emoji,
            image: item.image,
          };
        }
        map[key].qty += item.qty;
        map[key].total += item.qty * item.price;
      });
    });

    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredSales]);

  // Hourly Breakdown for Daily View
  const hourlyData = useMemo(() => {
    if (period !== 'daily') return [];
    const hours = [
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
      '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
    ];

    return hours.map(h => {
      const hNum = parseInt(h.split(':')[0]);
      const salesInHour = filteredSales.filter(s => {
        if (!s.time) return false;
        const sHour = parseInt(s.time.split(':')[0]);
        return sHour === hNum;
      });
      const sum = salesInHour.reduce((acc, s) => acc + s.total, 0);
      const count = salesInHour.length;
      return { hour: h, sum, count };
    });
  }, [filteredSales, period]);

  // Weekly Days Breakdown
  const weeklyDaysData = useMemo(() => {
    if (period !== 'weekly') return [];
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const result: Record<number, { day: string; sum: number; count: number }> = {};

    for (let i = 0; i < 7; i++) {
      result[i] = { day: days[i], sum: 0, count: 0 };
    }

    filteredSales.forEach(s => {
      const d = s.timestamp ? new Date(s.timestamp) : new Date();
      const dayIdx = d.getDay();
      result[dayIdx].sum += s.total;
      result[dayIdx].count += 1;
    });

    // Reorder from Lundi (1) to Dimanche (0)
    return [1, 2, 3, 4, 5, 6, 0].map(idx => result[idx]);
  }, [filteredSales, period]);

  // Monthly 4-Week Breakdown
  const monthlyWeeksData = useMemo(() => {
    if (period !== 'monthly') return [];
    const weeks = [
      { label: 'Semaine 1 (1-7)', sum: 0, count: 0 },
      { label: 'Semaine 2 (8-14)', sum: 0, count: 0 },
      { label: 'Semaine 3 (15-21)', sum: 0, count: 0 },
      { label: 'Semaine 4 (22-31)', sum: 0, count: 0 },
    ];

    filteredSales.forEach(s => {
      const dateNum = s.timestamp ? new Date(s.timestamp).getDate() : parseInt(s.date.split('/')[0]) || 1;
      if (dateNum <= 7) {
        weeks[0].sum += s.total;
        weeks[0].count += 1;
      } else if (dateNum <= 14) {
        weeks[1].sum += s.total;
        weeks[1].count += 1;
      } else if (dateNum <= 21) {
        weeks[2].sum += s.total;
        weeks[2].count += 1;
      } else {
        weeks[3].sum += s.total;
        weeks[3].count += 1;
      }
    });

    return weeks;
  }, [filteredSales, period]);

  const maxChartValue = useMemo(() => {
    if (period === 'daily') {
      const max = Math.max(...hourlyData.map(d => d.sum), 1);
      return max;
    }
    if (period === 'weekly') {
      const max = Math.max(...weeklyDaysData.map(d => d.sum), 1);
      return max;
    }
    if (period === 'monthly') {
      const max = Math.max(...monthlyWeeksData.map(d => d.sum), 1);
      return max;
    }
    return 100000;
  }, [period, hourlyData, weeklyDaysData, monthlyWeeksData]);

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = `N° Vente,Date,Heure,Caissière,Client,Règlement,Montant (${settings.currency})\n`;
    filteredSales.forEach(s => {
      csvContent += `"${s.id}","${s.date}","${s.time}","${s.caissierName || s.caissier}","${s.customerName || 'Comptoir'}","${s.paymentDetail || s.payment}","${s.total}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `statistiques-ventes-${period}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto pb-12">
      {/* Header & Main Toggles */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E0D3] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0F4C4A] text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Tableau de Bord Analytique</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-[#1C2321]">
            Statistiques des Ventes
          </h1>
          <p className="text-sm text-[#6B7873] mt-1">
            Suivi des recettes, panier moyen, ventes par caissière et répartition des encaissements.
          </p>
        </div>

        {/* 3 PERIOD TOGGLES: Journalière, Hebdomadaire, Mensuelle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#F7F3EC] p-1.5 rounded-2xl border border-[#E7E0D3] flex items-center gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => setPeriod('daily')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                period === 'daily'
                  ? 'bg-[#0F4C4A] text-white shadow-xs'
                  : 'text-[#6B7873] hover:text-[#1C2321]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Journalière</span>
            </button>

            <button
              type="button"
              onClick={() => setPeriod('weekly')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                period === 'weekly'
                  ? 'bg-[#0F4C4A] text-white shadow-xs'
                  : 'text-[#6B7873] hover:text-[#1C2321]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Hebdomadaire</span>
            </button>

            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                period === 'monthly'
                  ? 'bg-[#0F4C4A] text-white shadow-xs'
                  : 'text-[#6B7873] hover:text-[#1C2321]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Mensuelle</span>
            </button>
          </div>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="p-2.5 bg-[#F7F3EC] hover:bg-[#E7E0D3] text-[#1C2321] rounded-xl text-xs font-bold transition border border-[#E7E0D3] cursor-pointer flex items-center gap-1.5"
            title="Exporter les ventes en format CSV / Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter Context Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E7E0D3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#0F4C4A]" />
          <span className="font-bold text-[#1C2321]">
            {period === 'daily'
              ? 'Période analysée : Ventes du Jour'
              : period === 'weekly'
              ? 'Période analysée : 7 Derniers Jours'
              : 'Période analysée : Vue Mensuelle Complète'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {period === 'daily' || period === 'weekly' ? (
            <div className="flex items-center gap-2">
              <span className="text-[#6B7873]">Date de référence :</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-[#F7F3EC] border border-[#E7E0D3] rounded-lg px-2.5 py-1 text-xs font-bold text-[#1C2321] cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[#6B7873]">Mois analysé :</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-[#F7F3EC] border border-[#E7E0D3] rounded-lg px-2.5 py-1 text-xs font-bold text-[#1C2321] cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Chiffre d'Affaires</span>
            <div className="w-7 h-7 rounded-lg bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-[#0F4C4A]">
            {formatPrice(totalRevenue)}
          </div>
          <div className="text-[11px] text-[#6B7873] mt-1 flex items-center gap-1">
            <span>Sur</span>
            <strong className="text-[#1C2321]">{totalTransactions} transactions</strong>
          </div>
        </div>

        {/* Panier Moyen */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Panier Moyen</span>
            <div className="w-7 h-7 rounded-lg bg-[#F7F3EC] text-[#B8874B] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-[#1C2321]">
            {formatPrice(averageBasket)}
          </div>
          <div className="text-[11px] text-[#6B7873] mt-1">
            Recette moyenne par client
          </div>
        </div>

        {/* Espèces */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Règlements Espèces</span>
            <div className="w-7 h-7 rounded-lg bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-[#1C2321]">
            {formatPrice(cashTotal)}
          </div>
          <div className="text-[11px] text-[#6B7873] mt-1">
            {totalRevenue > 0 ? Math.round((cashTotal / totalRevenue) * 100) : 0}% du chiffre d'affaires
          </div>
        </div>

        {/* Mobile Money */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
            <span>Mobile (Bankily / Masrivi)</span>
            <div className="w-7 h-7 rounded-lg bg-[#F7F3EC] text-[#B8874B] flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-[#B8874B]">
            {formatPrice(mobileTotal)}
          </div>
          <div className="text-[11px] text-[#6B7873] mt-1">
            {totalRevenue > 0 ? Math.round((mobileTotal / totalRevenue) * 100) : 0}% du chiffre d'affaires
          </div>
        </div>
      </div>

      {/* Main Graph & Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Temporal Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E7E0D3] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-[#E7E0D3]">
            <div>
              <h3 className="font-bold font-display text-base text-[#1C2321]">
                {period === 'daily'
                  ? 'Évolution des Recettes par Tranche Horaire'
                  : period === 'weekly'
                  ? 'Ventes par Jour de la Semaine'
                  : 'Évolution Hebdomadaire du Mois'}
              </h3>
              <p className="text-xs text-[#6B7873] mt-0.5">
                {period === 'daily'
                  ? 'Activité de la caisse heure par heure de 09:00 à 21:00'
                  : period === 'weekly'
                  ? 'Répartition de la performance sur les 7 jours'
                  : 'Volume d’encaissement par semaine calendaire'}
              </p>
            </div>
            <span className="text-xs font-bold bg-[#E4E9E1] text-[#0F4C4A] px-3 py-1 rounded-full">
              {formatPrice(totalRevenue)}
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-6 pb-2">
            {period === 'daily' && (
              <div className="space-y-3">
                {hourlyData.map(h => {
                  const percentage = maxChartValue > 0 ? Math.round((h.sum / maxChartValue) * 100) : 0;
                  return (
                    <div key={h.hour} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-mono text-[#6B7873] shrink-0">{h.hour}</span>
                      <div className="flex-1 bg-[#F7F3EC] h-6 rounded-lg overflow-hidden flex items-center px-2">
                        <div
                          className="bg-[#0F4C4A] h-full rounded-md transition-all duration-300"
                          style={{ width: `${Math.max(percentage > 0 ? 2 : 0, percentage)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right font-bold text-[#1C2321] truncate">
                        {h.sum > 0 ? formatPrice(h.sum) : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {period === 'weekly' && (
              <div className="grid grid-cols-7 gap-2 pt-4 items-end h-56">
                {weeklyDaysData.map(d => {
                  const heightPercent = maxChartValue > 0 ? Math.round((d.sum / maxChartValue) * 100) : 0;
                  return (
                    <div key={d.day} className="flex flex-col items-center h-full justify-end group">
                      <div className="text-[10px] font-bold text-[#0F4C4A] mb-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                        {formatPrice(d.sum)}
                      </div>
                      <div className="w-full bg-[#F7F3EC] rounded-xl flex items-end h-36 overflow-hidden p-1">
                        <div
                          className="w-full bg-[#0F4C4A] hover:bg-[#B8874B] rounded-lg transition-all duration-300"
                          style={{ height: `${Math.max(heightPercent > 0 ? 8 : 4, heightPercent)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[#1C2321] mt-2 truncate w-full text-center">
                        {d.day.substring(0, 3)}
                      </span>
                      <span className="text-[10px] text-[#6B7873]">{d.count} v.</span>
                    </div>
                  );
                })}
              </div>
            )}

            {period === 'monthly' && (
              <div className="space-y-4 pt-2">
                {monthlyWeeksData.map(w => {
                  const percent = maxChartValue > 0 ? Math.round((w.sum / maxChartValue) * 100) : 0;
                  return (
                    <div key={w.label} className="bg-[#F7F3EC] p-3.5 rounded-xl border border-[#E7E0D3]">
                      <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                        <span className="text-[#1C2321]">{w.label}</span>
                        <span className="text-[#0F4C4A]">{formatPrice(w.sum)}</span>
                      </div>
                      <div className="w-full bg-white h-3 rounded-full overflow-hidden border border-[#E7E0D3]/50">
                        <div
                          className="bg-[#0F4C4A] h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(percent > 0 ? 3 : 0, percent)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-[#6B7873] mt-1">
                        <span>{w.count} transactions enregistrées</span>
                        <span>{percent}% du mois</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Performance Caissières */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E0D3] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E0D3]">
              <div>
                <h3 className="font-bold font-display text-base text-[#1C2321]">
                  Ventes par Caissière
                </h3>
                <p className="text-xs text-[#6B7873] mt-0.5">
                  Performance de l'équipe sur la période
                </p>
              </div>
              <Users className="w-4 h-4 text-[#0F4C4A]" />
            </div>

            {/* List of cashiers */}
            <div className="space-y-3 mt-4">
              {salesByCashier.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6B7873]">
                  Aucune vente enregistrée sur cette période
                </div>
              ) : (
                salesByCashier.map(c => {
                  const percent = totalRevenue > 0 ? Math.round((c.total / totalRevenue) * 100) : 0;
                  const isPhoto = c.avatar && (c.avatar.startsWith('data:') || c.avatar.startsWith('http'));

                  return (
                    <div
                      key={c.name}
                      className="p-3 bg-[#F7F3EC] rounded-xl border border-[#E7E0D3] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isPhoto ? (
                          <img
                            src={c.avatar}
                            alt={c.name}
                            className="w-9 h-9 rounded-full object-cover border border-[#E7E0D3] shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#0F4C4A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {c.avatar || c.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#1C2321] truncate">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-[#6B7873]">
                            {c.count} vente{c.count > 1 ? 's' : ''} ({percent}%)
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-xs text-[#0F4C4A]">
                          {formatPrice(c.total)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Mode de règlement summary */}
          <div className="mt-6 pt-4 border-t border-[#E7E0D3]">
            <div className="text-xs font-bold text-[#1C2321] mb-2.5">
              Modes de Règlement Encaissés
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-[#6B7873]">
                <span className="flex items-center gap-1.5">
                  <span>💵</span>
                  <span>Espèces</span>
                </span>
                <strong className="text-[#1C2321]">{formatPrice(cashTotal)}</strong>
              </div>
              <div className="flex justify-between items-center text-[#6B7873]">
                <span className="flex items-center gap-1.5">
                  <span>📱</span>
                  <span>Mobile Money</span>
                </span>
                <strong className="text-[#1C2321]">{formatPrice(mobileTotal)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Products Sold */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E7E0D3] mb-4">
          <div>
            <h3 className="font-bold font-display text-base text-[#1C2321]">
              Top 5 des Produits les Plus Vendus
            </h3>
            <p className="text-xs text-[#6B7873] mt-0.5">
              Articles phares ayant généré le plus de volume sur la période sélectionnée
            </p>
          </div>
          <ShoppingBag className="w-4 h-4 text-[#0F4C4A]" />
        </div>

        {topProducts.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6B7873]">
            Aucune vente enregistrée pour afficher le classement
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {topProducts.map((p, idx) => (
              <div
                key={p.name}
                className="bg-[#F7F3EC] p-3.5 rounded-xl border border-[#E7E0D3] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-5 h-5 rounded-full bg-[#0F4C4A] text-white text-[10px] font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#0F4C4A]">
                      {p.qty} vendus
                    </span>
                  </div>

                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl mx-auto mb-2 border border-[#E7E0D3] overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.emoji || '🧼'
                    )}
                  </div>

                  <div className="font-bold text-xs text-[#1C2321] text-center line-clamp-2 min-h-[32px]">
                    {p.name}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#E7E0D3] text-center">
                  <span className="font-bold text-xs text-[#B8874B]">
                    {formatPrice(p.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Sales History on Period */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E7E0D3] flex items-center justify-between">
          <h3 className="font-bold font-display text-base text-[#1C2321]">
            Détail des Transactions ({filteredSales.length})
          </h3>
          <span className="text-xs text-[#6B7873]">
            Historique complet des tickets sur la période
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6B7873]">
            Aucune transaction à afficher pour cette période.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F3EC] text-[#6B7873] font-bold uppercase tracking-wider border-b border-[#E7E0D3]">
                  <th className="p-3.5 pl-5">N° Vente</th>
                  <th className="p-3.5">Date & Heure</th>
                  <th className="p-3.5">Caissière</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Articles</th>
                  <th className="p-3.5">Règlement</th>
                  <th className="p-3.5 pr-5 text-right">Total Payé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D3]">
                {filteredSales.map(s => (
                  <tr key={s.id} className="hover:bg-[#FDFBF7] transition">
                    <td className="p-3.5 pl-5 font-mono font-bold text-[#1C2321]">
                      #{s.id}
                    </td>
                    <td className="p-3.5 text-[#6B7873]">
                      {s.date} à {s.time}
                    </td>
                    <td className="p-3.5 font-semibold text-[#1C2321]">
                      {s.caissierName || s.caissier}
                    </td>
                    <td className="p-3.5 text-[#6B7873]">
                      {s.customerName || 'Comptoir'}
                    </td>
                    <td className="p-3.5 text-[#6B7873]">
                      {s.items.map(it => `${it.qty}x ${it.name}`).join(', ')}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-[#F7F3EC] text-[#0F4C4A] font-semibold border border-[#E7E0D3]">
                        {s.payment === 'cash' ? '💵 Espèces' : '📱 Mobile Money'}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-right font-bold text-[#0F4C4A]">
                      {formatPrice(s.total)}
                    </td>
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
