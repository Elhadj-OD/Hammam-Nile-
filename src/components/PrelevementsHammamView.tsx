import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { HammamUsage } from '../types';
import {
  Sparkles,
  Package,
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  FileText,
  AlertCircle,
  TrendingDown,
  Building2,
  CheckCircle2,
  X,
  Layers,
  ShoppingBag,
} from 'lucide-react';

export const PrelevementsHammamView: React.FC = () => {
  const {
    products,
    hammamUsages,
    addHammamUsage,
    deleteHammamUsage,
    settings,
    currentUser,
  } = useApp();

  // State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<HammamUsage | null>(null);
  const [search, setSearch] = useState('');
  const [filterCabin, setFilterCabin] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Form state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [cabin, setCabin] = useState<string>('Cabine de Gommage');
  const [customCabin, setCustomCabin] = useState<string>('');
  const [requestedBy, setRequestedBy] = useState<string>('Khadija (Gommeuse)');
  const [customRequestedBy, setCustomRequestedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const defaultCabins = [
    'Cabine de Gommage',
    'Bains de Vapeur (Hammam chaud)',
    'Cabine de Massage & Soins',
    'Soins du Visage & Esthétique',
    'Vestiaires & Service Linge',
    'Accueil & Espace Détente',
    'Autre espace',
  ];

  const staffSuggestions = [
    'Khadija (Gommeuse)',
    'Mariem (Superviseuse)',
    'Amina (Masseuse)',
    'Fatouma (Lingerie Hammam)',
    'Zeinabou (Esthéticienne)',
    'Autre praticienne',
  ];

  // Selected product object
  const selectedProduct = products.find(p => p.id === Number(selectedProductId));

  // Calculations
  const formatPrice = (val: number) => `${val.toLocaleString('fr-FR')} ${settings.currency}`;

  // L'admin vérifie les deux parties ; une caissière ne prélève que sur sa partie (genre)
  const isGerant = currentUser?.role === 'gerant';
  const canAccessBoutiqueFemme = isGerant || currentUser?.gender !== 'homme';
  const canAccessBoutiqueHomme = isGerant || currentUser?.gender === 'homme';
  const genderLabel = isGerant ? null : currentUser?.gender === 'homme' ? 'Hommes' : 'Femmes';

  const accessibleProducts = products.filter(p => {
    if (p.category === 'femmes' && !canAccessBoutiqueFemme) return false;
    if (p.category === 'hommes' && !canAccessBoutiqueHomme) return false;
    return true;
  });

  // Filtered usages
  const filteredUsages = hammamUsages.filter(u => {
    const usageProduct = products.find(p => p.id === u.productId);
    if (usageProduct?.category === 'femmes' && !canAccessBoutiqueFemme) return false;
    if (usageProduct?.category === 'hommes' && !canAccessBoutiqueHomme) return false;

    const matchesSearch =
      u.productName.toLowerCase().includes(search.toLowerCase()) ||
      u.serviceOrCabin.toLowerCase().includes(search.toLowerCase()) ||
      u.requestedBy.toLowerCase().includes(search.toLowerCase()) ||
      (u.notes && u.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesCabin = filterCabin === 'all' || u.serviceOrCabin === filterCabin;

    let matchesPeriod = true;
    const now = Date.now();
    if (filterPeriod === 'today') {
      matchesPeriod = now - u.timestamp < 86400000;
    } else if (filterPeriod === 'week') {
      matchesPeriod = now - u.timestamp < 86400000 * 7;
    } else if (filterPeriod === 'month') {
      matchesPeriod = now - u.timestamp < 86400000 * 30;
    }

    return matchesSearch && matchesCabin && matchesPeriod;
  });

  const totalValuePrise = filteredUsages.reduce((sum, u) => sum + u.totalValue, 0);
  const totalArticlesPris = filteredUsages.reduce((sum, u) => sum + u.qty, 0);

  // Group by cabin
  const cabinBreakdown: Record<string, { qty: number; value: number }> = {};
  filteredUsages.forEach(u => {
    if (!cabinBreakdown[u.serviceOrCabin]) {
      cabinBreakdown[u.serviceOrCabin] = { qty: 0, value: 0 };
    }
    cabinBreakdown[u.serviceOrCabin].qty += u.qty;
    cabinBreakdown[u.serviceOrCabin].value += u.totalValue;
  });

  // Handle submit
  const handleCreateUsage = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedProductId) {
      setFormError('Veuillez choisir un produit de la boutique.');
      return;
    }

    const prod = products.find(p => p.id === Number(selectedProductId));
    if (!prod) {
      setFormError('Produit introuvable.');
      return;
    }

    if (quantity <= 0) {
      setFormError('La quantité doit être supérieure à zéro.');
      return;
    }

    if (quantity > prod.qty) {
      setFormError(`Stock insuffisant en boutique ! Quantité disponible : ${prod.qty}`);
      return;
    }

    const effectiveCabin = cabin === 'Autre espace' ? customCabin.trim() || 'Espace Hammam' : cabin;
    const effectiveRequestedBy =
      requestedBy === 'Autre praticienne'
        ? customRequestedBy.trim() || 'Personnel Hammam'
        : requestedBy;

    const ok = addHammamUsage({
      productId: prod.id,
      qty: quantity,
      serviceOrCabin: effectiveCabin,
      requestedBy: effectiveRequestedBy,
      notes: notes.trim() || undefined,
    });

    if (ok) {
      setShowAddModal(false);
      // Reset form
      setSelectedProductId('');
      setQuantity(1);
      setCabin('Cabine de Gommage');
      setCustomCabin('');
      setRequestedBy('Khadija (Gommeuse)');
      setCustomRequestedBy('');
      setNotes('');
      setFormError('');
    } else {
      setFormError('Impossible de valider ce prélèvement. Vérifiez le stock disponible.');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    let csv = `Réf,Date,Heure,Produit,Quantité,Prix Unitaire (${settings.currency}),Valeur Totale (${settings.currency}),Espace Hammam,Demandé par,Remis par,Notes\n`;
    filteredUsages.forEach(u => {
      csv += `"#${u.id}","${u.date}","${u.time}","${u.productName}","${u.qty}","${u.unitPrice}","${u.totalValue}","${u.serviceOrCabin}","${u.requestedBy}","${u.takenByStaff}","${u.notes || ''}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prelevements-hammam-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F4C4A] uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-[#B8874B]" />
            <span>Usage Interne & Cabines de Soins</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1C2321] font-display">
            Produits Prélevés par le Hammam{genderLabel && ` (${genderLabel})`}
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7873] mt-0.5">
            Registre et valorisation des produits pris sur le stock de la boutique pour le fonctionnement du hammam (gommages, bains, massages et vestiaires).
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 md:flex-initial px-3.5 py-2.5 bg-[#F7F3EC] hover:bg-[#E4E9E1] text-[#0A3735] border border-[#E7E0D3] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-[#0F4C4A] hover:bg-[#0A3735] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Prélèvement</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7873] uppercase tracking-wider">
              Valeur Totale Prise
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F4C4A] mt-2 font-display">
            {formatPrice(totalValuePrise)}
          </div>
          <p className="text-[11px] text-[#6B7873] mt-1">
            Valorisé au prix de cession boutique
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7873] uppercase tracking-wider">
              Articles Consommés
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F7F3EC] text-[#B8874B] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C2321] mt-2 font-display">
            {totalArticlesPris} <span className="text-sm font-normal text-[#6B7873]">unités</span>
          </div>
          <p className="text-[11px] text-[#6B7873] mt-1">
            Déduits en temps réel du stock boutique
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7873] uppercase tracking-wider">
              Fiches de Prélèvement
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F7F3EC] text-[#1C2321] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C2321] mt-2 font-display">
            {filteredUsages.length}
          </div>
          <p className="text-[11px] text-[#6B7873] mt-1">
            Sorties enregistrées et tracées
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7873] uppercase tracking-wider">
              Cabines Concernées
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F7F3EC] text-[#0F4C4A] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1C2321] mt-2 font-display">
            {Object.keys(cabinBreakdown).length}
          </div>
          <p className="text-[11px] text-[#6B7873] mt-1">
            Espaces de soins approvisionnés
          </p>
        </div>
      </div>

      {/* Breakdown by Hammam Space */}
      {Object.keys(cabinBreakdown).length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <h3 className="text-xs font-bold text-[#6B7873] uppercase tracking-wider mb-3">
            Répartition par Espace & Cabine du Hammam
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(cabinBreakdown).map(([cab, data]) => (
              <div
                key={cab}
                onClick={() => setFilterCabin(filterCabin === cab ? 'all' : cab)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  filterCabin === cab
                    ? 'bg-[#E4E9E1] border-[#0F4C4A] shadow-xs'
                    : 'bg-[#F7F3EC]/70 border-[#E7E0D3] hover:bg-[#E4E9E1]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#1C2321] line-clamp-1">{cab}</span>
                  {filterCabin === cab && (
                    <span className="text-[10px] bg-[#0F4C4A] text-white px-1.5 py-0.5 rounded font-bold">
                      Actif
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-sm font-extrabold text-[#0F4C4A] font-display">
                    {formatPrice(data.value)}
                  </span>
                  <span className="text-xs text-[#6B7873] font-semibold">
                    {data.qty} article(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7873] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par produit, cabine, demandeur ou note..."
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl focus:outline-none focus:border-[#0F4C4A]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7873] hover:text-[#1C2321]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterCabin}
            onChange={e => setFilterCabin(e.target.value)}
            className="text-xs p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-semibold focus:outline-none focus:border-[#0F4C4A]"
          >
            <option value="all">Toutes les Cabines ({hammamUsages.length})</option>
            {defaultCabins.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-[#F7F3EC] p-1 rounded-xl border border-[#E7E0D3] text-xs">
            {(['all', 'today', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPeriod(p)}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer capitalize ${
                  filterPeriod === p
                    ? 'bg-[#0F4C4A] text-white shadow-xs'
                    : 'text-[#6B7873] hover:text-[#1C2321]'
                }`}
              >
                {p === 'all' ? 'Tout' : p === 'today' ? 'Auj.' : p === 'week' ? '7j' : '30j'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Usages Table */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E7E0D3] bg-[#F7F3EC]/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#1C2321] uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#0F4C4A]" />
            <span>Historique des Sorties Hammam ({filteredUsages.length})</span>
          </h3>
          <span className="text-xs font-extrabold text-[#0F4C4A]">
            Total sélection : {formatPrice(totalValuePrise)}
          </span>
        </div>

        {filteredUsages.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F3EC] text-[#6B7873] flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-[#B8874B]" />
            </div>
            <h4 className="text-sm font-bold text-[#1C2321]">Aucun prélèvement trouvé</h4>
            <p className="text-xs text-[#6B7873] mt-1 max-w-sm mx-auto">
              Aucun produit n'a été enregistré pour ces critères. Cliquez sur « Nouveau Prélèvement » pour consigner une sortie vers le hammam.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-[#0F4C4A] text-white rounded-xl text-xs font-bold transition hover:bg-[#0A3735] cursor-pointer"
            >
              Enregistrer un premier prélèvement
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F3EC]/80 border-b border-[#E7E0D3] text-[#6B7873] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Produit Boutique</th>
                  <th className="py-3 px-4">Cabine / Espace</th>
                  <th className="py-3 px-4 text-center">Qté</th>
                  <th className="py-3 px-4 text-right">P.U.</th>
                  <th className="py-3 px-4 text-right">Valeur Totale</th>
                  <th className="py-3 px-4">Demandé par</th>
                  <th className="py-3 px-4">Remis par</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D3]">
                {filteredUsages.map(u => (
                  <tr key={u.id} className="hover:bg-[#F7F3EC]/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#1C2321]">{u.date}</div>
                      <div className="text-[10px] text-[#6B7873]">{u.time}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#1C2321] text-xs">{u.productName}</div>
                      {u.notes && (
                        <div className="text-[11px] text-[#6B7873] italic line-clamp-1 mt-0.5">
                          "{u.notes}"
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E4E9E1] text-[#0F4C4A] border border-[#0F4C4A]/20">
                        {u.serviceOrCabin}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                        - {u.qty}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-[#6B7873]">
                      {formatPrice(u.unitPrice)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-extrabold text-[#0F4C4A]">
                      {formatPrice(u.totalValue)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-[#1C2321]">
                      {u.requestedBy}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7873]">
                      {u.takenByStaff}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(u)}
                          title="Imprimer / Voir le Bon de Décharge"
                          className="p-1.5 rounded-lg bg-[#F7F3EC] hover:bg-[#E4E9E1] text-[#0A3735] transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Annuler ce prélèvement de ${u.qty} "${u.productName}" ? Le stock sera réintégré en boutique.`
                              )
                            ) {
                              deleteHammamUsage(u.id);
                            }
                          }}
                          title="Annuler et réintégrer au stock"
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add New Hammam Withdrawal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E7E0D3] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D3]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0F4C4A] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#B8874B]" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1C2321] font-display">
                    Nouveau Prélèvement Hammam
                  </h3>
                  <p className="text-[11px] text-[#6B7873]">
                    Produits remis au personnel du Hammam pour les soins
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-[#6B7873] hover:text-[#1C2321] hover:bg-[#F7F3EC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUsage} className="mt-4 space-y-4">
              {/* Product Selection */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Article prélevé dans la boutique *
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => {
                    setSelectedProductId(e.target.value);
                    setFormError('');
                  }}
                  required
                  className="w-full text-xs p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-medium focus:outline-none focus:border-[#0F4C4A]"
                >
                  <option value="">-- Sélectionner un produit en rayon --</option>
                  {accessibleProducts.map(p => (
                    <option key={p.id} value={p.id} disabled={p.qty <= 0}>
                      {p.name} — (Dispo : {p.qty} unité{p.qty > 1 ? 's' : ''}) — {formatPrice(p.price)}
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#6B7873] bg-[#F7F3EC] p-2 rounded-lg">
                    <span>
                      Stock actuel disponible :{' '}
                      <strong className={selectedProduct.qty < 5 ? 'text-amber-700' : 'text-[#0F4C4A]'}>
                        {selectedProduct.qty} unités
                      </strong>
                    </span>
                    <span>
                      Prix unitaire : <strong>{formatPrice(selectedProduct.price)}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Quantité prélevée *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="w-9 h-9 rounded-xl bg-[#F7F3EC] border border-[#E7E0D3] font-bold text-base text-[#1C2321] hover:bg-[#E4E9E1] transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct ? selectedProduct.qty : 999}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="flex-1 text-center font-bold text-sm p-2 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl focus:outline-none focus:border-[#0F4C4A]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(prev => (selectedProduct ? Math.min(selectedProduct.qty, prev + 1) : prev + 1))
                    }
                    className="w-9 h-9 rounded-xl bg-[#F7F3EC] border border-[#E7E0D3] font-bold text-base text-[#1C2321] hover:bg-[#E4E9E1] transition"
                  >
                    +
                  </button>
                </div>
                {selectedProduct && (
                  <div className="mt-1 text-right text-xs font-extrabold text-[#0F4C4A]">
                    Valeur totale sortie : {formatPrice(quantity * selectedProduct.price)}
                  </div>
                )}
              </div>

              {/* Cabin / Space */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Destination / Cabine Hammam *
                </label>
                <select
                  value={cabin}
                  onChange={e => setCabin(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-medium focus:outline-none focus:border-[#0F4C4A]"
                >
                  {defaultCabins.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {cabin === 'Autre espace' && (
                  <input
                    type="text"
                    value={customCabin}
                    onChange={e => setCustomCabin(e.target.value)}
                    placeholder="Préciser l'espace (ex: Cabine VIP, Réserve étage...)"
                    required
                    className="mt-2 w-full text-xs p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl focus:outline-none focus:border-[#0F4C4A]"
                  />
                )}
              </div>

              {/* Requested by */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Demandé par (Praticienne / Responsable Hammam) *
                </label>
                <select
                  value={requestedBy}
                  onChange={e => setRequestedBy(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-medium focus:outline-none focus:border-[#0F4C4A]"
                >
                  {staffSuggestions.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {requestedBy === 'Autre praticienne' && (
                  <input
                    type="text"
                    value={customRequestedBy}
                    onChange={e => setCustomRequestedBy(e.target.value)}
                    placeholder="Nom de la praticienne ou intervenante..."
                    required
                    className="mt-2 w-full text-xs p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl focus:outline-none focus:border-[#0F4C4A]"
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Observations / Motif (facultatif)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ex: Soin spécial mariée, réapprovisionnement matin, séance groupe..."
                  className="w-full text-xs p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl focus:outline-none focus:border-[#0F4C4A]"
                />
              </div>

              {/* Summary note */}
              <div className="bg-[#E4E9E1]/60 p-3 rounded-xl border border-[#0F4C4A]/20 text-[11px] text-[#0A3735] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F4C4A] shrink-0 mt-0.5" />
                <div>
                  Ce prélèvement déduira automatiquement les {quantity} article(s) du stock de la boutique et enregistrera une sortie avec le nom de l'opératrice connectée (
                  <strong>{currentUser?.name || 'Caissière'}</strong>).
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-[#F7F3EC] text-[#1C2321] border border-[#E7E0D3] rounded-xl text-xs font-bold hover:bg-[#E4E9E1] transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0F4C4A] text-white rounded-xl text-xs font-bold hover:bg-[#0A3735] transition shadow-xs"
                >
                  Valider la Sortie Hammam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bon de Décharge / Sortie Hammam */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E7E0D3]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D3]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#B8874B] text-[#0A3735] flex items-center justify-center font-bold text-xs">
                  AN
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1C2321]">
                    Bon de Décharge Interne Hammam
                  </h3>
                  <p className="text-[10px] text-[#6B7873]">Réf. #{selectedTicket.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-lg text-[#6B7873] hover:text-[#1C2321]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-5 p-4 bg-[#F7F3EC] rounded-xl border border-[#E7E0D3] space-y-2.5 text-xs">
              <div className="flex justify-between text-[#6B7873]">
                <span>Date & Heure :</span>
                <span className="font-bold text-[#1C2321]">
                  {selectedTicket.date} à {selectedTicket.time}
                </span>
              </div>
              <div className="flex justify-between text-[#6B7873]">
                <span>Espace / Cabine :</span>
                <span className="font-bold text-[#0F4C4A]">
                  {selectedTicket.serviceOrCabin}
                </span>
              </div>
              <div className="flex justify-between text-[#6B7873]">
                <span>Article prélevé :</span>
                <span className="font-bold text-[#1C2321]">
                  {selectedTicket.productName}
                </span>
              </div>
              <div className="flex justify-between text-[#6B7873]">
                <span>Quantité sortie :</span>
                <span className="font-extrabold text-rose-700">
                  {selectedTicket.qty} unité(s)
                </span>
              </div>
              <div className="flex justify-between text-[#6B7873]">
                <span>Prix unitaire boutique :</span>
                <span className="font-medium text-[#1C2321]">
                  {formatPrice(selectedTicket.unitPrice)}
                </span>
              </div>
              <div className="border-t border-[#E7E0D3] pt-2 flex justify-between text-sm font-extrabold text-[#0F4C4A]">
                <span>Valeur totale :</span>
                <span>{formatPrice(selectedTicket.totalValue)}</span>
              </div>
              {selectedTicket.notes && (
                <div className="text-[11px] text-[#6B7873] bg-white p-2 rounded-lg border border-[#E7E0D3] mt-2">
                  <strong>Motif :</strong> {selectedTicket.notes}
                </div>
              )}
            </div>

            {/* Signatures box */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-[#6B7873]">
              <div className="border border-dashed border-[#E7E0D3] rounded-xl p-2.5 text-center">
                <div className="font-bold text-[#1C2321]">Demandé par :</div>
                <div className="text-[#0F4C4A] font-semibold mt-0.5">{selectedTicket.requestedBy}</div>
                <div className="h-7 border-b border-[#E7E0D3] mt-1" />
                <div className="text-[9px] mt-1 text-[#6B7873]/70">Signature Hammam</div>
              </div>
              <div className="border border-dashed border-[#E7E0D3] rounded-xl p-2.5 text-center">
                <div className="font-bold text-[#1C2321]">Remis en boutique par :</div>
                <div className="text-[#0F4C4A] font-semibold mt-0.5">{selectedTicket.takenByStaff}</div>
                <div className="h-7 border-b border-[#E7E0D3] mt-1" />
                <div className="text-[9px] mt-1 text-[#6B7873]/70">Visa Boutique</div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#0F4C4A] text-white rounded-xl text-xs font-bold hover:bg-[#0A3735] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer le Bon</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2.5 bg-[#F7F3EC] text-[#1C2321] border border-[#E7E0D3] rounded-xl text-xs font-bold hover:bg-[#E4E9E1] transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
