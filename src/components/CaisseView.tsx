import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod } from '../types';
import { DEPARTMENTS } from '../lib/departments';
import { MOBILE_OPERATORS } from '../lib/mobileOperators';
import {
  Search,
  Receipt,
  RotateCcw,
} from 'lucide-react';

const CATS = [
  { key: 'all', label: 'Tous' },
  { key: 'savons', label: 'Savons' },
  { key: 'huiles', label: 'Huiles' },
  { key: 'linge', label: 'Linge' },
  { key: 'accessoires', label: 'Accessoires' },
  { key: 'coffrets', label: 'Coffrets' },
  { key: 'femmes', label: '💄 Boutique Femme' },
  { key: 'hommes', label: '🧔 Boutique Homme' },
];

export const CaisseView: React.FC = () => {
  const {
    currentUser,
    products,
    cart,
    addToCart,
    updateCartQty,
    clearCart,
    cartTotal,
    completeSale,
    settings,
    clients,
    lastSale,
    setLastSale,
    setActiveSection,
  } = useApp();

  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [mobileOperator, setMobileOperator] = useState<string>('Bankily');
  const [customerName, setCustomerName] = useState('Comptoir');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const [showCashierSwitch, setShowCashierSwitch] = useState(false);
  const { users, switchUser } = useApp();

  // ── Barcode Scanner ──
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanCode, setScanCode] = useState('');
  const [scanMsg, setScanMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [scanActive, setScanActive] = useState(false);

  // Live Clock
  const [clockTime, setClockTime] = useState('--:--');
  const [clockDate, setClockDate] = useState('--');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockTime(
        now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      );
      setClockDate(
        now.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (n: number) => {
    return `${n.toLocaleString('fr-FR')} ${settings.currency}`;
  };

  // Une caissière avec un département assigné n'a accès qu'à sa propre caisse
  const myDept = currentUser?.department ? DEPARTMENTS[currentUser.department] : null;

  // Le hammam des femmes se vend dans la même caisse que la Boutique Femme
  // (même logique que le hammam des garçons, géré dans leur propre caisse) —
  // pas une caisse séparée. Chaque profil = une seule caisse.
  const myDeptCategories =
    myDept?.category === 'femmes'
      ? ['femmes', 'hammam_bains']
      : myDept?.category === 'boissons'
        ? ['boissons', 'snacks']
        : myDept
          ? [myDept.category]
          : null;

  // La Boutique Femme est réservée aux caissières (genre "femme" ou non renseigné)
  const canAccessBoutiqueFemme = currentUser?.gender !== 'homme';
  // La Boutique Homme est réservée aux caissiers marqués "homme"
  const canAccessBoutiqueHomme = currentUser?.gender === 'homme';
  const visibleCats = CATS.filter(
    c =>
      (c.key !== 'femmes' || canAccessBoutiqueFemme) &&
      (c.key !== 'hommes' || canAccessBoutiqueHomme)
  );

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      search.trim() === '' ||
      p.name.toLowerCase().includes(search.toLowerCase());

    if (myDeptCategories) {
      return myDeptCategories.includes(p.category) && matchesSearch;
    }

    if (p.category === 'femmes' && !canAccessBoutiqueFemme) return false;
    if (p.category === 'hommes' && !canAccessBoutiqueHomme) return false;
    const matchesCat = activeCat === 'all' || p.category === activeCat;
    return matchesCat && matchesSearch;
  });

  // Calculate totals (Sans aucune taxe appliquée)
  const subtotal = cartTotal;
  const discount = 0;
  const total = Math.max(0, subtotal - discount);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    completeSale(paymentMethod, customerName, {
      discount,
      paymentDetail: paymentMethod === 'cash' ? 'Espèces' : mobileOperator,
      customerPhone,
    });
  };

  // Handles Enter key on the scan input (scanner fires keystrokes + Enter)
  const handleBarcodeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = scanCode.trim();
      if (code.length > 2) {
        const found = products.find(p => {
          if (p.barcode !== code) return false;
          if (myDeptCategories) return myDeptCategories.includes(p.category);
          if (p.category === 'femmes' && !canAccessBoutiqueFemme) return false;
          if (p.category === 'hommes' && !canAccessBoutiqueHomme) return false;
          return true;
        });
        if (found) {
          addToCart(found);
          setScanMsg({ text: `✓ ${found.name} ajouté au ticket`, type: 'ok' });
        } else {
          setScanMsg({ text: `Article introuvable : ${code}`, type: 'err' });
        }
        setScanCode('');
        setTimeout(() => setScanMsg(null), 3000);
      }
    }
  };

  // Auto-focus the scan input when the caisse view mounts
  useEffect(() => {
    const t = setTimeout(() => scanInputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Revient à "Tous" si l'onglet Boutique Femme/Homme devient inaccessible (ex: changement de caissier)
  useEffect(() => {
    if (
      (activeCat === 'femmes' && !canAccessBoutiqueFemme) ||
      (activeCat === 'hommes' && !canAccessBoutiqueHomme)
    ) {
      setActiveCat('all');
    }
  }, [activeCat, canAccessBoutiqueFemme, canAccessBoutiqueHomme]);

  const isGerant = currentUser?.role === 'gerant';
  const displayName = currentUser?.name || (isGerant ? 'Aïchetou' : 'Fatimetou');
  const displayRole = isGerant ? 'Administratrice' : myDept ? myDept.label : 'Caissière';
  const hasPhoto = currentUser?.avatar && (currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http'));
  const avatarInitials = currentUser?.avatar && !hasPhoto ? currentUser.avatar : displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  // Un profil verrouillé par l'admin ne peut pas changer d'espace sur un poste partagé
  const canSwitchProfile = !currentUser?.locked || isGerant;

  return (
    <div className="w-full max-w-[1360px] mx-auto">
      {/* 2-Column POS Box */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] bg-white rounded-[22px] overflow-hidden shadow-[0_30px_60px_-25px_rgba(10,55,53,0.35)] border border-[#E7E0D3] min-h-[640px]">
        {/* MAIN PRODUCT CATALOG AREA */}
        <div className="p-5 sm:p-6 flex flex-col gap-5 border-r border-[#E7E0D3] overflow-hidden bg-white">
          {/* Topbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Search Input */}
            <div className="flex-1 min-w-[200px] flex items-center gap-2.5 bg-[#F7F3EC] rounded-xl px-4 py-2 text-[#6B7873] text-[13.5px]">
              <Search className="w-4 h-4 text-[#6B7873] shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un produit..."
                className="border-none bg-transparent outline-hidden w-full text-[13.5px] font-sans text-[#1C2321] placeholder-[#6B7873]"
              />
            </div>

            {/* Quick Link: Prélèvement Hammam */}
            <button
              type="button"
              onClick={() => setActiveSection('prelevements-hammam')}
              className="px-3 py-2 rounded-xl bg-[#E4E9E1] hover:bg-[#0F4C4A] hover:text-white text-[#0F4C4A] border border-[#0F4C4A]/20 transition font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              title="Enregistrer un produit pris par le Hammam"
            >
              <span>✨</span>
              <span className="hidden sm:inline">Sortie Hammam</span>
            </button>

            {/* Cashier Badge with quick switch (désactivé si le profil est verrouillé) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => canSwitchProfile && setShowCashierSwitch(prev => !prev)}
                className={`flex items-center gap-2.5 p-1 rounded-xl transition text-left border-0 bg-transparent ${
                  canSwitchProfile ? 'hover:bg-[#F7F3EC] cursor-pointer' : 'cursor-default'
                }`}
                title={canSwitchProfile ? "Changer d'utilisateur / caissière" : 'Profil verrouillé par l\'admin — déconnectez-vous pour changer de compte'}
              >
                {hasPhoto ? (
                  <img
                    src={currentUser?.avatar}
                    alt={displayName}
                    className="w-9 h-9 rounded-full object-cover shadow-xs border border-[#E7E0D3]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#0F4C4A] text-white flex items-center justify-center font-bold text-[12.5px] shadow-xs">
                    {avatarInitials}
                  </div>
                )}
                <div className="leading-tight">
                  <span className="font-bold text-[13px] block text-[#1C2321]">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-[#6B7873] block">
                    {displayRole} {canSwitchProfile ? '▾' : '🔒'}
                  </span>
                </div>
              </button>

              {showCashierSwitch && canSwitchProfile && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[#E7E0D3] rounded-2xl shadow-xl p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[10px] font-bold uppercase text-[#6B7873] px-2.5 py-1">
                    Sélectionner l'opérateur
                  </div>
                  {users.map(u => {
                    const isSelected = u.username === currentUser?.username;
                    const uHasPhoto = u.avatar && (u.avatar.startsWith('data:') || u.avatar.startsWith('http'));
                    return (
                      <button
                        key={u.username}
                        type="button"
                        onClick={() => {
                          switchUser(u.username);
                          setShowCashierSwitch(false);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left cursor-pointer transition ${
                          isSelected ? 'bg-[#E4E9E1] font-bold' : 'hover:bg-[#F7F3EC]'
                        }`}
                      >
                        {uHasPhoto ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#0F4C4A] text-white flex items-center justify-center font-bold text-[10.5px]">
                            {u.avatar || u.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#1C2321] truncate">
                            {u.name}
                          </div>
                          <div className="text-[10px] text-[#6B7873] capitalize">
                            {u.role === 'gerant' ? 'Admin' : u.department ? DEPARTMENTS[u.department].label : 'Caissière'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Clock */}
            <div className="text-right leading-tight min-w-[75px] pl-2 border-l border-[#E7E0D3]">
              <div className="font-bold text-[13.5px] text-[#1C2321] font-mono">
                {clockTime}
              </div>
              <div className="text-[11px] text-[#6B7873]">{clockDate}</div>
            </div>
          </div>

          {/* ── Barcode Scan Strip ── */}
          <div
            className="flex items-center gap-2.5 bg-[#E4E9E1]/50 border border-[#0F4C4A]/20 rounded-xl px-3.5 py-2 cursor-text"
            onClick={() => scanInputRef.current?.focus()}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full flex-none transition-all duration-300 ${
                scanActive
                  ? 'bg-[#0F4C4A] shadow-[0_0_0_4px_rgba(15,76,74,0.25)]'
                  : 'bg-[#B8B2A0]'
              }`}
            />
            <span className="text-[11px] font-bold text-[#3f5b52] shrink-0 select-none">Scanner :</span>
            <input
              ref={scanInputRef}
              type="text"
              value={scanCode}
              onChange={e => {
                setScanCode(e.target.value);
                setScanActive(e.target.value.length > 0);
              }}
              onKeyDown={handleBarcodeKey}
              onFocus={() => setScanActive(true)}
              onBlur={() => { if (!scanCode) setScanActive(false); }}
              placeholder="Scannez l’article avec la douchette ou tapez le code-barres manuellement…"
              autoComplete="off"
              className="flex-1 bg-transparent border-none outline-none text-[12.5px] font-mono text-[#1C2321] placeholder:font-sans placeholder:text-[#8B9893] placeholder:text-[11px]"
            />
            {scanMsg ? (
              <span
                className={`text-xs font-bold whitespace-nowrap shrink-0 ${
                  scanMsg.type === 'ok' ? 'text-[#0F4C4A]' : 'text-rose-600'
                }`}
              >
                {scanMsg.text}
              </span>
            ) : (
              <span className="text-[10px] text-[#8B9893] whitespace-nowrap shrink-0 select-none">
                ↵ Entrée pour valider
              </span>
            )}
          </div>

          {/* Category Tabs — verrouillé sur le département si assigné, sinon tous les rayons */}
          {myDept ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0F4C4A] text-white text-[13px] font-bold w-fit">
              <span>{myDept.icon}</span>
              <span>{myDept.label}</span>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {visibleCats.map(c => {
                const isActive = activeCat === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setActiveCat(c.key)}
                    className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-bold cursor-pointer transition-colors duration-150 ${
                      isActive
                        ? 'bg-[#0F4C4A] text-white'
                        : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center text-[#6B7873]">
                <p className="font-semibold text-sm">Aucun produit trouvé</p>
                <p className="text-xs text-[#6B7873]/70 mt-1">
                  Essayez un autre mot-clé ou sélectionnez une autre catégorie.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredProducts.map(p => {
                  const cartItem = cart.find(item => item.id === p.id);
                  const qtyInCart = cartItem?.cartQty || 0;

                  return (
                    <div
                      key={p.id}
                      className={`border rounded-2xl p-3 text-left bg-white flex flex-col justify-between transition-colors duration-150 ${
                        qtyInCart > 0
                          ? 'border-[#B8874B] shadow-xs'
                          : 'border-[#E7E0D3] hover:border-[#B8874B]/50'
                      }`}
                    >
                      <div>
                        {/* Media Box */}
                        <div className="h-[76px] rounded-xl bg-[#E4E9E1] flex items-center justify-center text-[30px] mb-2.5 select-none overflow-hidden">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            p.emoji || '🧖‍♀️'
                          )}
                        </div>

                        {/* Title & Price */}
                        <h4 className="text-[13px] font-bold text-[#1C2321] mb-1 leading-snug line-clamp-2">
                          {p.name}
                        </h4>
                        <div className="text-[12.5px] text-[#0F4C4A] font-bold">
                          {fmt(p.price)}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-2.5 pt-1">
                        {qtyInCart > 0 ? (
                          <div className="flex items-center justify-between bg-[#E4E9E1] rounded-full p-1 w-full">
                            <button
                              type="button"
                              onClick={() => updateCartQty(p.id, -1)}
                              className="w-6 h-6 rounded-full bg-[#0F4C4A] text-white font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-[#0A3735] transition leading-none shrink-0"
                            >
                              –
                            </button>
                            <span className="font-extrabold text-[13px] text-[#1C2321]">
                              {qtyInCart}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(p.id, 1)}
                              className="w-6 h-6 rounded-full bg-[#0F4C4A] text-white font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-[#0A3735] transition leading-none shrink-0"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(p)}
                            className="bg-[#E4E9E1] text-[#0F4C4A] hover:bg-[#0F4C4A] hover:text-white rounded-full py-2 px-3.5 font-bold text-[11.5px] cursor-pointer w-full transition duration-150"
                          >
                            Ajouter
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ORDER PANEL */}
        <div className="p-5 flex flex-col gap-4 bg-white border-t lg:border-t-0 border-[#E7E0D3]">
          {/* Order Head */}
          <div className="flex items-center justify-between">
            <h3 className="font-display font-medium text-[16px] text-[#1C2321] m-0">
              Commande en cours
            </h3>
            <span className="bg-[#E4E9E1] text-[#0F4C4A] text-[11px] font-bold px-3 py-1.5 rounded-full">
              {myDept ? myDept.label : 'Boutique'}
            </span>
          </div>

          {/* Customer Selection & Contact */}
          <div className="bg-[#F7F3EC] p-2.5 rounded-2xl border border-[#E7E0D3] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#0F4C4A] uppercase tracking-wider flex items-center gap-1">
                <span>👤</span>
                <span>Fiche Client & Carnet Admin</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomerName('Client Comptoir');
                  setCustomerPhone('');
                }}
                className="text-[10px] text-[#6B7873] hover:text-[#0F4C4A] font-semibold underline cursor-pointer"
              >
                Passage simple
              </button>
            </div>

            <div className="space-y-1.5">
              {/* Customer Name */}
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={e => {
                    setCustomerName(e.target.value);
                    if (!showClientList) setShowClientList(true);
                  }}
                  onFocus={() => setShowClientList(true)}
                  placeholder="Nom du client (visible sur ticket) *"
                  className="w-full bg-white border border-[#E7E0D3] rounded-xl px-2.5 py-1.5 text-xs text-[#1C2321] placeholder-[#8B9893] focus:border-[#0F4C4A] focus:outline-hidden"
                />

                {showClientList && clients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E7E0D3] rounded-xl shadow-xl p-1.5 z-30 max-h-44 overflow-y-auto">
                    <div className="text-[10px] font-bold text-[#6B7873] px-2 py-1 uppercase">
                      Clients enregistrés ({clients.length})
                    </div>
                    {clients
                      .filter(
                        c =>
                          !customerName ||
                          customerName === 'Client Comptoir' ||
                          c.name.toLowerCase().includes(customerName.toLowerCase()) ||
                          c.phone.includes(customerName)
                      )
                      .slice(0, 5)
                      .map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setCustomerName(c.name);
                            setCustomerPhone(c.phone || '');
                            setShowClientList(false);
                          }}
                          className="p-2 hover:bg-[#F0F5FD] rounded-lg text-xs cursor-pointer flex justify-between items-center transition"
                        >
                          <div>
                            <div className="font-bold text-[#1C2321]">{c.name}</div>
                            <div className="text-[10px] text-[#004CB7]">{c.phone || 'Pas de tél'}</div>
                          </div>
                          <span className="text-[10px] bg-[#E4E9E1] text-[#0F4C4A] font-bold px-1.5 py-0.5 rounded">
                            {c.purchaseCount || 0} achat{(c.purchaseCount || 0) > 1 ? 's' : ''}
                          </span>
                        </div>
                      ))}
                    <button
                      type="button"
                      onClick={() => setShowClientList(false)}
                      className="w-full text-center text-[11px] text-[#6B7873] hover:text-[#1C2321] py-1 border-t border-[#E7E0D3] mt-1"
                    >
                      Fermer la liste
                    </button>
                  </div>
                )}
              </div>

              {/* Customer Phone */}
              <div>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Numéro tél (ex: 45 25 10 20 - Masqué sur ticket)"
                  className="w-full bg-white border border-[#E7E0D3] rounded-xl px-2.5 py-1.5 text-xs text-[#1C2321] placeholder-[#8B9893] focus:border-[#0F4C4A] focus:outline-hidden"
                />
              </div>

              <div className="text-[10px] text-[#6B7873] flex items-center justify-between px-0.5">
                <span>Le nom apparaît sur le reçu</span>
                <span className="text-emerald-700 font-medium">Tél sauvé pour l'Admin</span>
              </div>
            </div>
          </div>

          {/* Order Lines */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-[160px] max-h-[280px] pr-1">
            {cart.length === 0 ? (
              <div className="text-[#6B7873] text-[12.5px] text-center py-7 px-2 border border-dashed border-[#E7E0D3] rounded-2xl bg-[#F7F3EC]/50 my-auto">
                Aucun article sélectionné.
                <br />
                Touchez un produit pour l'ajouter.
              </div>
            ) : (
              cart.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-bold text-[#1C2321] block truncate">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-[#6B7873]">
                      {fmt(item.price)} l'unité
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#F7F3EC] rounded-full p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, -1)}
                      className="w-[18px] h-[18px] rounded-full bg-[#0F4C4A] text-white text-[11px] font-bold flex items-center justify-center cursor-pointer leading-none"
                    >
                      –
                    </button>
                    <span className="text-[12px] font-extrabold min-w-[14px] text-center text-[#1C2321]">
                      {item.cartQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, 1)}
                      className="w-[18px] h-[18px] rounded-full bg-[#0F4C4A] text-white text-[11px] font-bold flex items-center justify-center cursor-pointer leading-none"
                    >
                      +
                    </button>
                  </div>

                  <span className="text-[13px] font-bold text-[#1C2321] whitespace-nowrap min-w-[65px] text-right">
                    {fmt(item.price * item.cartQty)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="border-t border-[#E7E0D3] pt-3">
            <div className="text-[11px] font-bold text-[#6B7873] uppercase mb-1.5">
              Mode de Règlement
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  paymentMethod === 'cash'
                    ? 'bg-[#0F4C4A] text-white border-[#0F4C4A] shadow-xs'
                    : 'bg-[#F7F3EC] text-[#1C2321] border-[#E7E0D3] hover:bg-[#E4E9E1]'
                }`}
              >
                <span>💵</span>
                <span>Espèces</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('mobile')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  paymentMethod === 'mobile'
                    ? 'bg-[#0F4C4A] text-white border-[#0F4C4A] shadow-xs'
                    : 'bg-[#F7F3EC] text-[#1C2321] border-[#E7E0D3] hover:bg-[#E4E9E1]'
                }`}
              >
                <span>📱</span>
                <span>Mobile Money</span>
              </button>
            </div>

            {/* Select Mauritanian Mobile Wallet if mobile payment chosen */}
            {paymentMethod === 'mobile' && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MOBILE_OPERATORS.map(op => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setMobileOperator(op)}
                    className={`flex-1 min-w-[65px] py-1 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                      mobileOperator === op
                        ? 'bg-[#0F4C4A] text-white border-[#0F4C4A]'
                        : 'bg-[#F7F3EC] text-[#1C2321] border-[#E7E0D3] hover:bg-[#E4E9E1]'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Totals (Sans Taxe) */}
          <div className="border-t border-[#E7E0D3] pt-3 flex flex-col gap-1.5 text-[13px] text-[#6B7873]">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span className="font-semibold text-[#1C2321]">{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[#C1613F]">
                <span>Remise</span>
                <span className="font-semibold">- {fmt(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[16px] font-extrabold text-[#1C2321] border-t border-dashed border-[#E7E0D3] pt-2.5 mt-0.5 font-display">
              <span>Total à payer</span>
              <span className="text-[#0F4C4A]">{fmt(total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="flex-1 bg-[#F7F3EC] text-[#1C2321] hover:bg-[#E7E0D3] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 px-3 font-bold text-[13px] transition cursor-pointer font-sans"
            >
              Mettre en attente
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="flex-[1.4] bg-[#0F4C4A] hover:bg-[#0A3735] text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 px-4 font-bold text-[13px] transition cursor-pointer flex items-center justify-between font-sans shadow-md"
            >
              <span>Encaisser</span>
              <span className="font-extrabold">{fmt(total)}</span>
            </button>
          </div>

          {/* Last Sale reprint button if available */}
          {lastSale && (
            <button
              type="button"
              onClick={() => setLastSale(lastSale)}
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#0F4C4A] hover:text-[#0A3735] py-1 transition cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Voir / Réimprimer le dernier ticket</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
