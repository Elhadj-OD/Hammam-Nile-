import React from 'react';
import { useApp } from '../context/AppContext';
import { Menu, Calendar } from 'lucide-react';
import { HammamNileEmblem } from './HammamNileLogo';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { activeSection, settings, currentUser } = useApp();
  const isServiceDept =
    currentUser?.department === 'coiffure_salon' || currentUser?.department === 'epilation_traditionnelle';

  const getSectionInfo = () => {
    switch (activeSection) {
      case 'dashboard':
        return { title: 'Tableau de bord', desc: 'Vue d’ensemble des activités et performances' };
      case 'caisse':
        return { title: 'Caisse & Point de Vente', desc: 'Encaissement rapide et gestion de commande' };
      case 'mes-ventes':
        return { title: 'Commandes & Ventes', desc: 'Historique des transactions et tickets émis' };
      case 'devis':
        return { title: 'Devis & Pro-forma', desc: 'Émission et suivi des devis clients' };
      case 'factures':
        return { title: 'Factures Clients', desc: 'Gestion des règlements et créances' };
      case 'clients':
        return { title: 'Clientes du Hammam', desc: 'Fichier clientes, fidélité et coordonnées' };
      case 'inventaire':
        return { title: 'Inventaire des Produits', desc: 'État des stocks, alertes et valorisation' };
      case 'journal-caisses':
        return { title: 'Journal des Caisses', desc: 'Détail des ventes encaissées, caisse par caisse, pour vérification' };
      case 'produits':
        return isServiceDept
          ? { title: 'Gestion des Services', desc: 'Ajout et modification des prestations' }
          : { title: 'Gestion du Catalogue', desc: 'Ajout et modification des articles' };
      case 'mouvements':
        return { title: 'Mouvements de Stock', desc: 'Entrées, sorties et ajustements' };
      case 'prelevements-hammam':
        return { title: 'Prélèvements Hammam & Cabines', desc: 'Produits boutique prélevés pour les soins, gommages et vestiaires' };
      case 'rapports':
        return { title: 'Rapports & Statistiques', desc: 'Analyse financière et chiffre d’affaires' };
      case 'parametres':
        return { title: 'Paramètres Boutique', desc: 'Configuration de l’établissement Hammam Nile' };
      default:
        return { title: 'Boutique Hammam Nile', desc: 'Caisse & Gestion' };
    }
  };

  const info = getSectionInfo();
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-[#E7E0D3] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="xl:hidden p-2 rounded-xl text-[#004CB7] hover:bg-[#F0F5FD] transition cursor-pointer"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-9 h-9 rounded-xl bg-[#F0F5FD] border border-[#004CB7]/20 items-center justify-center p-1.5 shrink-0">
            <HammamNileEmblem className="w-full h-full" color="#004CB7" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#1C2321] leading-tight font-sans">
              {info.title}
            </h1>
            <p className="text-[11px] text-[#6B7873] hidden sm:block">
              {info.desc}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Date badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F3EC] rounded-xl text-[#6B7873] text-xs font-medium border border-[#E7E0D3]">
          <Calendar className="w-3.5 h-3.5 text-[#004CB7]" />
          <span className="capitalize text-[#1C2321]">{currentDate}</span>
        </div>

        {/* Currency badge */}
        <div className="px-2.5 py-1 bg-[#F0F5FD] text-[#004CB7] rounded-xl text-xs font-extrabold tracking-wide border border-[#004CB7]/20">
          {settings.currency}
        </div>
      </div>
    </header>
  );
};
