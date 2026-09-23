import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { KeyRound, ShieldAlert, ArrowRight, LogOut, Eye, EyeOff } from 'lucide-react';
import { HammamNileLogo } from './HammamNileLogo';

export const ForcePasswordChangeView: React.FC = () => {
  const { currentUser, completePasswordChange, logout } = useApp();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const res = await completePasswordChange(newPassword);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Impossible de changer le mot de passe. Réessayez.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#072423] p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#004CB7]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#B8874B]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white rounded-[32px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.55)] border border-[#E7E0D3] p-6 sm:p-8">
          <div className="text-center mb-6 pt-1">
            <div className="inline-block p-4 rounded-3xl bg-slate-50/80 border border-slate-100 shadow-xs mb-3">
              <HammamNileLogo variant="full" size="lg" color="#004CB7" textColor="#004CB7" />
            </div>
            <p className="text-[11px] text-[#6B7873] font-sans font-bold tracking-widest uppercase">
              Nouveau mot de passe requis
            </p>
          </div>

          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Bonjour {currentUser?.name || ''}. Votre compte utilise un mot de passe temporaire — choisissez-en un
              nouveau pour continuer. Il ne sera plus jamais affiché à personne.
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#6B7873] uppercase tracking-wider mb-1.5">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7873]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  className="w-full pl-10 pr-11 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-sm font-semibold text-[#1C2321] focus:outline-none focus:ring-2 focus:ring-[#004CB7] focus:border-transparent transition"
                  required
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7873] hover:text-[#1C2321] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7873] uppercase tracking-wider mb-1.5">
                Confirmez le mot de passe
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                className="w-full pl-4 pr-4 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-sm font-semibold text-[#1C2321] focus:outline-none focus:ring-2 focus:ring-[#004CB7] focus:border-transparent transition"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 group cursor-pointer text-white bg-[#0F4C4A] hover:bg-[#0A3735] disabled:opacity-60"
            >
              <span>{loading ? 'Enregistrement…' : 'Définir mon mot de passe'}</span>
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>
          </form>

          <button
            type="button"
            onClick={logout}
            className="w-full mt-4 py-2 text-xs font-bold text-[#6B7873] hover:text-[#1C2321] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Ce n'est pas moi — se déconnecter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
