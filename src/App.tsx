import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginView } from './components/LoginView';
import { ForcePasswordChangeView } from './components/ForcePasswordChangeView';
import { Sidebar } from './components/Sidebar';
import { HammamNileEmblem } from './components/HammamNileLogo';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CaisseView } from './components/CaisseView';
import { EpilationServicesView } from './components/EpilationServicesView';
import { CoiffureServicesView } from './components/CoiffureServicesView';
import { EstheticServicesView } from './components/EstheticServicesView';
import { BrushingServicesView } from './components/BrushingServicesView';
import { BrushingClientsView } from './components/BrushingClientsView';
import { MesVentesView } from './components/MesVentesView';
import { DevisView } from './components/DevisView';
import { FacturesView } from './components/FacturesView';
import { ClientsView } from './components/ClientsView';
import { InventaireView } from './components/InventaireView';
import { JournalCaissesView } from './components/JournalCaissesView';
import { ProduitsView } from './components/ProduitsView';
import { MouvementsView } from './components/MouvementsView';
import { RapportsView } from './components/RapportsView';
import { ParametresView } from './components/ParametresView';
import { CaissieresView } from './components/CaissieresView';
import { PrelevementsHammamView } from './components/PrelevementsHammamView';
import { CommissionsLaveursView } from './components/CommissionsLaveursView';
import { LaveursView } from './components/LaveursView';
import { AbonnementsGymView } from './components/AbonnementsGymView';
import { DechargeView } from './components/DechargeView';
import { DepensesView } from './components/DepensesView';
import { AssistantView } from './components/AssistantView';
import { ReceiptModal } from './components/ReceiptModal';
import { AuthSwitchModal } from './components/AuthSwitchModal';

const MainLayout: React.FC = () => {
  const { currentUser, authLoading, activeSection, lastSale, setLastSale } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#051B33]">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  if (currentUser.mustChangePassword) {
    return <ForcePasswordChangeView />;
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardView />;
      case 'caisse':
        // L'admin n'a pas de partie caisse : elle vérifie, elle ne vend pas.
        // Épilation (Helwa & Henné) et Coiffure & Salon : prestations, pas
        // un panier boutique — vue dédiée façon "Nouveau Service" (comme
        // le Hammam), sans commission, sans scanner.
        if (currentUser.role === 'gerant') return <DashboardView />;
        if (currentUser.department === 'epilation_traditionnelle') return <EpilationServicesView />;
        if (currentUser.department === 'coiffure_salon') return <CoiffureServicesView />;
        if (currentUser.department === 'spa_massage') return <EstheticServicesView />;
        if (currentUser.department === 'brushing') return <BrushingServicesView />;
        return <CaisseView />;
      case 'mes-ventes':
        return <MesVentesView />;
      case 'devis':
        return <DevisView />;
      case 'factures':
        return <FacturesView />;
      case 'clients':
        // Brushing : vue dédiée (historique + clients les plus fidèles sur
        // ce service uniquement, recherche par nom/numéro) au lieu du CRM
        // général réservé à la gérante.
        return currentUser.department === 'brushing' ? <BrushingClientsView /> : <ClientsView />;
      case 'inventaire':
        // Vue de stock centralisée : réservée à la gérante
        return currentUser.role === 'gerant' ? <InventaireView /> : <DashboardView />;
      case 'journal-caisses':
        // Détail des ventes de chaque caisse, pour vérification : réservé à la gérante
        return currentUser.role === 'gerant' ? <JournalCaissesView /> : <DashboardView />;
      case 'produits':
        return <ProduitsView />;
      case 'mouvements':
        return currentUser.role === 'gerant' ? <MouvementsView /> : <DashboardView />;
      case 'prelevements-hammam':
      case 'commissions-laveurs': {
        // Prélèvements & Hammam : réservés à Boutique Homme, Boutique
        // Femme+Hammam et l'admin — pas les autres caisses.
        const canSeeHammam =
          currentUser.role === 'gerant' ||
          currentUser.department === 'boutique_homme' ||
          currentUser.department === 'boutique_femme';
        if (!canSeeHammam) return <DashboardView />;
        return activeSection === 'prelevements-hammam' ? <PrelevementsHammamView /> : <CommissionsLaveursView />;
      }
      case 'laveurs': {
        // Boutique Homme (Elhadj) + Boutique Femme/Hammam (@hammam) uniquement — pas l'admin.
        const canSeeLaveurs =
          currentUser.role !== 'gerant' &&
          (currentUser.department === 'boutique_homme' || currentUser.department === 'boutique_femme');
        return canSeeLaveurs ? <LaveursView /> : <DashboardView />;
      }
      case 'abonnements-gym': {
        const canSeeGym = currentUser.role === 'gerant' || currentUser.department === 'fitness_gym';
        return canSeeGym ? <AbonnementsGymView /> : <DashboardView />;
      }
      case 'rapports':
        return <RapportsView />;
      case 'decharge':
        // Clôture journalière : chaque caissière clôture sa propre caisse.
        // Réservée aux caissières (RLS + accès UI) — la gérante n'y a plus accès.
        // Pas pour Brushing (pas de caisse espèces/mobile money à clôturer).
        return currentUser.role === 'caissier' && currentUser.department !== 'brushing'
          ? <DechargeView />
          : <DashboardView />;
      case 'depenses':
        // Dépenses (achats marché/fournisseur) — réservée à la gérante (RLS + accès UI).
        return currentUser.role === 'gerant' ? <DepensesView /> : <DashboardView />;
      case 'utilisateurs':
        return <CaissieresView />;
      case 'parametres':
        return <ParametresView />;
      case 'assistant':
        return <AssistantView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen app-water-bg flex text-[#1C2321]">
      {/* Sidebar navigation */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main Content Area */}
      <div className="no-print relative flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Emblème géant en filigrane — même esprit que l'écran de connexion */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0" aria-hidden="true">
          <HammamNileEmblem className="w-[1100px] h-[1100px] opacity-[0.05]" color="#004CB7" />
        </div>

        <Header onMenuToggle={() => setMobileMenuOpen(prev => !prev)} />

        <main className="relative z-10 flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto">
          {renderActiveSection()}
        </main>
      </div>

      {/* POS Receipt Modal on completed sale or ticket inspection */}
      {lastSale && (
        <ReceiptModal sale={lastSale} onClose={() => setLastSale(null)} />
      )}

      {/* Password verification modal for switching parts */}
      <AuthSwitchModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
