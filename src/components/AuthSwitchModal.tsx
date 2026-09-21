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
  Mail,
  Send,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { HammamNileEmblem } from './HammamNileLogo';

export const AuthSwitchModal: React.FC = () => {
  const {
    authModal,
    closeAuthModal,
    verifyAndSwitch,
    requestAdminEmailCode,
    verifyAdminEmailCode,
    settings,
  } = useApp();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [authMethod, setAuthMethod] = useState<'code' | 'password'>('code');

  // Firebase Email Verification State
  const [email, setEmail] = useState(settings.adminEmail || 'elhadji3454@gmail.com');
  const [adminCode, setAdminCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authModal.isOpen) {
      setPassword('');
      setAdminCode('');
      setError('');
      setShowPassword(false);
      setCodeSent(false);
      // If targeting admin, default to code verification to stop cashiers
      const isTargetAdmin =
        authModal.targetRole === 'gerant' ||
        authModal.targetUsername?.toLowerCase() === 'sophia';
      setAuthMethod(isTargetAdmin ? 'code' : 'password');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [authModal.isOpen, authModal.targetRole, authModal.targetUsername]);

  if (!authModal.isOpen) return null;

  const isAdmin =
    authModal.targetRole === 'gerant' ||
    authModal.targetUsername?.toLowerCase() === 'sophia';
  const targetLabel = isAdmin ? 'Partie Admin (Direction)' : 'Partie Caisse (Vente)';
  const targetUser = isAdmin ? 'Sophia' : 'Elhadj';

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError("Veuillez saisir l'email de l'administrateur.");
      return;
    }
    setError('');
    setIsSendingCode(true);
    setAdminCode(''); // Keep field blank for user to type
    try {
      const res = await requestAdminEmailCode(email);
      if (res.success) {
        setCodeSent(true);
      } else {
        setError(res.message || "Erreur lors de l'envoi du code.");
      }
    } catch {
      setError("Erreur de connexion avec Firebase.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // If switching to admin and using verification code
    if (isAdmin && authMethod === 'code') {
      if (!adminCode.trim()) {
        setError("Veuillez demander et entrer le code de sécurité reçu par email.");
        return;
      }

      setIsVerifying(true);
      try {
        const verifyRes = await verifyAdminEmailCode(adminCode);
        if (!verifyRes.success) {
          setError(verifyRes.error || "Code de sécurité incorrect.");
          setIsVerifying(false);
          return;
        }

        // Successfully verified by Firebase
        const res = verifyAndSwitch('2630');
        if (!res.success) {
          setError(res.error || 'Impossible de basculer.');
        }
      } catch {
        setError("Erreur lors de la vérification du code.");
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    // Password verification
    if (!password.trim()) {
      setError('Veuillez entrer le mot de passe.');
      return;
    }

    const res = verifyAndSwitch(password);
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
                {isAdmin ? 'SO' : 'EH'}
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

          {/* Toggle between code and password if admin */}
          {isAdmin && (
            <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAuthMethod('code')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  authMethod === 'code'
                    ? 'bg-white text-[#0A3735] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Code Email Firebase
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('password')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  authMethod === 'password'
                    ? 'bg-white text-[#0A3735] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Mot de passe Sophia
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Verification input based on method */}
          {isAdmin && authMethod === 'code' ? (
            <div className="space-y-3 bg-[#F7F3EC] p-3.5 rounded-2xl border border-[#E7E0D3]">
              <div className="text-[11px] text-[#6B7873] leading-relaxed">
                Un code de vérification à usage unique est envoyé à l'adresse administrateur pour autoriser l'ouverture de la gérance.
              </div>

              {/* Email & Send Button */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="elhadji3454@gmail.com"
                    className="w-full pl-8 pr-2 py-1.5 bg-white border border-[#E7E0D3] rounded-xl text-xs text-[#1C2321]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isSendingCode}
                  className="px-3 py-1.5 bg-[#0A3735] hover:bg-[#0F4C4A] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>{isSendingCode ? '...' : 'Code'}</span>
                </button>
              </div>

              {/* Dispatched Code Notice */}
              {codeSent && dispatchedCode && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-800 font-bold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Code transmis :</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="text-[10px] text-emerald-700 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copied ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>
                  <div className="font-mono font-extrabold text-sm text-[#0A3735] tracking-widest text-center bg-white py-1 rounded border border-emerald-200">
                    {dispatchedCode}
                  </div>
                </div>
              )}

              {/* Input for 6 digits code */}
              <div>
                <label className="block text-[11px] font-bold text-[#6B7873] uppercase mb-1">
                  Entrez le code reçu *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={adminCode}
                  onChange={e => setAdminCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 123456"
                  className="w-full py-2 px-3 bg-white border border-[#E7E0D3] rounded-xl text-center font-mono font-bold text-base tracking-widest text-[#0A3735] focus:ring-2 focus:ring-[#0A3735]"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[#6B7873] uppercase tracking-wider">
                  Mot de passe confidentiel
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
          )}

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
              disabled={isVerifying}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                isAdmin
                  ? 'bg-[#0A3735] hover:bg-[#0F4C4A]'
                  : 'bg-[#004CB7] hover:bg-[#003C93]'
              }`}
            >
              <span>{isVerifying ? 'Vérification...' : 'Valider'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
