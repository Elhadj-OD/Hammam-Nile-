import React from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  FileText,
  Files,
  Boxes,
  ArrowUpRight,
  Receipt,
  ShoppingCart,
  PlusCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    sales,
    invoices,
    quotes,
    products,
    lowStockProducts,
    hammamUsages,
    settings,
    setActiveSection,
    setLastSale,
  } = useApp();

  const isGerant = currentUser?.role === 'gerant';
  const todayStr = new Date().toLocaleDateString('fr-FR');

  // Today's sales
  const todaySales = sales.filter(s => s.date === todayStr);
  const userSalesToday = isGerant
    ? todaySales
    : todaySales.filter(s => s.caissier === currentUser?.username);

  const totalSalesToday = userSalesToday.reduce((sum, s) => sum + s.total, 0);
  const cashSalesToday = userSalesToday
    .filter(s => s.payment === 'cash')
    .reduce((sum, s) => sum + s.total, 0);
  const mobileSalesToday = userSalesToday
    .filter(s => s.payment === 'mobile')
    .reduce((sum, s) => sum + s.total, 0);

  const pendingInvoices = invoices.filter(i => i.status === 'issued' || i.status === 'draft');
  const pendingQuotes = quotes.filter(q => q.status === 'draft' || q.status === 'sent');
  const totalInventoryValue = products.reduce((sum, p) => sum + p.price * p.qty, 0);

  // Group sales for mini chart (last 5 sales or hours)
  const recentSales = userSalesToday.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Role Banner / Greeting */}
      <div className="bg-[#0A3735] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border border-[#E7E0D3]/20">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#B8874B]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-[#B8874B] text-xs font-semibold mb-2 backdrop-blur-xs">
              <span>{isGerant ? 'Mode Superviseur & Gérant' : 'Session de Caisse Active'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#EFE8D8]">
              Bonjour, {currentUser?.name} 👋
            </h2>
            <p className="text-xs sm:text-sm text-[#EFE8D8]/70 mt-1">
              Bienvenue sur l'espace de gestion de la boutique {settings.shopName || 'Hammam Nile'}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSection('caisse')}
              className="px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-indigo-600" />
              <span>Ouvrir la Caisse</span>
            </button>

            <button
              onClick={() => setActiveSection('prelevements-hammam')}
              className="px-3.5 py-2.5 bg-[#B8874B] hover:bg-[#A3743C] text-[#0A3735] font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Usage Hammam</span>
            </button>

            {isGerant && (
              <button
                onClick={() => setActiveSection('devis')}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-white/20 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nouveau Devis</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ventes Aujourd'hui
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
            {totalSalesToday.toLocaleString()} <span className="text-xs font-medium text-slate-500">{settings.currency}</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-500 gap-1.5">
            <span className="font-semibold text-indigo-600">{userSalesToday.length}</span> transaction(s)
          </div>
        </div>

        {/* Cash Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Encaissé en Espèces
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
            {cashSalesToday.toLocaleString()} <span className="text-xs font-medium text-slate-500">{settings.currency}</span>
          </div>
          <div className="mt-2 text-xs text-emerald-700 font-medium">
            Tiroir caisse physique
          </div>
        </div>

        {/* Mobile Money Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mobile Money (Bankily/Sedad)
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
            {mobileSalesToday.toLocaleString()} <span className="text-xs font-medium text-slate-500">{settings.currency}</span>
          </div>
          <div className="mt-2 text-xs text-purple-700 font-medium">
            Paiements électroniques reçus
          </div>
        </div>

        {/* Stock / Invoices (Gérant) or Shift status (Caissier) */}
        {isGerant ? (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Valeur Totale Stock
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
              {totalInventoryValue.toLocaleString()} <span className="text-xs font-medium text-slate-500">{settings.currency}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {products.length} références d'articles
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Articles Vendus
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
              {userSalesToday.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.qty, 0), 0)}
            </div>
            <div className="mt-2 text-xs text-blue-700 font-medium">
              Unités sorties aujourd'hui
            </div>
          </div>
        )}
      </div>

      {/* Gérant Additional KPIs */}
      {isGerant && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => setActiveSection('factures')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-105 transition">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Factures en attente</div>
                <div className="text-lg font-bold text-slate-900">{pendingInvoices.length}</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
          </div>

          <div
            onClick={() => setActiveSection('devis')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-300 transition cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-105 transition">
                <Files className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Devis en cours</div>
                <div className="text-lg font-bold text-slate-900">{pendingQuotes.length}</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
          </div>

          <div
            onClick={() => setActiveSection('inventaire')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-rose-300 transition cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-105 transition">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Articles en alerte stock</div>
                <div className="text-lg font-bold text-slate-900">{lowStockProducts.length}</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition" />
          </div>
        </div>
      )}

      {/* Stock Alerts Warning Banner */}
      {lowStockProducts.length > 0 && isGerant && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-900">
                Alerte de Réapprovisionnement ({lowStockProducts.length} produit{lowStockProducts.length > 1 ? 's' : ''})
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                Certains articles comme "{lowStockProducts[0]?.name}" ont atteint ou franchi leur stock minimum.
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveSection('inventaire')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer"
          >
            Gérer le Stock
          </button>
        </div>
      )}

      {/* Hammam Usages Card Banner */}
      <div className="p-4 rounded-2xl bg-[#E4E9E1] border border-[#0F4C4A]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F4C4A] text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#B8874B]" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#0F4C4A] uppercase tracking-wide">
              Produits Boutique Pris par le Hammam ({hammamUsages.length} prélèvement{hammamUsages.length > 1 ? 's' : ''})
            </div>
            <div className="text-xs text-[#1C2321] mt-0.5">
              Valeur totale transférée :{' '}
              <strong className="text-[#0F4C4A] font-extrabold">
                {hammamUsages.reduce((sum, u) => sum + u.totalValue, 0).toLocaleString('fr-FR')} {settings.currency}
              </strong>{' '}
              · <span className="text-[#6B7873]">{hammamUsages.reduce((sum, u) => sum + u.qty, 0)} articles déduits du stock boutique</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('prelevements-hammam')}
          className="px-3.5 py-2 bg-[#0F4C4A] hover:bg-[#0A3735] text-white rounded-xl text-xs font-bold shrink-0 transition cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <span>Consulter les Sorties Hammam</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recent Transactions & Quick POS shortcut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Dernières Ventes du Jour</h3>
              <p className="text-xs text-slate-500">Tickets récemment enregistrés à la caisse</p>
            </div>
            <button
              onClick={() => setActiveSection(isGerant ? 'rapports' : 'mes-ventes')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              Voir tout →
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Aucune vente enregistrée aujourd'hui pour l'instant.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentSales.map(sale => (
                <div
                  key={sale.id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                        <span>Ticket #{sale.id}</span>
                        <span className="text-[10px] text-slate-400">· {sale.time}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {sale.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {sale.total.toLocaleString()} {settings.currency}
                      </div>
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          sale.payment === 'cash'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {sale.payment === 'cash' ? 'Espèces' : 'Mobile Money'}
                      </span>
                    </div>

                    <button
                      onClick={() => setLastSale(sale)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition cursor-pointer"
                      title="Revoir le ticket"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Launch & Catalog Snapshot */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Articles Populaires</h3>
            <p className="text-xs text-slate-500 mb-4">Ajout rapide vers la caisse</p>

            <div className="space-y-2.5">
              {products.slice(0, 4).map(product => (
                <div
                  key={product.id}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {product.name}
                    </div>
                    <div className="text-[11px] text-indigo-600 font-bold">
                      {product.price.toLocaleString()} {settings.currency}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-600 shrink-0">
                    Stock: {product.qty}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => setActiveSection('caisse')}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Ouvrir la Caisse POS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
