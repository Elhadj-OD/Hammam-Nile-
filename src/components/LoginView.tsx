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
  Mail,
  Send,
  CheckCircle2,
  Copy,
  Sparkles,
} from 'lucide-react';
import { HammamNileLogo } from './HammamNileLogo';

export const LoginView: React.FC = () => {
  const {
    login,
    settings,
    firebaseConnected,
    requestAdminEmailCode,
    verifyAdminEmailCode,
    unlockAdminWithGoogle,
  } = useApp();

  const [selectedProfile, setSelectedProfile] = useState<'admin' | 'caissier'>('caissier');
  const [username, setUsername] = useState('elhadj');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Firebase Admin 2FA State
  const [adminEmail, setAdminEmail] = useState(settings.adminEmail || 'elhadji3454@gmail.com');
  const [adminCode, setAdminCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const selectRole = (role: 'admin' | 'caissier') => {
    setSelectedProfile(role);
    setError('');
    setPassword('');
    setAdminCode('');
    setCodeSent(false);
    if (role === 'admin') {
      setUsername('sophia');
    } else {
      setUsername('elhadj');
    }
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleSendCode = async () => {
    if (!adminEmail.trim()) {
      setError("Veuillez saisir l'adresse email de l'administrateur.");
      return;
    }
    setError('');
    setIsSendingCode(true);
    setAdminCode(''); // Ensure input is blank so user types it
    try {
      const res = await requestAdminEmailCode(adminEmail);
      if (res.success) {
        setCodeSent(true);
      } else {
        setError(res.message || "Impossible d'envoyer le code.");
      }
    } catch {
      setError("Erreur de communication avec le service d'authentification Firebase.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // If Admin Profile: Require Firebase Email Verification code
    if (selectedProfile === 'admin') {
      if (!adminCode.trim()) {
        setError("Veuillez demander et renseigner le code de vérification à 6 chiffres envoyé à votre email.");
        return;
      }

      setIsVerifying(true);
      try {
        const verifyRes = await verifyAdminEmailCode(adminCode);
        if (!verifyRes.success) {
          setError(verifyRes.error || "Code de vérification Firebase incorrect.");
          setIsVerifying(false);
          return;
        }

        // Also check password if filled
        const success = login('sophia', password || '2630');
        if (!success) {
          setError("Mot de passe incorrect pour le compte Sophia.");
          setIsVerifying(false);
          return;
        }
      } catch {
        setError("Erreur lors de la validation du code Firebase.");
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    // Cashier Profile: Regular login
    if (!password.trim()) {
      setError('Veuillez renseigner le mot de passe.');
      return;
    }

    const success = login(username, password);
    if (!success) {
      setError('Mot de passe incorrect pour le compte Caissier Elhadj.');
      passwordInputRef.current?.select();
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsVerifying(true);
    try {
      const res = await unlockAdminWithGoogle();
      if (!res.success) {
        setError(res.error || 'Connexion Google échouée.');
      } else {
        login('sophia', '2630');
      }
    } catch {
      setError('Erreur de connexion Google Firebase.');
    } finally {
      setIsVerifying(false);
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
                <span>Protection Firebase Active</span>
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
                    EH
                  </div>
                  <span className="text-[10px] bg-[#004CB7] text-white font-bold px-2 py-0.5 rounded-md">
                    Caisse
                  </span>
                </div>
                <div className="font-bold text-sm text-[#1C2321]">
                  Partie Caisse
                </div>
                <div className="text-[11px] text-[#6B7873] mt-0.5">
                  Nom : <strong className="text-[#004CB7]">elhadj</strong>
                </div>
                <div className="text-[10px] text-[#6B7873] font-medium mt-1">
                  Accès direct caissière
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
                <div className="text-[10px] text-emerald-800 font-bold mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Vérif. Code Email</span>
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
            {selectedProfile === 'admin' ? (
              /* ADMIN FIREBASE 2FA FLOW */
              <div className="space-y-3.5 bg-[#F7F3EC] p-4 rounded-2xl border border-[#E7E0D3]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0A3735]">
                  <ShieldCheck className="w-4 h-4 text-[#0A3735]" />
                  <span>Sécurité Admin · Vérification par Email (Firebase)</span>
                </div>
                <p className="text-[11px] text-[#6B7873] leading-relaxed">
                  Pour empêcher les caissières d'entrer dans la partie Admin, un code de sécurité à usage unique est transmis à votre adresse email.
                </p>

                {/* Admin Email Input & Send Button */}
                <div>
                  <label className="block text-[11px] font-bold text-[#6B7873] uppercase mb-1">
                    Email de l'Administrateur
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={e => setAdminEmail(e.target.value)}
                        placeholder="elhadji3454@gmail.com"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-[#E7E0D3] rounded-xl text-xs font-semibold text-[#1C2321] focus:ring-2 focus:ring-[#0A3735]"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSendingCode}
                      className="px-3 py-2 bg-[#0A3735] hover:bg-[#0F4C4A] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingCode ? 'Envoi...' : 'Recevoir le code'}</span>
                    </button>
                  </div>
                </div>

                {/* Notification Banner: Code dispatched to phone */}
                {codeSent && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Code envoyé sur votre téléphone !</span>
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        Valide 10 min
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Un code secret de sécurité à 6 chiffres a été envoyé à <strong>{adminEmail}</strong>. Ouvrez l'application email sur votre téléphone portable, relevez le code, puis tapez-le ci-dessous pour déverrouiller l'accès Admin.
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-emerald-700 pt-1.5 border-t border-emerald-200/70">
                      <span>(Vérifiez aussi vos spams / courrier indésirable)</span>
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={isSendingCode}
                        className="font-bold underline hover:text-emerald-900 cursor-pointer disabled:opacity-50"
                      >
                        {isSendingCode ? 'Envoi...' : 'Renvoyer un code'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 6-Digit Code Input - User types the code */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[#6B7873] uppercase">
                      Code secret reçu sur votre téléphone (6 chiffres) *
                    </label>
                    {codeSent && (
                      <span className="text-[10px] text-amber-700 font-semibold">
                        À taper manuellement
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={adminCode}
                    onChange={e => setAdminCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Tapez vos 6 chiffres ici"
                    className="w-full px-3 py-2.5 bg-white border border-[#E7E0D3] rounded-xl text-center text-lg font-mono font-extrabold tracking-widest text-[#0A3735] focus:ring-2 focus:ring-[#0A3735] focus:border-[#0A3735] transition"
                    required
                  />
                  <p className="text-[10px] text-[#6B7873] mt-1 text-center">
                    Seul l'administrateur ayant accès à sa boîte email sur son téléphone peut connaître ce code.
                  </p>
                </div>

                {/* Password field for Sophia */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[#6B7873] uppercase">
                      Mot de passe Admin (Sophia)
                    </label>
                    <span className="text-[10px] text-[#6B7873]">Optionnel si code validé</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="•••••••• (par défaut 2630)"
                      className="w-full px-3 py-2 bg-white border border-[#E7E0D3] rounded-xl text-xs font-semibold text-[#1C2321] tracking-widest focus:ring-2 focus:ring-[#0A3735]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* CASHIER FLOW */
              <>
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
                      placeholder="elhadj"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-sm font-semibold text-[#1C2321] focus:outline-none focus:ring-2 focus:ring-[#004CB7] focus:border-transparent transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#6B7873] uppercase tracking-wider">
                      Mot de passe confidentiel
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
              </>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className={`w-full mt-2 py-3.5 px-4 font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 group cursor-pointer text-white ${
                selectedProfile === 'admin'
                  ? 'bg-[#0A3735] hover:bg-[#0F4C4A]'
                  : 'bg-[#004CB7] hover:bg-[#003C93]'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>
                {isVerifying
                  ? 'Vérification du code...'
                  : selectedProfile === 'admin'
                  ? "Vérifier & Ouvrir l'Espace Admin"
                  : 'Ouvrir la Caisse (Elhadj)'}
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Google Firebase Login Option for Admin */}
            {selectedProfile === 'admin' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isVerifying}
                  className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Connexion directe Google ({adminEmail})</span>
                </button>
              </div>
            )}
          </form>

          {/* Security notice */}
          <div className="mt-5 pt-4 border-t border-[#E7E0D3] text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#6B7873]">
              <ShieldCheck className="w-4 h-4 text-[#004CB7]" />
              <span>Authentification Sécurisée Hammam Nile</span>
            </div>
            <p className="text-[11px] text-[#6B7873]/80 mt-1">
              Les caissières ont uniquement accès à la caisse. L'accès à la gérance requiert la validation du code reçu par l'administrateur.
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
