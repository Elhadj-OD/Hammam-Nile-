import React from 'react';
import { useApp } from '../context/AppContext';
import { Quote, Invoice } from '../types';
import { Printer, Check, ArrowRight, X, FileText, Files, Stamp } from 'lucide-react';
import { HammamNileLogo } from './HammamNileLogo';

interface DocumentModalProps {
  type: 'quote' | 'invoice';
  data: Quote | Invoice | null;
  onClose: () => void;
  onConvertQuote?: (quoteId: number) => void;
  onMarkPaid?: (invoiceId: number) => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  type,
  data,
  onClose,
  onConvertQuote,
  onMarkPaid,
}) => {
  const { settings, clients } = useApp();

  if (!data) return null;

  const isQuote = type === 'quote';
  const quote = isQuote ? (data as Quote) : null;
  const invoice = !isQuote ? (data as Invoice) : null;

  const client = clients.find(c => c.id === data.clientId);
  const clientPhone = data.clientPhone || client?.phone || '';
  const clientEmail = data.clientEmail || client?.email || '';
  const clientAddress = data.clientAddress || client?.address || '';

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = () => {
    if (isQuote && quote) {
      switch (quote.status) {
        case 'draft':
          return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">BROUILLON</span>;
        case 'sent':
          return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">ENVOYÉ</span>;
        case 'accepted':
          return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">ACCEPTÉ</span>;
        case 'refused':
          return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">REFUSÉ</span>;
      }
    } else if (invoice) {
      switch (invoice.status) {
        case 'draft':
          return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">BROUILLON</span>;
        case 'issued':
          return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">ÉMISE / EN ATTENTE</span>;
        case 'paid':
          return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">RÉGLÉE / PAYÉE</span>;
        case 'overdue':
          return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">EN RETARD</span>;
        case 'cancelled':
          return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-600">ANNULÉE</span>;
      }
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Action Header (hidden in print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            {isQuote ? (
              <Files className="w-5 h-5 text-indigo-600" />
            ) : (
              <FileText className="w-5 h-5 text-purple-600" />
            )}
            <span className="font-semibold text-slate-800 text-sm">
              {isQuote ? `Devis ${quote?.number}` : `Facture ${invoice?.number}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>

            {isQuote && quote && quote.status !== 'accepted' && onConvertQuote && (
              <button
                onClick={() => onConvertQuote(quote.id)}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Convertir en Facture</span>
              </button>
            )}

            {!isQuote && invoice && invoice.status !== 'paid' && onMarkPaid && (
              <button
                onClick={() => onMarkPaid(invoice.id)}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Marquer Payée</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div id="document-printable" className="p-8 sm:p-10 bg-white overflow-y-auto print:p-0 print:overflow-visible">
          {/* Top Bar: Company Details & Document Title */}
          <div className="flex justify-between items-start border-b-2 border-[#004CB7] pb-6 mb-8">
            <div>
              <div className="mb-3">
                <HammamNileLogo variant="header" size="sm" color="#004CB7" textColor="#004CB7" />
              </div>
              <div className="text-xs text-slate-500 mt-1 max-w-sm space-y-0.5">
                <p className="font-semibold text-slate-700">{settings.address}</p>
                <p>Tél : {settings.phone}</p>
                <p>Email : {settings.email}</p>
                {settings.taxNumber && <p>NIF : {settings.taxNumber}</p>}
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-extrabold text-[#004CB7] font-serif tracking-wider">
                {isQuote ? 'DEVIS' : 'FACTURE'}
              </div>
              <div className="text-sm font-mono font-bold text-slate-700 mt-1">
                {data.number}
              </div>
              <div className="mt-2">{getStatusBadge()}</div>
            </div>
          </div>

          {/* Client & Date Info Block */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-2">
                Destinataire / Client
              </div>
              <div className="font-bold text-slate-900 text-sm">{data.clientName}</div>
              {clientPhone && <div className="text-xs text-slate-600 mt-1">Tél: {clientPhone}</div>}
              {clientEmail && <div className="text-xs text-slate-600">Email: {clientEmail}</div>}
              {clientAddress && <div className="text-xs text-slate-600">{clientAddress}</div>}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-2">
                  Détails du Document
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date d'émission :</span>
                    <span className="font-semibold">{data.date}</span>
                  </div>

                  {isQuote && quote && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Durée de validité :</span>
                      <span className="font-semibold">{quote.validity} jours</span>
                    </div>
                  )}

                  {!isQuote && invoice && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date d'échéance :</span>
                        <span className="font-semibold">{invoice.dueDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Conditions :</span>
                        <span className="font-semibold">
                          {invoice.paymentTerms === 'immediate'
                            ? 'Paiement Immédiat'
                            : invoice.paymentTerms === 'net30'
                            ? 'Net 30 jours'
                            : 'Net 60 jours'}
                        </span>
                      </div>
                      {invoice.paidDate && (
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Payée le :</span>
                          <span>{invoice.paidDate}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-left">Description / Article</th>
                  <th className="py-3 px-4 text-center w-20">Qté</th>
                  <th className="py-3 px-4 text-right w-28">Prix Unitaire</th>
                  <th className="py-3 px-4 text-right w-32">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-900 font-medium">{item.description}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{item.qty}</td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      {item.price.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {(item.qty * item.price).toLocaleString()} {settings.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals and Notes */}
          <div className="grid grid-cols-2 gap-8 items-start mb-8">
            <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="font-semibold text-slate-800 mb-1">Notes & Conditions :</div>
              <p>
                {data.notes ||
                  (isQuote
                    ? `Devis valable ${quote?.validity || 30} jours à compter de la date d'émission.`
                    : 'Règlement par virement Mobile Money (Bankily / Masrvi / Sedad) ou en espèces à la caisse.')}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                {settings.footerNote}
              </p>
            </div>

            <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Sous-total :</span>
                <span>{data.total.toLocaleString()} {settings.currency}</span>
              </div>
              <div className="border-t border-indigo-200 pt-2 flex justify-between items-center text-base font-bold text-indigo-950">
                <span>TOTAL NET :</span>
                <span className="text-lg text-indigo-700">
                  {data.total.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Stamp & Signature Section */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-dashed border-slate-300 text-center text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-700">Bon pour accord (Client)</p>
              <div className="h-20 border border-dashed border-slate-200 rounded-lg mt-2 flex items-end justify-center pb-2 text-[10px] text-slate-400">
                Date et Signature
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Cachet & Signature (Hammam)</p>
              <div className="h-20 border border-dashed border-slate-200 rounded-lg mt-2 flex items-center justify-center text-slate-400">
                <Stamp className="w-6 h-6 text-slate-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
