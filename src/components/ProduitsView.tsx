import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory } from '../types';
import { DEPARTMENTS } from '../lib/departments';
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Camera,
  X,
  PlusCircle,
  MinusCircle,
  Tag,
  Boxes,
  Sparkles,
  Layers,
} from 'lucide-react';

const CATEGORY_META: Partial<Record<ProductCategory, { icon: string; label: string }>> = {
  femmes: { icon: '💄', label: 'Boutique Femme' },
  hommes: { icon: '🧔', label: 'Boutique Homme' },
  hammam_bains: { icon: '♨️', label: 'Hammam' },
  boissons: { icon: '🥤', label: 'Boissons' },
  snacks: { icon: '🍪', label: 'Snacks' },
};

export const ProduitsView: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, settings, currentUser } = useApp();

  // La gérante gère tout le catalogue. Une caissière avec un département
  // assigné (Hammam & Bains, Esthétique...) ne voit/gère que le rayon de
  // ce département ; sinon elle est limitée par son genre (Boutique Femme/
  // Homme) — exactement les mêmes règles que sur l'écran Caisse.
  const isGerant = currentUser?.role === 'gerant';
  const myDept = !isGerant && currentUser?.department ? DEPARTMENTS[currentUser.department] : null;
  // Coiffure & Salon et Épilation vendent des prestations, pas des produits
  // physiques — le vocabulaire de cette page doit dire "Service".
  const isServiceDept =
    currentUser?.department === 'coiffure_salon' || currentUser?.department === 'epilation_traditionnelle';
  const itemWord = isServiceDept ? 'Service' : 'Produit';
  // Le hammam (femmes et hommes) vit dans le même rayon que la Boutique
  // correspondante — pas un rayon à part.
  const myDeptCategories =
    myDept?.category === 'femmes' || myDept?.category === 'hommes'
      ? [myDept.category, 'hammam_bains']
      : myDept?.category === 'boissons'
        ? ['boissons', 'snacks']
        : myDept
          ? [myDept.category]
          : null;
  const canAccessBoutiqueFemme = isGerant || currentUser?.gender !== 'homme';
  const canAccessBoutiqueHomme = isGerant || currentUser?.gender === 'homme';
  const accessibleProducts = products.filter(p => {
    if (myDeptCategories) return myDeptCategories.includes(p.category);
    if (p.category === 'femmes' && !canAccessBoutiqueFemme) return false;
    if (p.category === 'hommes' && !canAccessBoutiqueHomme) return false;
    return true;
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('savons');
  const [price, setPrice] = useState<string>('');
  const [qty, setQty] = useState<string>('20'); // Nombre de pièces
  const [minQty, setMinQty] = useState<string>('5');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('🧼');
  const [barcode, setBarcode] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const emojiOptions = ['🧼', '🧤', '🫙', '🧴', '🧺', '🕯️', '🌸', '✨', '🍃', '🍵', '🧽', '🌿'];

  // Un code-barres déjà attribué à un autre produit — évite les doublons au scan
  const duplicateProduct = products.find(
    p => barcode.trim().length > 3 && p.barcode === barcode.trim() && p.id !== editingProduct?.id
  );

  const openAddForm = () => {
    setEditingProduct(null);
    setName('');
    setCategory(myDept ? myDept.category : 'savons');
    setPrice('');
    setQty('20');
    setMinQty('5');
    setDescription('');
    setImagePreview('');
    setSelectedEmoji('🧼');
    setBarcode('');
    setIsFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setCategory(product.category);
    setPrice(product.price.toString());
    setQty(product.qty.toString());
    setMinQty(product.minQty.toString());
    setDescription(product.description || '');
    setImagePreview(product.image || '');
    setSelectedEmoji(product.emoji || '🧼');
    setBarcode(product.barcode || '');
    setIsFormOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Fichier invalide : veuillez sélectionner une image.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('Veuillez sélectionner une image de moins de 2 Mo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(price);
    // Une prestation n'a pas de "pièces en stock" : toujours disponible,
    // jamais d'alerte de stock bas.
    const qtyNum = isServiceDept ? 999 : parseInt(qty) || 0;
    const minQtyNum = isServiceDept ? 0 : parseInt(minQty) || 5;

    if (!name.trim()) {
      alert(`Veuillez renseigner un nom pour le ${itemWord.toLowerCase()}.`);
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Veuillez renseigner un prix supérieur à 0.');
      return;
    }
    if (duplicateProduct) {
      alert(`Ce code-barres est déjà utilisé par « ${duplicateProduct.name} ». Modifiez ce produit au lieu d'en créer un nouveau.`);
      return;
    }

    const productPayload = {
      name: name.trim(),
      category,
      price: priceNum,
      qty: qtyNum, // nombre de pièces
      minQty: minQtyNum,
      description: description.trim(),
      image: imagePreview || undefined,
      emoji: selectedEmoji,
      barcode: barcode.trim() || undefined,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productPayload);
    } else {
      addProduct(productPayload);
    }

    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleStockAdjustment = (productId: number, delta: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const newQty = Math.max(0, prod.qty + delta);
    updateProduct(productId, { qty: newQty });
  };

  const formatPrice = (val: number) => {
    return `${val.toLocaleString('fr-FR')} ${settings.currency}`;
  };

  const filteredProducts = accessibleProducts.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const totalPieces = accessibleProducts.reduce((acc, p) => acc + p.qty, 0);
  const totalValuation = accessibleProducts.reduce((acc, p) => acc + p.price * p.qty, 0);

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E0D3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0F4C4A] text-xs font-bold uppercase tracking-wider mb-1">
            <Package className="w-4 h-4" />
            <span>{isServiceDept ? 'Catalogue des Prestations' : 'Catalogue & Gestion des Articles'}</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-[#1C2321]">
            {isServiceDept ? 'Services Proposés' : 'Produits & Pièces en Stock'}
          </h1>
          <p className="text-sm text-[#6B7873] mt-1">
            {isServiceDept
              ? 'Ajoutez de nouvelles prestations avec leur nom et leur prix de vente.'
              : 'Ajoutez de nouveaux articles avec leur photo, leur nom, le nombre de pièces disponibles et leur prix de vente.'}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="bg-[#0F4C4A] hover:bg-[#0A3735] text-white px-5 py-3 rounded-full font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un {itemWord}</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className={`grid grid-cols-1 ${isServiceDept ? '' : 'sm:grid-cols-3'} gap-4`}>
        <div className="bg-white p-4.5 rounded-2xl border border-[#E7E0D3] shadow-xs">
          <div className="text-xs text-[#6B7873] font-bold uppercase">
            {isServiceDept ? 'Nombre de Services' : 'Nombre de Références'}
          </div>
          <div className="text-2xl font-bold font-display text-[#1C2321] mt-1">
            {accessibleProducts.length} {isServiceDept ? 'services' : 'articles'}
          </div>
        </div>
        {!isServiceDept && (
          <>
            <div className="bg-white p-4.5 rounded-2xl border border-[#E7E0D3] shadow-xs">
              <div className="text-xs text-[#6B7873] font-bold uppercase">Total Pièces en Stock</div>
              <div className="text-2xl font-bold font-display text-[#0F4C4A] mt-1">
                {totalPieces} pièces
              </div>
            </div>
            <div className="bg-white p-4.5 rounded-2xl border border-[#E7E0D3] shadow-xs">
              <div className="text-xs text-[#6B7873] font-bold uppercase">Valeur du Stock Boutique</div>
              <div className="text-2xl font-bold font-display text-[#B8874B] mt-1">
                {formatPrice(totalValuation)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E7E0D3] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#6B7873] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom d'article..."
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
          />
        </div>

        {myDept ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0F4C4A] text-white text-[13px] font-bold w-fit shrink-0">
            <span>{myDept.icon}</span>
            <span>{myDept.label}</span>
          </div>
        ) : (
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#0F4C4A] text-white'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
          >
            Tous ({accessibleProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('savons')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'savons'
                ? 'bg-[#0F4C4A] text-white'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
          >
            🧼 Savons & Soins
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('huiles')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'huiles'
                ? 'bg-[#0F4C4A] text-white'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
          >
            🫙 Huiles
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('accessoires')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'accessoires'
                ? 'bg-[#0F4C4A] text-white'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
          >
            🧤 Accessoires
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('linge')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'linge'
                ? 'bg-[#0F4C4A] text-white'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
          >
            🧺 Linge & Bains
          </button>
          {canAccessBoutiqueFemme && (
            <button
              type="button"
              onClick={() => setSelectedCategory('femmes')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'femmes'
                  ? 'bg-[#0F4C4A] text-white'
                  : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
              }`}
              title="Réservée aux caissières marquées « Femme » sur l'écran Caisse"
            >
              💄 Boutique Femme
            </button>
          )}
          {canAccessBoutiqueHomme && (
            <button
              type="button"
              onClick={() => setSelectedCategory('hommes')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'hommes'
                  ? 'bg-[#0F4C4A] text-white'
                  : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
              }`}
              title="Réservée aux caissiers marqués « Homme » sur l'écran Caisse"
            >
              🧔 Boutique Homme
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedCategory('hammam_bains')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'hammam_bains'
                ? 'bg-[#0F4C4A] text-white'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
            title="Caisse dédiée Hammam & Bains"
          >
            ♨️ Hammam & Bains
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('spa_massage')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'spa_massage'
                ? 'bg-[#0F4C4A] text-white'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
            title="Caisse dédiée Esthétique"
          >
            💆 Esthétique
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('epilation_traditionnelle')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'epilation_traditionnelle'
                ? 'bg-[#0F4C4A] text-white'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
            title="Caisse dédiée Épilation Traditionnelle"
          >
            🪡 Épilation Traditionnelle
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('fitness_gym')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'fitness_gym'
                ? 'bg-[#0F4C4A] text-white'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
            title="Caisse dédiée Fitness Gym"
          >
            🏋️ Fitness Gym
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('coiffure_salon')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === 'coiffure_salon'
                ? 'bg-[#0F4C4A] text-white'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
            title="Caisse dédiée Coiffure & Salon"
          >
            💇 Coiffure & Salon
          </button>
        </div>
        )}
      </div>

      {/* Product List / Table */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E7E0D3] flex items-center justify-between">
          <h3 className="font-bold font-display text-base text-[#1C2321]">
            {isServiceDept ? 'Liste des Services' : 'Liste des Produits'} ({filteredProducts.length})
          </h3>
          <span className="text-xs text-[#6B7873]">
            {isServiceDept ? 'Affichage avec nom et prix' : 'Affichage avec photo, nom et nombre de pièces'}
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-[#6B7873]">
            <Package className="w-10 h-10 mx-auto text-[#6B7873]/40 mb-2" />
            <p className="font-bold text-sm">
              {isServiceDept ? 'Aucun service ne correspond à votre recherche' : 'Aucun produit ne correspond à votre recherche'}
            </p>
            <p className="text-xs mt-1">Cliquez sur « Ajouter un {itemWord} » pour créer un nouvel article.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F3EC] text-[#6B7873] text-[11px] font-bold uppercase tracking-wider border-b border-[#E7E0D3]">
                  <th className="p-3.5 pl-5">Photo / Visuel</th>
                  <th className="p-3.5">Nom du {itemWord}</th>
                  <th className="p-3.5">Catégorie</th>
                  <th className="p-3.5">Prix Unitaire</th>
                  {!isServiceDept && (
                    <>
                      <th className="p-3.5 text-center">Nombre de Pièces</th>
                      <th className="p-3.5">État du Stock</th>
                    </>
                  )}
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D3] text-sm">
                {filteredProducts.map(p => {
                  const isLow = p.qty <= p.minQty;
                  const isOut = p.qty === 0;

                  return (
                    <tr key={p.id} className="hover:bg-[#FDFBF7] transition">
                      {/* Photo / Emoji Box */}
                      <td className="p-3.5 pl-5">
                        <div className="w-12 h-12 rounded-xl bg-[#E4E9E1] overflow-hidden flex items-center justify-center text-2xl border border-[#E7E0D3] shrink-0">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            p.emoji || '🧼'
                          )}
                        </div>
                      </td>

                      {/* Nom du Produit */}
                      <td className="p-3.5">
                        <div className="font-bold text-[#1C2321]">{p.name}</div>
                        {p.barcode && (
                          <div className="text-[11px] text-[#6B7873] font-mono mt-0.5 flex items-center gap-1">
                            <span className="text-[9px] opacity-60">▐│</span>{p.barcode}
                          </div>
                        )}
                        {p.description && (
                          <div className="text-xs text-[#6B7873] line-clamp-1 max-w-xs mt-0.5">
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* Catégorie */}
                      <td className="p-3.5">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-[#F7F3EC] text-[#0F4C4A] font-semibold capitalize border border-[#E7E0D3]">
                          {p.category}
                        </span>
                      </td>

                      {/* Prix de vente */}
                      <td className="p-3.5 font-bold text-[#0F4C4A]">
                        {formatPrice(p.price)}
                      </td>

                      {!isServiceDept && (
                        <>
                          {/* Nombre de pièces & quick stock buttons */}
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStockAdjustment(p.id, -1)}
                                disabled={p.qty <= 0}
                                className="w-6 h-6 rounded-full bg-[#F7F3EC] hover:bg-[#E7E0D3] text-[#1C2321] flex items-center justify-center font-bold text-xs disabled:opacity-30 cursor-pointer"
                                title="Retirer 1 pièce"
                              >
                                -
                              </button>
                              <span className="font-bold text-base text-[#1C2321] min-w-[36px] text-center font-mono">
                                {p.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStockAdjustment(p.id, 1)}
                                className="w-6 h-6 rounded-full bg-[#0F4C4A] hover:bg-[#0A3735] text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                title="Ajouter 1 pièce"
                              >
                                +
                              </button>
                              <span className="text-xs text-[#6B7873] ml-0.5">pièces</span>
                            </div>
                          </td>

                          {/* État */}
                          <td className="p-3.5">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                                Épuisé (0 pièce)
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                <AlertTriangle className="w-3 h-3" />
                                Alerte ({p.qty} restantes)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Disponible
                              </span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(p)}
                            className="p-1.5 rounded-lg text-[#6B7873] hover:text-[#0F4C4A] hover:bg-[#F7F3EC] transition cursor-pointer"
                            title="Modifier le produit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Voulez-vous supprimer l'article "${p.name}" ?`)) {
                                deleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-[#6B7873] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Supprimer le produit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ajouter / Modifier Produit */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#E7E0D3] max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E0D3]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-[#1C2321]">
                    {editingProduct ? `Modifier le ${itemWord}` : `Ajouter un Nouveau ${itemWord}`}
                  </h3>
                  <p className="text-xs text-[#6B7873]">
                    Photo, nom, nombre de pièces et tarification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-[#6B7873] hover:text-[#1C2321] p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 mt-5">

              {!isServiceDept && (
                <>
                  {/* ── Scan Indicator Banner ── */}
                  <div className="flex items-center gap-2.5 bg-[#E4E9E1]/50 border border-[#0F4C4A]/20 rounded-xl px-3.5 py-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-none transition-all duration-300 ${
                        barcode.length > 3
                          ? 'bg-[#0F4C4A] shadow-[0_0_0_4px_rgba(15,76,74,0.2)]'
                          : 'bg-[#B8B2A0]'
                      }`}
                    />
                    <span className="text-[12px] text-[#3f5b52]">
                      {barcode.length > 3 ? (
                        <>
                          Code détecté :
                          <strong className="font-mono ml-1">{barcode}</strong>
                        </>
                      ) : (
                        'Cliquez dans le champ ci-dessous puis scannez l\'article avec la douchette.'
                      )}
                    </span>
                  </div>

                  {/* ── Article déjà enregistré avec ce code-barres ── */}
                  {duplicateProduct && (
                    <div className="flex items-center justify-between gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                      <span className="text-[12px] text-amber-800">
                        Ce code-barres est déjà utilisé par <strong>« {duplicateProduct.name} »</strong> (stock actuel : {duplicateProduct.qty}). Scanner un article déjà enregistré ne crée pas de doublon.
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditForm(duplicateProduct)}
                        className="shrink-0 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition"
                      >
                        Modifier ce produit
                      </button>
                    </div>
                  )}

                  {/* ── Code-barres ── */}
                  <div>
                    <label className="block text-xs font-bold text-[#1C2321] mb-1">
                      Code-barres (EAN-13) — Scanner ou saisir manuellement
                    </label>
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (barcode.trim().length > 3) {
                            (document.querySelector('[data-prod-field="name"]') as HTMLInputElement)?.focus();
                          }
                        }
                      }}
                      placeholder="Scannez ici ou tapez le code EAN-13…"
                      autoComplete="off"
                      autoFocus
                      className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-mono focus:outline-none focus:border-[#0F4C4A] placeholder:font-sans placeholder:text-[#B8B2A0]"
                    />
                  </div>
                </>
              )}

              {/* Photo Upload & Preview */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1.5">
                  {isServiceDept ? 'Icône / Photo du Service (optionnel)' : 'Photo du Produit'}
                </label>
                <div className="flex items-center gap-4 bg-[#F7F3EC] p-3 rounded-xl border border-[#E7E0D3]">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white border border-[#E7E0D3] shrink-0 flex items-center justify-center text-3xl">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Aperçu produit"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{selectedEmoji}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex gap-2 mb-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold bg-white text-[#0F4C4A] border border-[#0F4C4A] hover:bg-[#E4E9E1] px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Téléverser la photo</span>
                      </button>
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={() => setImagePreview('')}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          Supprimer photo
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B7873]">
                      Téléversez une photo claire de l'article (JPG, PNG).
                    </p>
                  </div>
                </div>

                {/* Emoji / Icône de secours */}
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-[#6B7873]">Ou choisir une icône :</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {emojiOptions.map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setSelectedEmoji(em)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center cursor-pointer transition ${
                          selectedEmoji === em && !imagePreview
                            ? 'bg-[#0F4C4A] text-white shadow-xs'
                            : 'bg-[#F7F3EC] hover:bg-[#E4E9E1]'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nom du Produit */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Nom du {itemWord} (Désignation) *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ex: Savon Noir Beldi à l'Eucalyptus"
                  required
                  data-prod-field="name"
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                />
              </div>

              {/* Catégorie & Prix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C2321] mb-1">
                    Catégorie
                  </label>
                  {myDept && myDeptCategories && myDeptCategories.length > 1 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {myDeptCategories.map(cat => {
                        const meta = CATEGORY_META[cat] ?? { icon: myDept.icon, label: cat };
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat as ProductCategory)}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              category === cat
                                ? 'bg-[#0F4C4A] border-[#0F4C4A] text-white'
                                : 'bg-[#F7F3EC] border-[#E7E0D3] text-[#1C2321] hover:bg-[#E4E9E1]'
                            }`}
                          >
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : myDept ? (
                    <div className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans flex items-center gap-1.5">
                      <span>{myDept.icon}</span>
                      <span>{myDept.label}</span>
                    </div>
                  ) : (
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as ProductCategory)}
                      className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                    >
                      <option value="savons">Savons & Gommages</option>
                      <option value="huiles">Huiles & Parfums</option>
                      <option value="accessoires">Accessoires & Foutas</option>
                      <option value="linge">Linge & Bains</option>
                      <option value="soins">Soins du Corps</option>
                      {canAccessBoutiqueFemme && <option value="femmes">Boutique Femme</option>}
                      {canAccessBoutiqueHomme && <option value="hommes">Boutique Homme</option>}
                      <option value="hammam_bains">Hammam & Bains</option>
                      <option value="spa_massage">Esthétique</option>
                      <option value="coiffure_salon">Coiffure & Salon</option>
                      <option value="epilation_traditionnelle">Épilation Traditionnelle</option>
                      <option value="fitness_gym">Fitness Gym</option>
                      <option value="boissons">Boissons</option>
                      <option value="snacks">Snacks</option>
                      <option value="autres">Autres / Coffrets</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C2321] mb-1">
                    Prix de Vente ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="150"
                    required
                    className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                  />
                </div>
              </div>

              {/* Nombre de Pièces & Seuil d'alerte — une prestation n'a pas de stock */}
              {!isServiceDept && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#F7F3EC] p-3 rounded-xl border border-[#B8874B]/30">
                    <label className="block text-xs font-extrabold text-[#0F4C4A] mb-1">
                      Nombre de Pièces en Stock *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={e => setQty(e.target.value)}
                        placeholder="20"
                        required
                        className="w-full text-base font-bold font-mono p-2 bg-white border border-[#E7E0D3] rounded-lg text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
                      />
                      <span className="text-xs font-bold text-[#6B7873]">pièces</span>
                    </div>
                  </div>

                  <div className="bg-[#F7F3EC] p-3 rounded-xl border border-[#E7E0D3]">
                    <label className="block text-xs font-bold text-[#1C2321] mb-1">
                      Seuil d'alerte stock bas
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={minQty}
                        onChange={e => setMinQty(e.target.value)}
                        placeholder="5"
                        required
                        className="w-full text-base font-bold font-mono p-2 bg-white border border-[#E7E0D3] rounded-lg text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
                      />
                      <span className="text-xs font-bold text-[#6B7873]">pièces</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Description ou Propriétés (Optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="ex: Savon noir purifiant traditionnel 100% naturel enrichi à l'eucalyptus."
                  className="w-full text-xs p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E7E0D3]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="py-2.5 px-4 bg-[#F7F3EC] hover:bg-[#E7E0D3] text-[#1C2321] rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-[#0F4C4A] hover:bg-[#0A3735] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingProduct ? `Mettre à jour le ${itemWord.toLowerCase()}` : 'Ajouter au catalogue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
