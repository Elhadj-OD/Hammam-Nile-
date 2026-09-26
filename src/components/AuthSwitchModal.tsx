import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react';
import { HammamNileEmblem } from './HammamNileLogo';

export const AuthSwitchModal: React.FC = () => {
  const { authModal, closeAuthModal, verifyAndSwitch, users } = useApp();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authModal.isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [authModal.isOpen]);

  if (!authModal.isOpen) return null;

  const matchedUser = authModal.targetUsername
    ? users.find(u => u.username.toLowerCase() === authModal.targetUsername?.toLowerCase())
    : undefined;
  const isAdmin = matchedUser ? matchedUser.role === 'gerant' : authModal.targetRole === 'gerant';
  const targetLabel = isAdmin ? 'Partie Admin (Direction)' : 'Partie Caisse (Vente)';
  const targetUser = matchedUser?.name || authModal.targetName || (isAdmin ? 'Gérante' : 'Caissière');
  const targetInitials = matchedUser
    ? matchedUser.name.substring(0, 2).toUpperCase()
    : isAdmin
      ? 'AD'
      : 'CA';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Veuillez entrer le code / mot de passe.');
      return;
    }

    setLoading(true);
    const res = await verifyAndSwitch(password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Mot de passe incorrect.');
      inputRef.current?.select();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E7E0D3] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Top brand header bar */}
        <div
          className={`p-5 text-white flex items-center justify-between ${
            isAdmin ? 'bg-[#0A3735]' : 'bg-[#004CB7]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#004CB7] flex items-center justify-center shadow-md p-1.5">
              <HammamNileEmblem className="w-full h-full" color="#004CB7" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold tracking-wider opacity-85">
                Accès Protégé · Hammam Nile
              </div>
              <h3 className="text-base font-bold">{targetLabel}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User badge with masked details */}
          <div className="p-3 rounded-2xl bg-[#F7F3EC] border border-[#E7E0D3] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold font-mono text-white ${
                  isAdmin ? 'bg-[#0A3735]' : 'bg-[#004CB7]'
                }`}
              >
                {targetInitials}
              </div>
              <div>
                <div className="text-xs font-bold text-[#1C2321]">
                  Destinataire : {targetUser}
                </div>
                <div className="text-[11px] text-[#6B7873]">
                  {isAdmin
                    ? 'Sécurité renforcée contre accès caissière non autorisé'
                    : 'Retour vers la caisse'}
                </div>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                isAdmin ? 'bg-[#0A3735] text-white' : 'bg-[#004CB7] text-white'
              }`}
            >
              {isAdmin ? 'Gérante' : 'Caissier'}
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Password input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-[#6B7873] uppercase tracking-wider">
                Code / Mot de passe confidentiel
              </label>
              <span className="text-[11px] text-[#6B7873] flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#004CB7]" />
                <span>Masqué</span>
              </span>
            </div>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-12 py-3 bg-[#F7F3EC] border border-[#E7E0D3] rounded-2xl text-base font-medium text-[#1C2321] tracking-widest focus:outline-none focus:ring-2 focus:ring-[#004CB7] focus:border-transparent transition"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7873] hover:text-[#1C2321] cursor-pointer"
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-[#6B7873] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#004CB7]" />
            <span>Accès sécurisé pour empêcher les caissières d'entrer dans la gérance</span>
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={closeAuthModal}
              className="flex-1 py-3 px-4 rounded-xl border border-[#E7E0D3] text-xs font-bold text-[#6B7873] hover:bg-[#F7F3EC] transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60 ${
                isAdmin
                  ? 'bg-[#0A3735] hover:bg-[#0F4C4A]'
                  : 'bg-[#004CB7] hover:bg-[#003C93]'
              }`}
            >
              <span>{loading ? 'Vérification…' : 'Valider'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
