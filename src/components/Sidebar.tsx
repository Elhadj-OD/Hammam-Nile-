import React from 'react';
import { useApp } from '../context/AppContext';
import { ActiveSection, UserRole } from '../types';
import {
  X,
  AlertTriangle,
} from 'lucide-react';
import { HammamNileEmblem } from './HammamNileLogo';

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, setMobileOpen }) => {
  const {
    currentUser,
    activeSection,
    setActiveSection,
    switchRole,
    logout,
    lowStockProducts,
    cart,
    hammamUsages,
  } = useApp();

  if (!currentUser) return null;

  const isGerant = currentUser.role === 'gerant';
  // L'admin vérifie les deux parties ; une caissière ne prélève que sur sa partie (genre)
  const prelevementLabel = isGerant
    ? 'Prélèvements Hammam'
    : `Prélèvement (${currentUser.gender === 'homme' ? 'Hommes' : 'Femmes'})`;

  const handleNavClick = (section: ActiveSection) => {
    setActiveSection(section);
    if (setMobileOpen) setMobileOpen(false);
  };

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen && setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-[218px] bg-[#072423] text-[#EFE8D8] flex flex-col p-[22px_16px] transition-transform duration-300 ease-in-out shrink-0 border-r border-[#E7E0D3]/10 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header with official logo */}
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-[38px] h-[38px] rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm">
              <HammamNileEmblem className="w-full h-full" color="#004CB7" />
            </div>
            <div>
              <div
                className="text-[20px] leading-tight font-normal text-[#EFE8D8]"
                style={{ fontFamily: "'Alex Brush', 'Great Vibes', cursive" }}
              >
                Hammam Nile
              </div>
              <div className="text-[9px] opacity-65 tracking-[0.2em] font-sans uppercase font-bold">
                Hammam & Boutique
              </div>
            </div>
          </div>

          {setMobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 text-[#EFE8D8]/70 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Role Switcher */}
        <div className="flex bg-white/10 rounded-[10px] p-[3px] mb-[18px] gap-[3px]">
          <button
            type="button"
            onClick={() => handleRoleSwitch('gerant')}
            className={`flex-1 border-0 text-[11px] font-bold py-2 px-1 rounded-[7px] cursor-pointer transition-all duration-150 ${
              isGerant
                ? 'bg-[#B8874B] text-[#0A3735] opacity-100 shadow-xs'
                : 'bg-transparent text-[#EFE8D8] opacity-60 hover:opacity-85'
            }`}
            title="Partie Admin (Sophia)"
          >
            Admin (Sophia)
          </button>
          <button
            type="button"
            onClick={() => handleRoleSwitch('caissier')}
            className={`flex-1 border-0 text-[11px] font-bold py-2 px-1 rounded-[7px] cursor-pointer transition-all duration-150 ${
              !isGerant
                ? 'bg-[#004CB7] text-white opacity-100 shadow-xs'
                : 'bg-transparent text-[#EFE8D8] opacity-60 hover:opacity-85'
            }`}
            title="Partie Caisse (Elhadj)"
          >
            Caisse (Elhadj)
          </button>
        </div>

        {/* Navigation list */}
        <ul className="list-none p-0 m-0 flex flex-col gap-1 flex-1">
          {/* Caisse - Caissier(ère)s uniquement, pas l'admin (elle ne vend pas) */}
          {!isGerant && (
            <li
              onClick={() => handleNavClick('caisse')}
              className={`flex items-center justify-between p-[11px_12px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer transition-colors duration-150 ${
                activeSection === 'caisse'
                  ? 'bg-[#B8874B] text-[#0A3735] opacity-100 font-bold'
                  : 'opacity-75 hover:bg-white/[0.06] hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-[17px] h-[17px] shrink-0"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
                <span>Caisse</span>
              </div>
              {cart.length > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeSection === 'caisse'
                      ? 'bg-[#0A3735] text-[#B8874B]'
                      : 'bg-[#B8874B] text-[#0A3735]'
                  }`}
                >
                  {cart.length}
                </span>
              )}
            </li>
          )}

          {/* Commandes - Admin only */}
          {isGerant && (
            <li
              onClick={() => handleNavClick('mes-ventes')}
              className={`flex items-center gap-3 p-[11px_12px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer transition-colors duration-150 ${
                activeSection === 'mes-ventes' || activeSection === 'devis' || activeSection === 'factures'
                  ? 'bg-[#B8874B] text-[#0A3735] opacity-100 font-bold'
                  : 'opacity-75 hover:bg-white/[0.06] hover:opacity-100'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-[17px] h-[17px] shrink-0"
              >
                <path d="M3 3h18v4H3z" />
                <path d="M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7" />
              </svg>
              <span>Commandes</span>
            </li>
          )}

          {/* Clientes - Admin only */}
          {isGerant && (
            <li
              onClick={() => handleNavClick('clients')}
              className={`flex items-center gap-3 p-[11px_12px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer transition-colors duration-150 ${
                activeSection === 'clients'
                  ? 'bg-[#B8874B] text-[#0A3735] opacity-100 font-bold'
                  : 'opacity-75 hover:bg-white/[0.06] hover:opacity-100'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-[17px] h-[17px] shrink-0"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
              <span>Clientes</span>
            </li>
          )}

          {/* Statistiques des Ventes - Admin only */}
          {isGerant && (
            <li
              onClick={() => handleNavClick('rapports')}
              className={`flex items-center gap-3 p-[11px_12px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer transition-colors duration-150 ${
                activeSection === 'rapports'
                  ? 'bg-[#B8874B] text-[#0A3735] opacity-100 font-bold'
                  : 'opacity-75 hover:bg-white/[0.06] hover:opacity-100'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-[17px] h-[17px] shrink-0"
              >
                <path d="M3 3v18h18" />
                <path d="M7 15l4-6 4 3 5-8" />
              </svg>
              <span>Statistiques</span>
            </li>
          )}

          {/* Produits & Pièces - Admin only */}
          {isGerant && (
            <li
              onClick={() => handleNavClick('produits')}
              className={`flex items-center gap-3 p-[11px_12px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer transition-colors duration-150 ${
                activeSection === 'produits'
                  ? 'bg-[#B8874B] text-[#0A3735] opacity-100 font-bold'
                  : 'opacity-75 hover:bg-white/[0.06] hover:opacity-100'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-[17px] h-[17px] shrink-0"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>Produits</span>
            </li>
          )}

          {/* Caissières & Équipe - Admin only */}
          {isGerant && (
            <li
              onClick={() => handleNavClick('utilisateurs')}
              className={`flex items-center gap-3 p-[11px_12px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer transition-colors duration-150 ${
                activeSection === 'utilisateurs'
                  ? 'bg-[#B8874B] text-[#0A3735] opacity-100 font-bold'
                  : 'opacity-75 hover:bg-white/[0.06] hover:opacity-100'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-[17px] h-[17px] shrink-0"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Caissières</span>
            </li>
          )}

          {/* Prélèvements Hammam (Usage Interne) - All users */}
          <li
            onClick={() => handleNavClick('prelevements-hammam')}
            className={`flex items-center justify-between p-[11px_12px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer transition-colors duration-150 ${
              activeSection === 'prelevements-hammam'
                ? 'bg-[#B8874B] text-[#0A3735] opacity-100 font-bold'
                : 'opacity-75 hover:bg-white/[0.06] hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-[17px] h-[17px] shrink-0"
              >
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
              <span>{prelevementLabel}</span>
            </div>
            {hammamUsages.length > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeSection === 'prelevements-hammam'
                    ? 'bg-[#0A3735] text-[#B8874B]'
                    : 'bg-white/20 text-[#EFE8D8]'
                }`}
              >
                {hammamUsages.length}
              </span>
            )}
          </li>

          {/* Inventaire - All users */}
          <li
            onClick={() => handleNavClick('inventaire')}
            className={`flex items-center justify-between p-[11px_12px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer transition-colors duration-150 ${
              activeSection === 'inventaire' || activeSection === 'mouvements'
                ? 'bg-[#B8874B] text-[#0A3735] opacity-100 font-bold'
                : 'opacity-75 hover:bg-white/[0.06] hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-[17px] h-[17px] shrink-0"
              >
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Inventaire</span>
            </div>
            {lowStockProducts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            )}
          </li>

          {/* Paramètres - Admin only */}
          {isGerant && (
            <li
              onClick={() => handleNavClick('parametres')}
              className={`flex items-center gap-3 p-[11px_12px] rounded-[11px] text-[13.5px] font-semibold cursor-pointer transition-colors duration-150 ${
                activeSection === 'parametres'
                  ? 'bg-[#B8874B] text-[#0A3735] opacity-100 font-bold'
                  : 'opacity-75 hover:bg-white/[0.06] hover:opacity-100'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-[17px] h-[17px] shrink-0"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Paramètres</span>
            </li>
          )}
        </ul>

        {/* Low stock alert badge if any */}
        {lowStockProducts.length > 0 && isGerant && (
          <div className="mt-2 mb-2">
            <button
              onClick={() => handleNavClick('inventaire')}
              className="w-full text-left p-2 rounded-xl bg-rose-900/30 border border-rose-500/20 text-rose-200 hover:bg-rose-900/50 transition cursor-pointer text-[11px]"
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{lowStockProducts.length} stock(s) bas</span>
              </div>
            </button>
          </div>
        )}

        {/* Connected User Badge */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 mt-auto mb-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono shadow-xs ${
            isGerant ? 'bg-[#0A3735] text-white' : 'bg-[#004CB7] text-white'
          }`}>
            {isGerant ? 'SO' : 'EH'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#EFE8D8] truncate">{currentUser.name}</div>
            <div className="text-[10px] text-[#EFE8D8]/70">
              {isGerant ? 'Administratrice' : 'Caissier'}
            </div>
          </div>
        </div>

        {/* Logout / Lock Session */}
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 p-[10px_12px] text-[13px] font-semibold text-[#EFE8D8]/60 hover:text-rose-300 hover:bg-white/5 rounded-xl transition-all cursor-pointer w-full text-left border-0 bg-transparent"
          title="Verrouiller la session et revenir à l'écran de mot de passe"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-[16px] h-[16px]"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Verrouiller / Quitter</span>
        </button>
      </aside>
    </>
  );
};
