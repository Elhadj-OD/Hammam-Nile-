import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Filet de sécurité : si l'app plante au chargement (bug, ou ancien fichier
// mis en cache après une mise à jour), on affiche un écran avec un bouton
// pour recharger plutôt qu'une page blanche sans explication.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Erreur au chargement de l\'app :', error);
  }

  handleReload = () => {
    const reload = () => window.location.reload();
    if (typeof caches !== 'undefined') {
      caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).finally(reload);
    } else {
      reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#051B33] p-4">
        <div className="max-w-sm w-full bg-white rounded-[32px] shadow-2xl border border-[#E7E0D3] p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            ⚠️
          </div>
          <h1 className="text-lg font-bold text-[#1C2321] font-display mb-2">
            L'application a rencontré un problème
          </h1>
          <p className="text-sm text-[#6B7873] mb-6">
            Ça arrive parfois juste après une mise à jour de l'app. Rechargez la page pour repartir sur la dernière
            version.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="w-full py-3 bg-[#004CB7] hover:bg-[#002E6E] text-white rounded-full font-bold text-sm transition shadow-md cursor-pointer"
          >
            Recharger l'application
          </button>
        </div>
      </div>
    );
  }
}
