import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  User as UserIcon,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { HammamNileLogo, HammamNileEmblem } from './HammamNileLogo';

export const LoginView: React.FC = () => {
  const { login, settings, firebaseConnected } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Veuillez renseigner le code / mot de passe.');
      return;
    }

    setLoading(true);
    const res = await login(username, password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Identifiant ou code incorrect.');
      passwordInputRef.current?.select();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#051B33] nile-waves p-4 sm:p-6 relative overflow-hidden">
      {/* Emblème géant en filigrane — visible en transparence derrière la carte */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
        <HammamNileEmblem className="w-[130vw] h-[130vw] sm:w-[900px] sm:h-[900px] opacity-[0.07]" color="#FFFFFF" />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Card */}
        <div className="water-glass rounded-[32px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.55)] p-6 sm:p-8">
          {/* Contenu au-dessus du reflet animé (voir .water-glass::before) */}
          <div className="relative">
          {/* Official Logo & Header */}
          <div className="text-center mb-6 pt-1">
            <div className="inline-block p-4 rounded-3xl bg-gradient-to-br from-white/50 to-[#004CB7]/10 border border-white/50 shadow-xs mb-2">
              <HammamNileLogo variant="full" size="lg" color="#004CB7" textColor="#004CB7" />
            </div>
            <div className="w-10 h-[3px] rounded-full bg-[#B8874B] mx-auto mb-2" />
            <p className="text-xs text-[#3A4149] font-semibold">
              Caisse, boutique & gestion du hammam
            </p>
            {firebaseConnected && (
              <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Synchronisation cloud active</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in shake">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#3A4149] mb-1.5">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3A4149]">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Votre identifiant"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-sm font-semibold text-[#1C2321] focus:outline-none focus:ring-2 focus:ring-[#004CB7] focus:border-transparent transition"
                  required
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#3A4149]">
                  Code confidentiel
                </label>
                <span className="text-[11px] text-[#3A4149] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#004CB7]" />
                  <span>Masqué</span>
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3A4149]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-sm font-semibold text-[#1C2321] focus:outline-none focus:ring-2 focus:ring-[#004CB7] focus:border-transparent transition tracking-widest"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#3A4149] hover:text-[#1C2321] cursor-pointer"
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 font-bold rounded-full shadow-md hover:shadow-lg hover:-translate-y-px transition flex items-center justify-center gap-2 cursor-pointer text-white bg-[#004CB7] hover:bg-[#002E6E] disabled:opacity-60 disabled:translate-y-0"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Connexion…' : 'Se connecter'}</span>
            </button>
          </form>

          {/* Security notice */}
          <div className="mt-5 pt-4 border-t border-[#E7E0D3] text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#3A4149]">
              <ShieldCheck className="w-4 h-4 text-[#004CB7]" />
              <span>Connexion sécurisée</span>
            </div>
            <p className="text-[11px] text-[#3A4149] mt-1">
              Chaque personne se connecte avec son propre identifiant et son propre code confidentiel.
            </p>
          </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-[#EFE8D8]/70 mt-5">
          {settings.shopName || 'Hammam Nile'} — Caisse, soins & gestion
        </p>
      </div>
    </div>
  );
};
