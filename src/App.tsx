import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginView } from './components/LoginView';
import { ForcePasswordChangeView } from './components/ForcePasswordChangeView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CaisseView } from './components/CaisseView';
import { MesVentesView } from './components/MesVentesView';
import { DevisView } from './components/DevisView';
import { FacturesView } from './components/FacturesView';
import { ClientsView } from './components/ClientsView';
import { InventaireView } from './components/InventaireView';
import { ProduitsView } from './components/ProduitsView';
import { MouvementsView } from './components/MouvementsView';
import { RapportsView } from './components/RapportsView';
import { ParametresView } from './components/ParametresView';
import { CaissieresView } from './components/CaissieresView';
import { PrelevementsHammamView } from './components/PrelevementsHammamView';
import { AssistantView } from './components/AssistantView';
import { ReceiptModal } from './components/ReceiptModal';
import { AuthSwitchModal } from './components/AuthSwitchModal';

const MainLayout: React.FC = () => {
  const { currentUser, authLoading, activeSection, lastSale, setLastSale } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#072423]">
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
        // L'admin n'a pas de partie caisse : elle vérifie, elle ne vend pas
        return currentUser.role === 'gerant' ? <DashboardView /> : <CaisseView />;
      case 'mes-ventes':
        return <MesVentesView />;
      case 'devis':
        return <DevisView />;
      case 'factures':
        return <FacturesView />;
      case 'clients':
        return <ClientsView />;
      case 'inventaire':
        return <InventaireView />;
      case 'produits':
        return <ProduitsView />;
      case 'mouvements':
        return <MouvementsView />;
      case 'prelevements-hammam':
        return <PrelevementsHammamView />;
      case 'rapports':
        return <RapportsView />;
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
    <div className="min-h-screen bg-[#E9E3D6] flex text-[#1C2321]">
      {/* Sidebar navigation */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setMobileMenuOpen(prev => !prev)} />

        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto">
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
