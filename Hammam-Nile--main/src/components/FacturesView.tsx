import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Invoice, LineItem, PaymentTerms } from '../types';
import { DocumentModal } from './DocumentModal';
import {
  FileText,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  Calendar,
  Clock,
  Search,
  Check,
  CreditCard,
  DollarSign,
} from 'lucide-react';

export const FacturesView: React.FC = () => {
  const {
    invoices,
    createInvoice,
    markInvoicePaid,
    deleteInvoice,
    clients,
    products,
    settings,
  } = useApp();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [newClientName, setNewClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('net30');
  const [notes, setNotes] = useState('');

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { productId: products[0]?.id, description: products[0]?.name || '', qty: 1, price: products[0]?.price || 0 },
  ]);

  const handleProductSelect = (index: number, productIdStr: string) => {
    const updated = [...lineItems];
    if (productIdStr === 'custom') {
      updated[index] = {
        ...updated[index],
        productId: undefined,
        description: 'Prestation / Article personnalisé',
        price: 0,
      };
    } else {
      const prod = products.find(p => p.id === parseInt(productIdStr));
      if (prod) {
        updated[index] = {
          ...updated[index],
          productId: prod.id,
          description: prod.name,
          price: prod.price,
        };
      }
    }
    setLineItems(updated);
  };

  const handleAddLine = () => {
    setLineItems(prev => [
      ...prev,
      { productId: undefined, description: '', qty: 1, price: 0 },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof LineItem, val: any) => {
    setLineItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.qty || 0) * (item.price || 0), 0);
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();

    let clientName = newClientName.trim();
    let phone = clientPhone;
    let email = clientEmail;
    let address = clientAddress;
    let cId: number | undefined = undefined;

    if (selectedClientId) {
      const found = clients.find(c => c.id === parseInt(selectedClientId));
      if (found) {
        cId = found.id;
        clientName = found.name;
        phone = found.phone;
        email = found.email;
        address = found.address;
      }
    }

    if (!clientName) {
      alert('Veuillez sélectionner ou saisir un nom de client');
      return;
    }

    const validLines = lineItems.filter(l => l.description.trim() && l.qty > 0);
    if (validLines.length === 0) {
      alert('Veuillez ajouter au moins une ligne valide');
      return;
    }

    const created = createInvoice({
      clientId: cId,
      clientName,
      clientPhone: phone,
      clientEmail: email,
      clientAddress: address,
      items: validLines,
      paymentTerms,
      notes,
    });

    setIsCreating(false);
    setSelectedClientId('');
    setNewClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientAddress('');
    setNotes('');
    setLineItems([{ productId: products[0]?.id, description: products[0]?.name || '', qty: 1, price: products[0]?.price || 0 }]);
    setSelectedInvoice(created);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'paid' && inv.status === 'paid') ||
      (filterStatus === 'pending' && inv.status !== 'paid');
    return matchesSearch && matchesFilter;
  });

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  const totalPending = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Comptabilité & Règlements</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">
            Facturation Clients
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des factures émises, encaissements et relances de paiement
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Fermer le formulaire' : 'Créer une Facture'}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Facturé</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {totalInvoiced.toLocaleString()} {settings.currency}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{invoices.length} factures au total</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-emerald-600 font-medium">Factures Réglées (Payées)</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {totalPaid.toLocaleString()} {settings.currency}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1">
            {invoices.filter(i => i.status === 'paid').length} soldée(s)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-amber-600 font-medium">En Attente d'Encaissement</div>
          <div className="text-xl font-bold text-amber-700 mt-1">
            {totalPending.toLocaleString()} {settings.currency}
          </div>
          <div className="text-[11px] text-amber-600/80 mt-1">
            {invoices.filter(i => i.status !== 'paid').length} en cours
          </div>
        </div>
      </div>

      {/* CREATE INVOICE FORM */}
      {isCreating && (
        <form
          onSubmit={handleSaveInvoice}
          className="bg-white rounded-2xl border border-purple-200 p-6 shadow-md space-y-6 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Nouvelle Facture Client</span>
            </h3>
            <span className="text-xs text-slate-400">Date : {new Date().toLocaleDateString('fr-FR')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client existant
              </label>
              <select
                value={selectedClientId}
                onChange={e => {
                  setSelectedClientId(e.target.value);
                  if (e.target.value) {
                    const found = clients.find(c => c.id === parseInt(e.target.value));
                    if (found) {
                      setNewClientName(found.name);
                      setClientPhone(found.phone);
                      setClientEmail(found.email);
                      setClientAddress(found.address);
                    }
                  }
                }}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Sélectionner un client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || 'Sans tel'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nom du client (ou nouveau) *
              </label>
              <input
                type="text"
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                placeholder="ex: Ahmed Mohamed"
                required
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Conditions de paiement
              </label>
              <select
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value as PaymentTerms)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
              >
                <option value="immediate">Paiement Immédiat</option>
                <option value="net30">Net 30 jours (Standard)</option>
                <option value="net60">Net 60 jours</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Téléphone</label>
              <input
                type="text"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="+222 43 43 12 34"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Adresse</label>
              <input
                type="text"
                value={clientAddress}
                onChange={e => setClientAddress(e.target.value)}
                placeholder="Nouakchott, Mauritanie"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Articles Facturés
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une ligne</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 bg-slate-100 text-[11px] font-semibold text-slate-700 p-2.5 border-b border-slate-200">
                <span className="col-span-5">Article / Description</span>
                <span className="col-span-2 text-center">Quantité</span>
                <span className="col-span-2 text-right">Prix Unitaire</span>
                <span className="col-span-2 text-right">Total Ligne</span>
                <span className="col-span-1 text-center"></span>
              </div>

              <div className="divide-y divide-slate-100 p-1 space-y-1">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center p-1.5 text-xs">
                    <div className="col-span-5 space-y-1">
                      <select
                        value={item.productId || 'custom'}
                        onChange={e => handleProductSelect(idx, e.target.value)}
                        className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="custom">✍️ Saisie libre / Prestation personnalisée</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.price} {settings.currency})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => handleLineChange(idx, 'description', e.target.value)}
                        placeholder="Description de la prestation..."
                        className="w-full text-xs p-1.5 border border-slate-200 rounded-lg"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e => handleLineChange(idx, 'qty', parseInt(e.target.value) || 1)}
                        className="w-full text-center text-xs p-1.5 border border-slate-200 rounded-lg"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.price}
                        onChange={e => handleLineChange(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full text-right text-xs p-1.5 border border-slate-200 rounded-lg"
                        required
                      />
                    </div>

                    <div className="col-span-2 text-right font-bold text-slate-900 pr-2">
                      {((item.qty || 0) * (item.price || 0)).toLocaleString()} {settings.currency}
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lineItems.length === 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Mentions particulières / Coordonnées bancaires
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ex: Virement sur compte Bankily ou Masrvi..."
                rows={2}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="w-full sm:w-72 bg-purple-50 p-4 rounded-xl border border-purple-100 text-right space-y-1">
              <span className="text-xs text-slate-500">Montant Total TTC :</span>
              <div className="text-2xl font-extrabold text-purple-900">
                {calculateTotal().toLocaleString()}{' '}
                <span className="text-sm font-semibold text-purple-700">{settings.currency}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="py-2.5 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Enregistrer la Facture</span>
            </button>
          </div>
        </form>
      )}

      {/* INVOICES LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">
              Registre des Factures ({filteredInvoices.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterStatus === 'all' ? 'bg-purple-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterStatus === 'pending' ? 'bg-amber-500 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                En Attente
              </button>
              <button
                onClick={() => setFilterStatus('paid')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterStatus === 'paid' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Payées
              </button>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Numéro ou client..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">N° Facture</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Émission</th>
                <th className="py-3 px-4">Échéance</th>
                <th className="py-3 px-4 text-right">Montant</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Aucune facture trouvée</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Créez une facture directe ou convertissez un devis existant.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {inv.number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {inv.clientName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{inv.date}</td>
                    <td className="py-3 px-4 text-slate-600">{inv.dueDate}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {inv.total.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status === 'paid' ? 'PAYÉE' : 'EN ATTENTE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Aperçu et impression"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Voir</span>
                        </button>

                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => {
                              markInvoicePaid(inv.id);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Marquer comme payée"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Payer</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm(`Supprimer la facture ${inv.number} ?`)) {
                              deleteInvoice(inv.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Document Modal */}
      {selectedInvoice && (
        <DocumentModal
          type="invoice"
          data={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onMarkPaid={id => {
            markInvoicePaid(id);
            setSelectedInvoice(prev => (prev ? { ...prev, status: 'paid', paidDate: new Date().toLocaleDateString('fr-FR') } : null));
          }}
        />
      )}
    </div>
  );
};
