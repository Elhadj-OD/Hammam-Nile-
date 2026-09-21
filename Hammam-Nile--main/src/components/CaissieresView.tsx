import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
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
} from 'lucide-react';

export const CaissieresView: React.FC = () => {
  const {
    currentUser,
    users,
    addUser,
    updateUser,
    deleteUser,
    switchUser,
    sales,
    settings,
    setActiveSection,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('caissier');
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
    setPassword('');
    setPhone('');
    setRole('caissier');
    setAvatarPreview('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setPassword(user.password || '');
    setPhone(user.phone || '');
    setRole(user.role);
    setAvatarPreview(user.avatar || '');
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Veuillez renseigner le nom complet de la caissière.');
      return;
    }

    const cleanUsername = (username.trim() || name.trim().split(' ')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');

    // Default avatar if none uploaded
    const finalAvatar = avatarPreview || name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const userData: User = {
      name: name.trim(),
      username: cleanUsername,
      password: password.trim() || '1234',
      phone: phone.trim(),
      role,
      avatar: finalAvatar,
      createdAt: editingUser?.createdAt || new Date().toISOString().split('T')[0],
    };

    if (editingUser) {
      updateUser(editingUser.username, userData);
    } else {
      addUser(userData);
    }

    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleDelete = (u: User) => {
    if (users.length <= 1) {
      alert('Impossible de supprimer le seul utilisateur du système.');
      return;
    }
    if (window.confirm(`Confirmez-vous la suppression de ${u.name} ?`)) {
      deleteUser(u.username);
    }
  };

  const handleSwitchToUser = (u: User) => {
    switchUser(u.username);
    setActiveSection('caisse');
  };

  // Compute sales stats per user
  const getUserStats = (uUsername: string) => {
    const userSales = sales.filter(s => s.caissier.toLowerCase() === uUsername.toLowerCase());
    const count = userSales.length;
    const totalAmount = userSales.reduce((acc, s) => acc + s.total, 0);
    return { count, totalAmount };
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    {/* Avatar Photo */}
                    <div className="relative">
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

                    <div>
                      <h3 className="font-bold font-display text-[16px] text-[#1C2321] leading-tight">
                        {u.name}
                      </h3>
                      <div className="text-xs text-[#6B7873] font-mono mt-0.5">
                        @{u.username}
                      </div>
                      <div className="mt-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            u.role === 'gerant'
                              ? 'bg-[#B8874B]/20 text-[#8B6433]'
                              : 'bg-[#E4E9E1] text-[#0F4C4A]'
                          }`}
                        >
                          {u.role === 'gerant' ? 'Gérante / Admin' : 'Caissière'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1">
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
                    <Key className="w-3.5 h-3.5 text-[#0F4C4A]" />
                    <span>Mot de passe : •••••••• (Confidentiel)</span>
                  </div>
                  {u.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#0F4C4A]" />
                      <span>Inscrite le : {u.createdAt}</span>
                    </div>
                  )}
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

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    disabled={!!editingUser}
                    className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-sans focus:outline-none focus:border-[#0F4C4A] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C2321] mb-1">
                    Code PIN / Mot de passe
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="1234"
                    className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-mono focus:outline-none focus:border-[#0F4C4A]"
                  />
                </div>
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
                  className="py-2.5 px-6 bg-[#0F4C4A] hover:bg-[#0A3735] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingUser ? 'Enregistrer les modifications' : 'Créer la Caissière'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
