import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sale } from '../types';
import { Printer, X, Copy, Check } from 'lucide-react';
import { HammamNileLogo } from './HammamNileLogo';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { settings } = useApp();
  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  const fmt = (n: number) => {
    return `${n.toLocaleString('fr-FR')} ${settings.currency}`;
  };

  const ticketNumber = `HN-${String(sale.id).padStart(5, '0')}`;
  const cashierDisplayName =
    sale.caissierName || (sale.caissier?.toLowerCase() === 'sophia' ? 'Sophia (Admin)' : 'Elhadj (Caisse)');

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `
--------------------------------
${settings.shopName.toUpperCase()} — ${settings.slogan || 'BOUTIQUE HAMMAM'}
${settings.address}
Tél : ${settings.phone}
--------------------------------
Ticket N° : ${ticketNumber}
Date/Heure : ${sale.date} à ${sale.time}
Caissière  : ${cashierDisplayName}
Client     : ${sale.customerName || 'Passage'}
--------------------------------
${sale.items.map(i => `${i.name} (x${i.qty}) : ${fmt(i.price * i.qty)}`).join('\n')}
--------------------------------
Total Payé : ${fmt(sale.total)}
Règlement  : ${sale.paymentDetail || (sale.payment === 'cash' ? 'Espèces' : 'Mobile Money')}
--------------------------------
${settings.footerNote || 'Merci de votre visite et à très bientôt !'}
    `;
    navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Un exemplaire du ticket (client ou caisse) — dupliqué à l'impression
  // pour sortir deux copies d'un coup : une pour le client, une à garder
  // pour vérification.
  const TicketCard: React.FC<{ copyLabel?: string }> = ({ copyLabel }) => (
    <div className="border border-[#E7E0D3] rounded-2xl p-3.5 mb-3.5 bg-white">
      {copyLabel && (
        <div className="text-center text-[10px] font-extrabold uppercase tracking-widest text-[#B8874B] mb-2 pb-2 border-b border-dashed border-[#E7E0D3]">
          {copyLabel}
        </div>
      )}
      <div className="flex flex-col divide-y divide-[#E7E0D3]">
        {sale.items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 ${idx > 0 ? 'pt-3' : ''} ${
              idx < sale.items.length - 1 ? 'pb-3' : ''
            }`}
          >
            <div className="w-11 h-11 rounded-[10px] bg-[#F7F3EC] flex items-center justify-center text-[20px] shrink-0 overflow-hidden">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                item.emoji || '🧼'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-[#6B7873] capitalize block truncate">
                {item.category || 'Article boutique'}
              </span>
              <span className="text-[13.5px] font-bold text-[#1C2321] block truncate my-0.5">
                {item.name}
              </span>
              <span className="text-[11.5px] text-[#6B7873] block">
                {item.qty} × {fmt(item.price)}
              </span>
            </div>
            <div className="text-[13px] font-extrabold text-[#0F4C4A] whitespace-nowrap">
              {fmt(item.price * item.qty)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3.5 pt-3.5 border-t border-[#E7E0D3]">
        <div className="text-[14px] font-bold text-[#1C2321] mb-2.5">
          Résumé du ticket
        </div>

        <div className="flex justify-between text-[13px] py-1.5 border-b border-[#E7E0D3]">
          <span className="text-[#6B7873]">N° Ticket</span>
          <span className="font-bold font-mono text-[#1C2321]">{ticketNumber}</span>
        </div>

        <div className="flex justify-between text-[13px] py-1.5 border-b border-[#E7E0D3]">
          <span className="text-[#6B7873]">Client</span>
          <span className="font-bold text-[#1C2321]">{sale.customerName || 'Client Comptoir'}</span>
        </div>

        {sale.customerPhone && (
          <div className="flex justify-between text-[13px] py-1.5 border-b border-[#E7E0D3]">
            <span className="text-[#6B7873]">Téléphone</span>
            <span className="font-bold text-[#1C2321]">{sale.customerPhone}</span>
          </div>
        )}

        <div className="flex justify-between text-[13px] py-1.5 border-b border-[#E7E0D3]">
          <span className="text-[#6B7873]">Caissière</span>
          <span className="font-bold text-[#1C2321]">{cashierDisplayName}</span>
        </div>

        <div className="flex justify-between text-[13px] py-1.5 border-b border-[#E7E0D3]">
          <span className="text-[#6B7873]">Heure</span>
          <span className="font-bold text-[#1C2321]">
            {sale.time} ({sale.date})
          </span>
        </div>

        <div className="flex justify-between text-[13px] py-1.5 border-b border-[#E7E0D3]">
          <span className="text-[#6B7873]">Mode de paiement</span>
          <span className="font-bold text-[#1C2321]">
            {sale.paymentDetail || (sale.payment === 'cash' ? 'Espèces' : 'Mobile Money')}
          </span>
        </div>

        {sale.discount && sale.discount > 0 ? (
          <div className="flex justify-between text-[13px] py-1.5 border-b border-[#E7E0D3] text-[#C1613F]">
            <span>Remise accordée</span>
            <span className="font-bold">- {fmt(sale.discount)}</span>
          </div>
        ) : null}

        <div className="flex justify-between items-center pt-3 mt-0.5 border-t border-dashed border-[#E7E0D3]">
          <span className="text-[13px] text-[#6B7873]">Total payé</span>
          <span className="font-display text-[20px] font-bold text-[#0F4C4A]">
            {fmt(sale.total)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A3735]/55 backdrop-blur-xs overflow-y-auto">
      {/* Phone-style Ticket Card Container */}
      <div className="relative w-full max-w-[370px] max-h-[92vh] overflow-y-auto bg-white rounded-[30px] p-6 shadow-[0_40px_70px_-30px_rgba(10,55,53,0.5)] border border-[#E7E0D3] my-auto text-[#1C2321] animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button in corner */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#6B7873] hover:text-[#1C2321] hover:bg-[#F7F3EC] transition cursor-pointer no-print"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="receipt-print-area">
          {/* Official Hammam Nile Header Section */}
          <div className="flex flex-col items-center text-center mb-5 pt-1">
            <div className="p-2.5 rounded-2xl bg-[#F0F5FD] border border-[#004CB7]/15 mb-2">
              <HammamNileLogo variant="full" size="md" color="#004CB7" textColor="#004CB7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F7F3EC] text-[11px] font-bold text-[#6B7873] border border-[#E7E0D3]">
              <span>Ticket de Vente & Reçu</span>
            </div>
          </div>

          {/* Copie client — visible à l'écran et à l'impression */}
          <TicketCard copyLabel="Exemplaire client" />

          {/* Copie caisse — imprimée en plus, jamais affichée à l'écran */}
          <div className="print-only">
            <div className="my-4 border-t-2 border-dashed border-[#B8B2A0]" />
            <TicketCard copyLabel="Exemplaire caisse — vérification" />
          </div>
        </div>

        {/* Ticket Actions */}
        <div className="flex flex-col gap-2.5 mt-4 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full bg-[#0A3735] hover:bg-[#0F4C4A] text-white border-none rounded-full py-3.5 px-4 font-bold text-[14px] cursor-pointer transition duration-150 flex items-center justify-center gap-2 shadow-md font-sans"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer le ticket (2 exemplaires)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#F7F3EC] hover:bg-[#E7E0D3] text-[#1C2321] border-none rounded-full py-3.5 px-4 font-bold text-[14px] cursor-pointer transition duration-150 font-sans"
          >
            Nouvelle vente
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full bg-transparent text-[#6B7873] hover:text-[#1C2321] py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Texte copié dans le presse-papier !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copier le ticket (SMS / WhatsApp)</span>
              </>
            )}
          </button>
        </div>

        {/* Confirmation Footer */}
        <div className="text-center text-[#2F8F5B] text-[12px] font-bold mt-3.5 flex items-center justify-center gap-1 no-print">
          <span>✓</span>
          <span>Paiement confirmé et enregistré</span>
        </div>
      </div>
    </div>
  );
};
