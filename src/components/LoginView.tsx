import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  User as UserIcon,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { HammamNileLogo } from './HammamNileLogo';

export const LoginView: React.FC = () => {
  const { login, settings, firebaseConnected } = useApp();

  const [selectedProfile, setSelectedProfile] = useState<'admin' | 'caissier'>('caissier');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const selectRole = (role: 'admin' | 'caissier') => {
    setSelectedProfile(role);
    setError('');
    setPassword('');
    if (role === 'admin') {
      setUsername('sophia');
    } else {
      setUsername('');
    }
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Veuillez renseigner le code / mot de passe.');
      return;
    }

    const success = login(username, password);
    if (!success) {
      setError('Identifiant ou code incorrect.');
      passwordInputRef.current?.select();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#072423] p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#004CB7]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#B8874B]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full relative z-10">
        {/* Card */}
        <div className="bg-white rounded-[32px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.55)] border border-[#E7E0D3] p-6 sm:p-8">
          {/* Official Logo & Header */}
          <div className="text-center mb-6 pt-1">
            <div className="inline-block p-4 rounded-3xl bg-slate-50/80 border border-slate-100 shadow-xs mb-3">
              <HammamNileLogo variant="full" size="lg" color="#004CB7" textColor="#004CB7" />
            </div>
            <p className="text-[11px] text-[#6B7873] font-sans font-bold tracking-widest uppercase">
              Caisse, Boutique & Gestion Hammam
            </p>
            {firebaseConnected && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Synchronisation Cloud Active</span>
              </div>
            )}
          </div>

          {/* Section Selector: Admin vs Caisse */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold text-[#6B7873] uppercase tracking-wider mb-2 text-center">
              Sélectionnez la partie à ouvrir
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Caisse Option */}
              <button
                type="button"
                onClick={() => selectRole('caissier')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative ${
                  selectedProfile === 'caissier'
                    ? 'border-[#004CB7] bg-[#F0F5FD] ring-2 ring-[#004CB7]/20 shadow-xs'
                    : 'border-[#E7E0D3] bg-[#F7F3EC] hover:bg-[#EFE8D8]/60 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-[#004CB7] text-white flex items-center justify-center font-bold text-xs font-mono shadow-xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] bg-[#004CB7] text-white font-bold px-2 py-0.5 rounded-md">
                    Caisse
                  </span>
                </div>
                <div className="font-bold text-sm text-[#1C2321]">
                  Partie Caisse
                </div>
                <div className="text-[11px] text-[#6B7873] mt-0.5">
                  Chaque caissière entre son propre identifiant
                </div>
                <div className="text-[10px] text-[#6B7873] font-medium mt-1">
                  Redirection automatique vers sa caisse
                </div>
              </button>

              {/* Admin Option */}
              <button
                type="button"
                onClick={() => selectRole('admin')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative ${
                  selectedProfile === 'admin'
                    ? 'border-[#0A3735] bg-[#E4E9E1]/80 ring-2 ring-[#0A3735]/20 shadow-xs'
                    : 'border-[#E7E0D3] bg-[#F7F3EC] hover:bg-[#EFE8D8]/60 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0A3735] text-white flex items-center justify-center font-bold text-xs font-mono shadow-xs">
                    SO
                  </div>
                  <span className="text-[10px] bg-[#0A3735] text-white font-bold px-2 py-0.5 rounded-md">
                    Admin
                  </span>
                </div>
                <div className="font-bold text-sm text-[#1C2321]">
                  Partie Admin
                </div>
                <div className="text-[11px] text-[#6B7873] mt-0.5">
                  Direction & Gérance
                </div>
                <div className="text-[10px] text-[#6B7873] font-medium mt-1">
                  Accès direct avec code
                </div>
              </button>
            </div>
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
              <label className="block text-xs font-bold text-[#6B7873] uppercase tracking-wider mb-1.5">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7873]">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ex: femme, hammam, spa, coiffure…"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-sm font-semibold text-[#1C2321] focus:outline-none focus:ring-2 focus:ring-[#004CB7] focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#6B7873] uppercase tracking-wider">
                  Code / Mot de passe confidentiel
                </label>
                <span className="text-[11px] text-[#6B7873] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#004CB7]" />
                  <span>Masqué</span>
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7873]">
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
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7873] hover:text-[#1C2321] cursor-pointer"
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full mt-2 py-3.5 px-4 font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 group cursor-pointer text-white ${
                selectedProfile === 'admin'
                  ? 'bg-[#0A3735] hover:bg-[#0F4C4A]'
                  : 'bg-[#004CB7] hover:bg-[#003C93]'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>
                {selectedProfile === 'admin' ? "Ouvrir l'Espace Admin" : 'Ouvrir la Caisse'}
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          {/* Security notice */}
          <div className="mt-5 pt-4 border-t border-[#E7E0D3] text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#6B7873]">
              <ShieldCheck className="w-4 h-4 text-[#004CB7]" />
              <span>Authentification Sécurisée Hammam Nile</span>
            </div>
            <p className="text-[11px] text-[#6B7873]/80 mt-1">
              Chaque partie (Caisse, Admin) s'ouvre avec son propre identifiant et son propre code confidentiel.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-[#EFE8D8]/70 mt-5">
          {settings.shopName || 'Hammam Nile'} — Caisse, Soins & Gestion
        </p>
      </div>
    </div>
  );
};
