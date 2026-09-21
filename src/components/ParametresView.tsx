import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Store,
  MapPin,
  Phone,
  Mail,
  Coins,
  FileText,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Download,
  Upload,
  Sparkles,
} from 'lucide-react';
import { HammamNileLogo } from './HammamNileLogo';

export const ParametresView: React.FC = () => {
  const { settings, updateSettings, resetDemoData } = useApp();

  const [shopName, setShopName] = useState(settings.shopName);
  const [slogan, setSlogan] = useState(settings.slogan || '');
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [currency, setCurrency] = useState(settings.currency);
  const [taxNumber, setTaxNumber] = useState(settings.taxNumber || '');
  const [rcNumber, setRcNumber] = useState(settings.rcNumber || '');
  const [footerNote, setFooterNote] = useState(settings.footerNote || '');

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      shopName: shopName.trim(),
      slogan: slogan.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      currency: currency.trim() || 'MRU',
      taxNumber: taxNumber.trim(),
      rcNumber: rcNumber.trim(),
      footerNote: footerNote.trim(),
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Êtes-vous certain de vouloir réinitialiser toutes les données aux valeurs de démonstration ?'
      )
    ) {
      resetDemoData();
      alert('✓ Données de démonstration restaurées !');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#004CB7] mb-1">
            <Settings className="w-3.5 h-3.5" />
            <span>Configuration & Identité</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">
            Paramètres de l'Établissement
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordonnées, logo officiel et personnalisation des tickets, devis et factures
          </p>
        </div>

        {/* Logo preview */}
        <div className="p-3 bg-[#F0F5FD] rounded-2xl border border-[#004CB7]/20 flex items-center gap-3 shrink-0">
          <HammamNileLogo variant="header" size="sm" color="#004CB7" textColor="#004CB7" />
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Paramètres enregistrés avec succès ! Les nouveaux documents utiliseront ces informations.</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span>Nom Commercial du Hammam *</span>
            </label>
            <input
              type="text"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              required
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span>Slogan / Activité sur le ticket</span>
            </label>
            <input
              type="text"
              value={slogan}
              onChange={e => setSlogan(e.target.value)}
              placeholder="ex: Boutique & Rituels Traditionnels"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-slate-400" />
              <span>Devise Monétaire (Symbole) *</span>
            </label>
            <input
              type="text"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              placeholder="ex: MRU, UM"
              required
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Adresse géographique</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Téléphone(s) de contact</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Adresse Email officielle</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Numéro d'Identification Fiscale (NIF)</span>
            </label>
            <input
              type="text"
              value={taxNumber}
              onChange={e => setTaxNumber(e.target.value)}
              placeholder="ex: NIF-98234710-B"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Registre du Commerce (RC)</span>
            </label>
            <input
              type="text"
              value={rcNumber}
              onChange={e => setRcNumber(e.target.value)}
              placeholder="ex: RC-45192/NKC/2024"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Message de pied de page pour tickets et factures
          </label>
          <textarea
            value={footerNote}
            onChange={e => setFooterNote(e.target.value)}
            rows={2}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Enregistrer les Modifications</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Reset Data */}
      <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-6 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
          Maintenance & Restauration
        </h4>
        <p className="text-xs text-slate-600">
          En cas de besoin de démonstration ou pour repartir sur une base propre, vous pouvez réinitialiser
          toutes les données de la boutique à leur état d'origine.
        </p>

        <button
          type="button"
          onClick={handleReset}
          className="py-2 px-4 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Réinitialiser les données de démo</span>
        </button>
      </div>
    </div>
  );
};
