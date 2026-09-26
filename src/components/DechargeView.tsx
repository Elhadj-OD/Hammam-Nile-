import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../lib/departments';
import {
  Wallet,
  Smartphone,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
} from 'lucide-react';

// Chaque caissière clôture sa propre caisse, pour son propre jour. Une fois
// faite, la décharge est définitive : pas de re-soumission ni de correction
// possible depuis l'app (aucune policy RLS d'UPDATE n'est accordée).
export const DechargeView: React.FC = () => {
  const { currentUser, sales, laveurCommissions, decharges, addOrUpdateDecharge, settings } = useApp();

  const [montantEspeceReel, setMontantEspeceReel] = useState<string>('');
  const [montantMobileMoneyReel, setMontantMobileMoneyReel] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const formatPrice = (val: number) => `${val.toLocaleString('fr-FR')} ${settings.currency}`;

  const myDept = currentUser?.department ? DEPARTMENTS[currentUser.department] : null;

  const todayZeroPadded = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }, []);
  const todayFormatted = useMemo(() => {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }, []);
  const matchesToday = (dateStr: string) => dateStr === todayFormatted || dateStr === todayZeroPadded;

  // Uniquement les ventes/commissions de la caissière connectée, pour
  // aujourd'hui — jamais celles des autres caisses.
  const mySales = useMemo(
    () => (currentUser ? sales.filter(s => s.caissier.toLowerCase() === currentUser.username.toLowerCase() && matchesToday(s.date)) : []),
    [sales, currentUser]
  );
  const myCommissions = useMemo(
    () =>
      currentUser
        ? laveurCommissions.filter(c => c.recordedBy.toLowerCase() === currentUser.username.toLowerCase() && matchesToday(c.date))
        : [],
    [laveurCommissions, currentUser]
  );

  const totalEspeceCalcule =
    mySales.filter(s => s.payment === 'cash').reduce((sum, s) => sum + s.total, 0) +
    myCommissions.filter(c => c.payment === 'cash').reduce((sum, c) => sum + c.price + c.bonus, 0);
  const totalMobileMoneyCalcule =
    mySales.filter(s => s.payment === 'mobile').reduce((sum, s) => sum + s.total, 0) +
    myCommissions.filter(c => c.payment === 'mobile').reduce((sum, c) => sum + c.price + c.bonus, 0);
  const nombreTransactions = mySales.length + myCommissions.length;

  const myHistory = useMemo(
    () =>
      currentUser
        ? decharges.filter(d => d.department === currentUser.department).sort((a, b) => b.timestamp - a.timestamp)
        : [],
    [decharges, currentUser]
  );
  const todaysDecharge = myHistory.find(d => matchesToday(d.dateDecharge));

  const especeReelNum = parseFloat(montantEspeceReel);
  const mobileReelNum = parseFloat(montantMobileMoneyReel);
  const hasEspeceInput = montantEspeceReel.trim() !== '' && !isNaN(especeReelNum);
  const hasMobileInput = montantMobileMoneyReel.trim() !== '' && !isNaN(mobileReelNum);

  const ecartEspecePreview = hasEspeceInput ? especeReelNum - totalEspeceCalcule : null;
  const ecartMobilePreview = hasMobileInput ? mobileReelNum - totalMobileMoneyCalcule : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!currentUser?.department) {
      setFormError('Votre profil n\'a pas de caisse dédiée : contactez la gérante.');
      return;
    }
    if (!hasEspeceInput || especeReelNum < 0) {
      setFormError('Veuillez saisir le montant espèces réellement compté en caisse.');
      return;
    }
    if (!hasMobileInput || mobileReelNum < 0) {
      setFormError('Veuillez saisir le montant mobile money réellement reçu.');
      return;
    }

    setSubmitting(true);
    const res = await addOrUpdateDecharge({
      dateDecharge: todayZeroPadded,
      department: currentUser.department,
      totalEspeceCalcule,
      totalMobileMoneyCalcule,
      nombreTransactions,
      montantEspeceReel: especeReelNum,
      montantMobileMoneyReel: mobileReelNum,
    });
    setSubmitting(false);

    if (!res.success) {
      setFormError(res.error || "Impossible d'enregistrer la décharge.");
      return;
    }
    setSuccessMsg('Décharge enregistrée. Vos ventes du jour sont maintenant clôturées.');
    setMontantEspeceReel('');
    setMontantMobileMoneyReel('');
  };

  const EcartBadge: React.FC<{ ecart: number }> = ({ ecart }) => {
    if (ecart === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Équilibré
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertTriangle className="w-3 h-3" />
        {ecart > 0 ? '+' : ''}
        {formatPrice(ecart)}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E0D3] shadow-xs">
        <div className="flex items-center gap-2 text-[#0F4C4A] text-xs font-bold uppercase tracking-wider mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Décharge — {myDept ? `${myDept.icon} ${myDept.label}` : 'Votre caisse'}</span>
        </div>
        <h1 className="text-2xl font-bold font-display text-[#1C2321]">Clôture de votre caisse — {todayZeroPadded}</h1>
        <p className="text-sm text-[#6B7873] mt-1">
          Les totaux ci-dessous sont calculés automatiquement à partir de ce que vous avez déjà enregistré aujourd'hui —
          pas besoin de ressaisir les paiements. Comptez juste ce qu'il y a réellement en caisse et sur le mobile money,
          avant de descendre. Une fois la décharge faite, vous ne pourrez plus modifier les services du jour.
        </p>
      </div>

      {todaysDecharge ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>
            Votre caisse d'aujourd'hui est déjà clôturée. Espèces comptées :{' '}
            <strong>{formatPrice(todaysDecharge.montantEspeceReel)}</strong>, Mobile Money :{' '}
            <strong>{formatPrice(todaysDecharge.montantMobileMoneyReel)}</strong>. À demain !
          </span>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
              <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
                <span>Espèces (calculé)</span>
                <div className="w-7 h-7 rounded-lg bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#0F4C4A] font-display">{formatPrice(totalEspeceCalcule)}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
              <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
                <span>Mobile Money (calculé)</span>
                <div className="w-7 h-7 rounded-lg bg-[#F7F3EC] text-[#B8874B] flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#B8874B] font-display">{formatPrice(totalMobileMoneyCalcule)}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E7E0D3] shadow-xs">
              <div className="flex items-center justify-between text-[#6B7873] text-xs font-bold uppercase mb-2">
                <span>Transactions</span>
                <div className="w-7 h-7 rounded-lg bg-[#F7F3EC] text-[#1C2321] flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#1C2321] font-display">{nombreTransactions}</div>
            </div>
          </div>

          {/* Faire la décharge */}
          <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xs p-6">
            <h3 className="text-sm font-bold text-[#1C2321] mb-1">Faire la décharge</h3>
            <p className="text-xs text-[#6B7873] mb-4">
              Comptez le tiroir-caisse et vérifiez le solde mobile money, puis saisissez les montants réels. Vérifiez
              bien avant de valider : ce sera définitif.
            </p>

            {formError && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Espèces réellement comptées ({settings.currency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={montantEspeceReel}
                  onChange={e => setMontantEspeceReel(e.target.value)}
                  placeholder={String(totalEspeceCalcule)}
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-mono focus:outline-none focus:border-[#0F4C4A]"
                />
                {ecartEspecePreview !== null && (
                  <div className="mt-1.5">
                    <EcartBadge ecart={ecartEspecePreview} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C2321] mb-1">
                  Solde mobile money réel ({settings.currency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={montantMobileMoneyReel}
                  onChange={e => setMontantMobileMoneyReel(e.target.value)}
                  placeholder={String(totalMobileMoneyCalcule)}
                  className="w-full text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] font-mono focus:outline-none focus:border-[#0F4C4A]"
                />
                {ecartMobilePreview !== null && (
                  <div className="mt-1.5">
                    <EcartBadge ecart={ecartMobilePreview} />
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#0F4C4A] hover:bg-[#0A3735] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{submitting ? 'Enregistrement...' : 'Faire la décharge'}</span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Mon historique */}
      <div className="bg-white rounded-2xl border border-[#E7E0D3] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E7E0D3] bg-[#F7F3EC]/50">
          <h3 className="text-xs font-bold text-[#1C2321] uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-[#0F4C4A]" />
            <span>Mon Historique ({myHistory.length})</span>
          </h3>
        </div>

        {myHistory.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F3EC] text-[#6B7873] flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-[#B8874B]" />
            </div>
            <h4 className="text-sm font-bold text-[#1C2321]">Aucune décharge enregistrée</h4>
            <p className="text-xs text-[#6B7873] mt-1">Faites la décharge du jour ci-dessus pour commencer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F3EC]/80 border-b border-[#E7E0D3] text-[#6B7873] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Espèce calculé</th>
                  <th className="py-3 px-4 text-right">Espèce réel</th>
                  <th className="py-3 px-4">Écart Espèce</th>
                  <th className="py-3 px-4 text-right">Mobile calculé</th>
                  <th className="py-3 px-4 text-right">Mobile réel</th>
                  <th className="py-3 px-4">Écart Mobile</th>
                  <th className="py-3 px-4 text-center">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D3]">
                {myHistory.map(d => (
                  <tr key={d.id} className="hover:bg-[#F7F3EC]/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-[#1C2321]">{d.dateDecharge}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">{formatPrice(d.totalEspeceCalcule)}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-semibold">
                      {formatPrice(d.montantEspeceReel)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <EcartBadge ecart={d.ecartEspece} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">{formatPrice(d.totalMobileMoneyCalcule)}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-semibold">
                      {formatPrice(d.montantMobileMoneyReel)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <EcartBadge ecart={d.ecartMobileMoney} />
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">{d.nombreTransactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
