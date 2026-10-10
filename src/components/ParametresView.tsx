import React, { useEffect, useState } from 'react';
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
  Printer,
  AlertTriangle,
  Trash2,
  X,
} from 'lucide-react';
import { HammamNileLogo } from './HammamNileLogo';
import { pairCashDrawerPrinter, hasCashDrawerPrinter, forgetCashDrawerPrinter } from '../lib/cashDrawer';

const RESET_HISTORY_CONFIRM_WORD = 'SUPPRIMER';

export const ParametresView: React.FC = () => {
  const { settings, updateSettings, resetDemoData, resetAllHistory } = useApp();

  const [showResetHistoryModal, setShowResetHistoryModal] = useState(false);
  const [resetHistoryConfirmInput, setResetHistoryConfirmInput] = useState('');
  const [resetHistorySubmitting, setResetHistorySubmitting] = useState(false);
  const [resetHistoryError, setResetHistoryError] = useState('');
  const [resetHistoryDone, setResetHistoryDone] = useState(false);

  const handleConfirmResetHistory = async () => {
    setResetHistorySubmitting(true);
    setResetHistoryError('');
    const res = await resetAllHistory();
    setResetHistorySubmitting(false);
    if (!res.success) {
      setResetHistoryError(res.error || 'Une erreur est survenue.');
      return;
    }
    setShowResetHistoryModal(false);
    setResetHistoryConfirmInput('');
    setResetHistoryDone(true);
    setTimeout(() => setResetHistoryDone(false), 5000);
  };

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

  // Tiroir-caisse (USB, via l'imprimante thermique)
  const [drawerConnected, setDrawerConnected] = useState(false);
  const [drawerPairing, setDrawerPairing] = useState(false);
  const [drawerMsg, setDrawerMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const webUsbSupported = typeof navigator !== 'undefined' && !!navigator.usb;

  useEffect(() => {
    hasCashDrawerPrinter().then(setDrawerConnected);
  }, []);

  const handlePairDrawer = async () => {
    setDrawerPairing(true);
    setDrawerMsg(null);
    const res = await pairCashDrawerPrinter();
    setDrawerPairing(false);
    if (res.success) {
      setDrawerConnected(true);
      setDrawerMsg({ text: 'Imprimante connectée ! Le tiroir-caisse s\'ouvrira automatiquement à chaque vente en espèces.', type: 'ok' });
    } else {
      setDrawerMsg({ text: res.error || 'Connexion impossible.', type: 'err' });
    }
  };

  const handleForgetDrawer = () => {
    forgetCashDrawerPrinter();
    setDrawerConnected(false);
    setDrawerMsg(null);
  };

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

      {resetHistoryDone && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Historique réinitialisé. Ventes, services, mouvements, décharges et fiches clients sont repartis à zéro.</span>
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
            className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Enregistrer les Modifications</span>
          </button>
        </div>
      </form>

      {/* Tiroir-caisse */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#004CB7] flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" />
          <span>Tiroir-Caisse (imprimante thermique, USB)</span>
        </h4>
        <p className="text-xs text-slate-600">
          Connectez une seule fois l'imprimante thermique reliée au tiroir-caisse (câble RJ11) : le tiroir s'ouvrira
          ensuite automatiquement à chaque vente encaissée en espèces, sans rien faire de plus.
        </p>

        {!webUsbSupported && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Cette fonction nécessite Chrome ou Edge sur ordinateur.</span>
          </div>
        )}

        {drawerMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium border ${
              drawerMsg.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {drawerMsg.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{drawerMsg.text}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {drawerConnected && !drawerMsg && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Imprimante connectée
            </span>
          )}
          <button
            type="button"
            onClick={handlePairDrawer}
            disabled={!webUsbSupported || drawerPairing}
            className="py-2 px-4 bg-[#004CB7] hover:bg-[#002E6E] text-white rounded-full text-xs font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{drawerPairing ? 'Connexion...' : drawerConnected ? 'Reconnecter / changer' : 'Connecter le tiroir-caisse'}</span>
          </button>
          {drawerConnected && (
            <button
              type="button"
              onClick={handleForgetDrawer}
              className="py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-semibold transition cursor-pointer"
            >
              Oublier
            </button>
          )}
        </div>
      </div>

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
          className="py-2 px-4 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Réinitialiser les données de démo</span>
        </button>
      </div>

      {/* Danger Zone: Reset real history (sales/services/movements/decharges/clients) */}
      <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-6 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Réinitialiser l'historique</span>
        </h4>
        <p className="text-xs text-slate-600">
          Supprime définitivement : les ventes (boutique et services), les commissions Hammam, les mouvements de
          stock, les décharges (clôtures journalières) et les fiches clients. Ne touche pas au catalogue
          (produits/services), aux employées/laveurs, aux comptes, ni aux dépenses — tout ça reste intact.
        </p>
        <p className="text-xs font-semibold text-rose-700">
          Irréversible : à utiliser uniquement pour effacer des données de test avant la mise en service réelle.
        </p>

        <button
          type="button"
          onClick={() => {
            setShowResetHistoryModal(true);
            setResetHistoryConfirmInput('');
            setResetHistoryError('');
          }}
          className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold flex items-center gap-2 transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Réinitialiser l'historique</span>
        </button>
      </div>

      {/* Modal: confirmation forte avant suppression définitive */}
      {showResetHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-rose-800">Confirmer la suppression</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetHistoryModal(false)}
                className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-700">
                Cette action supprime <strong>définitivement et pour toujours</strong> : ventes, services/commissions
                Hammam, mouvements de stock, décharges et fiches clients. Impossible à annuler.
              </p>
              <p className="text-xs text-slate-700">
                Pour confirmer, tapez <strong>{RESET_HISTORY_CONFIRM_WORD}</strong> ci-dessous :
              </p>
              <input
                type="text"
                value={resetHistoryConfirmInput}
                onChange={e => setResetHistoryConfirmInput(e.target.value)}
                placeholder={RESET_HISTORY_CONFIRM_WORD}
                className="w-full text-sm p-2.5 bg-slate-50 border border-rose-200 rounded-xl focus:outline-none focus:border-rose-400"
                autoFocus
              />

              {resetHistoryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  {resetHistoryError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowResetHistoryModal(false)}
                  className="flex-1 py-2.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={resetHistoryConfirmInput !== RESET_HISTORY_CONFIRM_WORD || resetHistorySubmitting}
                  onClick={handleConfirmResetHistory}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{resetHistorySubmitting ? 'Suppression...' : 'Supprimer définitivement'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
