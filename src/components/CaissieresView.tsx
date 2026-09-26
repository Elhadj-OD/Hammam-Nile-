import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole, UserGender, CaisseDepartment } from '../types';
import { DEPARTMENTS } from '../lib/departments';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  Key,
  Shield,
  Camera,
  CheckCircle2,
  X,
  LogIn,
  ShoppingBag,
  Sparkles,
  Calendar,
  Lock,
  Unlock,
  Circle,
  ShieldCheck,
  Copy,
} from 'lucide-react';

// Un compte est considéré "en ligne" s'il a signalé une activité récente
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export const CaissieresView: React.FC = () => {
  const {
    currentUser,
    users,
    addUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    switchUser,
    presence,
    sales,
    settings,
    setActiveSection,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Un mot de passe temporaire généré côté serveur n'est affiché qu'une
  // seule fois, à l'écran, pour que la gérante puisse le transmettre en
  // main propre — jamais stocké ni renvoyé ensuite.
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ name: string; username: string; tempPassword: string } | null>(null);

  // Réinitialisation du mot de passe : la gérante choisit soit de générer
  // un mot de passe automatique, soit d'en taper un elle-même.
  const [resetPasswordTarget, setResetPasswordTarget] = useState<User | null>(null);
  const [resetPasswordCustom, setResetPasswordCustom] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('caissier');
  const [gender, setGender] = useState<UserGender>('femme');
  const [department, setDepartment] = useState<CaisseDepartment | ''>('');
  const [locked, setLocked] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggested preset avatars if no photo uploaded
  const avatarPresets = [
    { label: 'FM', color: 'bg-[#0F4C4A] text-white' },
    { label: 'AS', color: 'bg-[#B8874B] text-[#0A3735]' },
    { label: 'MB', color: 'bg-[#5F7D6D] text-white' },
    { label: 'KD', color: 'bg-[#8F5A38] text-white' },
    { label: 'AD', color: 'bg-[#3A5049] text-white' },
  ];

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('caissier');
    setGender('femme');
    setDepartment('');
    setLocked(false);
    setAvatarPreview('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    // Un e-mail synthétique interne (...@hammamnile.local) n'est pas un
    // vrai e-mail à afficher/réutiliser — le champ reste vide dans ce cas.
    setEmail(user.email && !user.email.endsWith('@hammamnile.local') ? user.email : '');
    setPassword('');
    setPhone(user.phone || '');
    setRole(user.role);
    setGender(user.gender || 'femme');
    setDepartment(user.department || '');
    setLocked(user.locked || false);
    setAvatarPreview(user.avatar || '');
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Fichier invalide : veuillez sélectionner une image.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('Veuillez sélectionner une image de moins de 2 Mo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Veuillez renseigner le nom complet de la caissière.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && !cleanEmail.includes('@')) {
      alert('Adresse e-mail invalide.');
      return;
    }

    const cleanPassword = password.trim();
    if (!editingUser && cleanPassword && cleanPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const cleanUsername = (username.trim() || name.trim().split(' ')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');

    // Default avatar if none uploaded
    const finalAvatar = avatarPreview || name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    setSubmitting(true);
    if (editingUser) {
      const res = await updateUser(editingUser.username, {
        username: cleanUsername,
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        role,
        gender,
        department: department || undefined,
        locked,
        avatar: finalAvatar,
      });
      setSubmitting(false);
      if (!res.success) {
        alert(res.error || 'Impossible de mettre à jour ce profil.');
        return;
      }
    } else {
      const res = await addUser({
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        phone: phone.trim(),
        role,
        gender,
        department: department || undefined,
        avatar: finalAvatar,
        password: cleanPassword || undefined,
      });
      setSubmitting(false);
      if (!res.success) {
        alert(res.error || 'Impossible de créer ce compte.');
        return;
      }
      if (res.tempPassword) {
        setTempPasswordInfo({ name: name.trim(), username: cleanUsername, tempPassword: res.tempPassword });
      }
    }

    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleDelete = async (u: User) => {
    if (users.length <= 1) {
      alert('Impossible de supprimer le seul utilisateur du système.');
      return;
    }
    if (window.confirm(`Confirmez-vous la suppression de ${u.name} ?`)) {
      const res = await deleteUser(u.username);
      if (!res.success) alert(res.error || 'Impossible de supprimer ce compte.');
    }
  };

  const handleSwitchToUser = (u: User) => {
    switchUser(u.username);
    setActiveSection('caisse');
  };

  const handleToggleLock = async (u: User) => {
    const res = await updateUser(u.username, { locked: !u.locked });
    if (!res.success) alert(res.error || 'Impossible de modifier le verrouillage.');
  };

  const handleOpenResetPassword = (u: User) => {
    setResetPasswordTarget(u);
    setResetPasswordCustom('');
    setResetPasswordError('');
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordTarget) return;
    const cleanCustom = resetPasswordCustom.trim();
    if (cleanCustom && cleanCustom.length < 6) {
      setResetPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setResettingPassword(true);
    const res = await resetUserPassword(resetPasswordTarget.username, cleanCustom || undefined);
    setResettingPassword(false);
    if (!res.success) {
      setResetPasswordError(res.error || 'Impossible de réinitialiser le mot de passe.');
      return;
    }
    const targetName = resetPasswordTarget.name;
    const targetUsername = resetPasswordTarget.username;
    setResetPasswordTarget(null);
    if (res.tempPassword) {
      setTempPasswordInfo({ name: targetName, username: targetUsername, tempPassword: res.tempPassword });
    }
  };

  // Compute sales stats per user
  const getUserStats = (uUsername: string) => {
    const userSales = sales.filter(s => s.caissier.toLowerCase() === uUsername.toLowerCase());
    const count = userSales.length;
    const totalAmount = userSales.reduce((acc, s) => acc + s.total, 0);
    return { count, totalAmount };
  };

  // Présence : dernière activité connue pour un utilisateur (via Supabase)
  const getPresence = (uUsername: string) => {
    const row = presence.find(p => p.username.toLowerCase() === uUsername.toLowerCase());
    if (!row) return { online: false, lastActive: null as number | null };
    return { online: Date.now() - row.lastActive < ONLINE_THRESHOLD_MS, lastActive: row.lastActive };
  };

  const formatLastSeen = (ts: number) => {
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH} h`;
    return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (val: number) => {
    return `${val.toLocaleString('fr-FR')} ${settings.currency}`;
  };

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto pb-12">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E0D3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0F4C4A] text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Gestion du Personnel & Caisses</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-[#1C2321]">
            Caissières & Équipe Hammam
          </h1>
          <p className="text-sm text-[#6B7873] mt-1">
            Gérez les profils des caissières, leurs photos de profil, leurs codes d'accès et leurs statistiques de vente.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="bg-[#0F4C4A] hover:bg-[#0A3735] text-white px-5 py-3 rounded-full font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Ajouter une Caissière</span>
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {users.map(u => {
          const stats = getUserStats(u.username);
          const isCurrent = currentUser?.username === u.username;
          const isPhoto = u.avatar && (u.avatar.startsWith('data:') || u.avatar.startsWith('http'));
          const initials = u.avatar && !isPhoto ? u.avatar : u.name.substring(0, 2).toUpperCase();

          return (
            <div
              key={u.username}
              className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between shadow-xs ${
                isCurrent
                  ? 'border-[#B8874B] ring-2 ring-[#B8874B]/20 bg-[#FDFBF7]'
                  : 'border-[#E7E0D3] hover:border-[#B8874B]/60'
              }`}
            >
              <div>
                {/* Header card */}
                <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar Photo */}
                    <div className="relative shrink-0">
                      {isPhoto ? (
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-[#E7E0D3] shadow-xs"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-[#0F4C4A] text-[#EFE8D8] flex items-center justify-center font-bold text-lg shadow-xs">
                          {initials}
                        </div>
                      )}
                      {isCurrent && (
                        <span
                          title="Session active"
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#B8874B] border-2 border-white"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold font-display text-[16px] text-[#1C2321] leading-tight break-words">
                        {u.name}
                      </h3>
                      <div className="text-xs text-[#6B7873] font-mono mt-0.5 truncate">
                        @{u.username}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            u.role === 'gerant'
                              ? 'bg-[#B8874B]/20 text-[#8B6433]'
                              : 'bg-[#E4E9E1] text-[#0F4C4A]'
                          }`}
                        >
                          {u.role === 'gerant' ? 'Gérante / Admin' : 'Caissière'}
                        </span>
                        {u.gender === 'homme' && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-[#F7F3EC] text-[#6B7873] border border-[#E7E0D3]"
                            title="Boutique Femme masquée pour ce compte"
                          >
                            Homme
                          </span>
                        )}
                        {u.department && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-[#0F4C4A]/10 text-[#0F4C4A] border border-[#0F4C4A]/20"
                            title="Caisse dédiée : voit uniquement cette partie"
                          >
                            {DEPARTMENTS[u.department].icon} {DEPARTMENTS[u.department].label}
                          </span>
                        )}
                        {u.locked && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200"
                            title="Ne peut pas changer d'espace depuis cet appareil"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            Verrouillé
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Edit / Lock / Delete) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {u.role !== 'gerant' && (
                      <button
                        type="button"
                        onClick={() => handleToggleLock(u)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          u.locked
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-[#6B7873] hover:text-[#0F4C4A] hover:bg-[#F7F3EC]'
                        }`}
                        title={u.locked ? "Déverrouiller (autoriser le changement d'espace)" : 'Verrouiller sur sa caisse'}
                      >
                        {u.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenResetPassword(u)}
                      className="p-1.5 rounded-lg text-[#6B7873] hover:text-[#B8874B] hover:bg-[#F7F3EC] transition cursor-pointer"
                      title="Réinitialiser le mot de passe (générer un code, ou en choisir un)"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 rounded-lg text-[#6B7873] hover:text-[#0F4C4A] hover:bg-[#F7F3EC] transition cursor-pointer"
                      title="Modifier le profil"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {users.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        className="p-1.5 rounded-lg text-[#6B7873] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Supprimer la caissière"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 py-3 border-y border-[#E7E0D3]/70 text-xs text-[#6B7873]">
                  {u.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#0F4C4A]" />
                      <span>{u.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0F4C4A]" />
                    <span>Compte sécurisé (authentification Supabase)</span>
                  </div>
                  {u.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#0F4C4A]" />
                      <span>Inscrite le : {u.createdAt}</span>
                    </div>
                  )}
                  {(() => {
                    const p = getPresence(u.username);
                    return (
                      <div className="flex items-center gap-2">
                        <Circle
                          className={`w-2.5 h-2.5 ${p.online ? 'fill-emerald-500 text-emerald-500' : 'fill-[#B8B2A0] text-[#B8B2A0]'}`}
                        />
                        <span>
                          {p.online
                            ? 'En ligne maintenant'
                            : p.lastActive
                            ? `Vue ${formatLastSeen(p.lastActive)}`
                            : 'Jamais connectée'}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-1 text-center bg-[#F7F3EC] p-2.5 rounded-xl">
                  <div>
                    <div className="text-[11px] text-[#6B7873]">Ventes encaissées</div>
                    <div className="text-sm font-bold text-[#1C2321]">{stats.count}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#6B7873]">Total encaissé</div>
                    <div className="text-xs font-bold text-[#0F4C4A] truncate">
                      {formatPrice(stats.totalAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Switch */}
              <div className="mt-4 pt-2">
                {isCurrent ? (
                  <div className="w-full text-center py-2 text-xs font-bold text-[#0F4C4A] bg-[#E4E9E1] rounded-xl flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Session En Cours</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwitchToUser(u)}
                    className="w-full py-2 text-xs font-bold text-[#1C2321] bg-[#F7F3EC] hover:bg-[#E4E9E1] hover:text-[#0F4C4A] rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Ouvrir la caisse avec ce profil</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E7E0D3] max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E0D3]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-[#1C2321]">
                    {editingUser ? 'Modifier la Caissière' : 'Ajouter une Caissière'}
                  </h3>
                  <p className="text-xs text-[#6B7873]">
                    Profil, photo et autorisations de caisse
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#6B7873] hover:text-[#1C2321] p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mt-5">
              {/* Photo Upload Section */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1.5">
                  Photo de Profil
                </label>
                <div className="flex items-center gap-4 bg-[#F7F3EC] p-3 rounded-xl border border-[#E7E0D3]">
                  {/* Photo Preview */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white border border-[#E7E0D3] shrink-0 flex items-center justify-center">
                    {avatarPreview ? (
                      avatarPreview.startsWith('data:') || avatarPreview.startsWith('http') ? (
                        <img
                          src={avatarPreview}
                          alt="Aperçu"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-lg text-[#0F4C4A]">{avatarPreview}</span>
                      )
                    ) : (
                      <Camera className="w-6 h-6 text-[#6B7873]/50" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex gap-2 mb-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold bg-white text-[#0F4C4A] border border-[#0F4C4A] hover:bg-[#E4E9E1] px-3 py-1.5 rounded-lg cursor-pointer transition"
                      >
                        Téléverser une photo
                      </button>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={() => setAvatarPreview('')}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B7873]">
                      Format JPG, PNG ou WebP. Taille max 2 Mo.
                    </p>
                  </div>
                </div>

                {/* Avatar initial presets */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-[#6B7873]">Ou initiales rapides :</span>
                  <div className="flex gap-1.5">
                    {avatarPresets.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setAvatarPreview(preset.label)}
                        className={`w-6 h-6 rounded-md text-[10px] font-bold cursor-pointer transition ${preset.color}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Nom Complet de la Caissière *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (!editingUser && !username) {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                  placeholder="ex: Fatou Mbaye"
                  required
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Identifiant / Pseudo *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ex: fatou"
                  required
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                />
                {editingUser && (
                  <p className="text-[11px] text-[#6B7873] mt-1">
                    En le changeant, la caissière devra se connecter avec ce nouvel identifiant.
                  </p>
                )}
              </div>

              {/* Mot de passe (facultatif : sinon généré automatiquement) */}
              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-[#1C2321] mb-1">
                    Mot de passe (optionnel)
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Laissez vide pour générer automatiquement"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-mono focus:outline-none focus:border-[#0F4C4A]"
                  />
                  <p className="text-[11px] text-[#6B7873] mt-1">
                    Vous pouvez choisir vous-même le mot de passe (min. 6 caractères) ou laisser vide pour qu'un mot de passe temporaire soit généré et affiché une seule fois après la création. Dans tous les cas, la caissière devra le changer à sa première connexion.
                  </p>
                </div>
              )}

              {/* E-mail réel (récupération de mot de passe) */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  E-mail (optionnel)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ex: fatou@gmail.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                />
                <p className="text-[11px] text-[#6B7873] mt-1">
                  Utile pour la récupération de mot de passe en cas d'oubli — la connexion se fait toujours avec l'identifiant, pas l'e-mail. Laissez vide si la caissière n'a pas d'e-mail.
                </p>
              </div>

              {/* Phone & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C2321] mb-1">
                    Téléphone (WhatsApp / SMS)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+222 46 00 00 00"
                    className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C2321] mb-1">
                    Rôle dans la Boutique
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                  >
                    <option value="caissier">Caissière de Comptoir</option>
                    <option value="gerant">Administratrice / Gérante</option>
                  </select>
                </div>
              </div>

              {/* Genre (accès Boutique Femme) */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Genre
                </label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as UserGender)}
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                >
                  <option value="femme">Femme</option>
                  <option value="homme">Homme</option>
                </select>
                <p className="text-[11px] text-[#6B7873] mt-1">
                  La catégorie « Boutique Femme » de la Caisse n'est visible que pour les comptes marqués « Femme ».
                </p>
              </div>

              {/* Caisse dédiée (verrouille la caissière sur une seule partie) */}
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Caisse dédiée
                </label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value as CaisseDepartment | '')}
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A]"
                >
                  <option value="">Aucune (voit tout le rayon boutique général)</option>
                  {Object.entries(DEPARTMENTS)
                    // "Hammam & Bains" n'est pas une caisse à part : le hammam des
                    // femmes se vend dans la caisse Boutique Femme (même logique
                    // que le hammam des garçons dans Boutique Homme).
                    .filter(([key]) => key !== 'hammam_bains')
                    .map(([key, d]) => (
                      <option key={key} value={key}>
                        {d.icon} {d.label}
                        {key === 'boutique_femme' ? ' (+ Hammam)' : ''}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-[#6B7873] mt-1">
                  Si une caisse est choisie, cette caissière ne voit et ne vend que les articles de cette partie à la connexion. « Boutique Femme » inclut aussi les services hammam pour femmes (Hammam simple, Gommage, Signature...).
                </p>
              </div>

              {/* Verrouillage du profil (postes partagés) */}
              {role === 'caissier' && (
                <label className="flex items-start gap-2.5 bg-[#F7F3EC] p-3 rounded-xl border border-[#E7E0D3] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={locked}
                    onChange={e => setLocked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#0F4C4A] cursor-pointer"
                  />
                  <span>
                    <span className="block text-xs font-bold text-[#1C2321] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#0F4C4A]" />
                      Verrouiller ce profil
                    </span>
                    <span className="block text-[11px] text-[#6B7873] mt-0.5">
                      Utile sur un poste partagé : une fois connectée, cette caissière ne pourra plus basculer vers un autre espace ou compte depuis l'appareil — elle devra se déconnecter et laisser la suivante se reconnecter avec son propre identifiant.
                    </span>
                  </span>
                </label>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E7E0D3]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 bg-[#F7F3EC] hover:bg-[#E7E0D3] text-[#1C2321] rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 px-6 bg-[#0F4C4A] hover:bg-[#0A3735] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Enregistrement…'
                      : editingUser
                      ? 'Enregistrer les modifications'
                      : 'Créer la Caissière'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mot de passe temporaire — affiché UNE SEULE FOIS après création ou réinitialisation */}
      {resetPasswordTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E0D3]">
            <div className="w-11 h-11 rounded-2xl bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center mb-3">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold font-display text-[#1C2321] mb-1">
              Réinitialiser le mot de passe de {resetPasswordTarget.name}
            </h3>
            <p className="text-xs text-[#6B7873] mb-3">
              L'ancien mot de passe cessera immédiatement de fonctionner. Choisissez-en un vous-même, ou laissez vide pour en générer un automatiquement.
            </p>

            {resetPasswordError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                {resetPasswordError}
              </div>
            )}

            <input
              type="text"
              value={resetPasswordCustom}
              onChange={e => setResetPasswordCustom(e.target.value)}
              placeholder="Laissez vide pour générer automatiquement"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full text-sm p-2.5 mb-4 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-mono focus:outline-none focus:border-[#0F4C4A]"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResetPasswordTarget(null)}
                disabled={resettingPassword}
                className="flex-1 py-2.5 bg-[#F7F3EC] text-[#1C2321] border border-[#E7E0D3] rounded-xl text-xs font-bold hover:bg-[#E4E9E1] transition cursor-pointer disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                disabled={resettingPassword}
                className="flex-1 py-2.5 bg-[#0F4C4A] hover:bg-[#0A3735] text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-60"
              >
                {resettingPassword ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tempPasswordInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E0D3]">
            <div className="w-11 h-11 rounded-2xl bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center mb-3">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold font-display text-[#1C2321] mb-1">
              Mot de passe temporaire pour {tempPasswordInfo.name}
            </h3>
            <p className="text-xs text-[#6B7873] mb-3">
              Transmettez-le en main propre à @{tempPasswordInfo.username}. Il ne sera plus jamais affiché — un nouveau mot de passe sera demandé à la première connexion.
            </p>
            <div className="flex items-center gap-2 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl p-3 mb-4">
              <code className="flex-1 text-base font-mono font-bold tracking-wider text-[#1C2321]">
                {tempPasswordInfo.tempPassword}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(tempPasswordInfo.tempPassword)}
                className="p-2 rounded-lg text-[#6B7873] hover:text-[#0F4C4A] hover:bg-white transition cursor-pointer"
                title="Copier"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTempPasswordInfo(null)}
              className="w-full py-2.5 bg-[#0F4C4A] hover:bg-[#0A3735] text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              J'ai noté le mot de passe
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
