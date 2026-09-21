import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCategory } from '../types';
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  ArrowUpRight,
  Package,
  Plus,
  Minus,
} from 'lucide-react';

export const InventaireView: React.FC = () => {
  const { products, updateProduct, addMovement, settings, setActiveSection } = useApp();

  const [search, setSearch] = useState('');
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const totalStockUnits = products.reduce((sum, p) => sum + p.qty, 0);
  const totalValuation = products.reduce((sum, p) => sum + p.price * p.qty, 0);
  const lowStockCount = products.filter(p => p.qty <= p.minQty).length;
  const outOfStockCount = products.filter(p => p.qty === 0).length;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesAlert = filterAlertsOnly ? p.qty <= p.minQty : true;
    return matchesSearch && matchesCat && matchesAlert;
  });

  const handleQuickAdjust = (productId: number, delta: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    if (delta < 0 && prod.qty <= 0) return;

    const newQty = Math.max(0, prod.qty + delta);
    updateProduct(productId, { qty: newQty });

    // Track movement
    addMovement({
      productId,
      type: delta > 0 ? 'in' : 'out',
      qty: Math.abs(delta),
      reason: delta > 0 ? 'Ajustement rapide (+1)' : 'Ajustement rapide (-1)',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Boxes className="w-3.5 h-3.5" />
            <span>Gestion de l'Entrepôt & Rayon</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">
            État des Stocks & Valorisation de l'Inventaire
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance en temps réel des quantités disponibles et suivi des seuils de réapprovisionnement
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveSection('prelevements-hammam')}
            className="px-4 py-2.5 bg-[#E4E9E1] hover:bg-[#0F4C4A] hover:text-white text-[#0F4C4A] border border-[#0F4C4A]/20 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Prélèvements Hammam</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('mouvements')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Mouvements de Stock</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Valeur Marchande Totale</div>
          <div className="text-xl font-bold text-indigo-700 mt-1">
            {totalValuation.toLocaleString()} {settings.currency}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Calculée au prix de vente</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Nombre d'Articles en Rayon</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {totalStockUnits.toLocaleString()} unités
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{products.length} références actives</div>
        </div>

        <div
          onClick={() => setFilterAlertsOnly(!filterAlertsOnly)}
          className={`p-4 rounded-xl border shadow-xs transition cursor-pointer ${
            filterAlertsOnly
              ? 'bg-amber-100 border-amber-300'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-700 font-bold">Alertes Stock Bas</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-900 mt-1">
            {lowStockCount} produit(s)
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1">
            {filterAlertsOnly ? 'Filtre actif (cliquez pour retirer)' : 'Cliquez pour filtrer'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-rose-600 font-medium">Ruptures de Stock</div>
          <div className="text-xl font-bold text-rose-700 mt-1">{outOfStockCount}</div>
          <div className="text-[11px] text-rose-600/80 mt-1">Articles à 0 unité</div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">
              Inventaire Détaillé ({filteredProducts.length})
            </h3>
            {filterAlertsOnly && (
              <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                Filtre : Alertes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
            >
              <option value="all">Toutes catégories</option>
              <option value="savons">Savons & Gommages</option>
              <option value="parfums">Huiles & Parfums</option>
              <option value="accessoires">Accessoires</option>
              <option value="boissons">Boissons</option>
              <option value="snacks">Snacks</option>
              <option value="autres">Autres</option>
            </select>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Chercher produit..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Produit</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4 text-center">Stock Actuel</th>
                <th className="py-3 px-4 text-center">Ajustement</th>
                <th className="py-3 px-4 text-right">Prix Unitaire</th>
                <th className="py-3 px-4 text-right">Valeur Stock</th>
                <th className="py-3 px-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Aucun produit ne correspond aux filtres</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const isOutOfStock = product.qty === 0;
                  const isLowStock = product.qty > 0 && product.qty <= product.minQty;
                  const itemValue = product.price * product.qty;

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isOutOfStock
                          ? 'bg-rose-50/30'
                          : isLowStock
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {product.name}
                        {product.description && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono text-sm font-extrabold ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {product.qty}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          (min: {product.minQty})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                          <button
                            onClick={() => handleQuickAdjust(product.id, -1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Sortie de stock -1"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(product.id, 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Entrée de stock +1"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {product.price.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {itemValue.toLocaleString()} {settings.currency}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
                            ❌ RUPTURE
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold animate-pulse">
                            ⚠️ STOCK BAS
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                            ✓ NORMAL
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
