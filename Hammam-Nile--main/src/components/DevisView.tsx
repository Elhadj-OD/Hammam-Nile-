import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LineItem, Quote } from '../types';
import { DocumentModal } from './DocumentModal';
import {
  Files,
  Plus,
  Trash2,
  Eye,
  ArrowRight,
  Printer,
  Calendar,
  User,
  CheckCircle2,
  FileCheck,
  Search,
} from 'lucide-react';

export const DevisView: React.FC = () => {
  const {
    quotes,
    createQuote,
    convertQuoteToInvoice,
    deleteQuote,
    clients,
    products,
    settings,
  } = useApp();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [search, setSearch] = useState('');

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [newClientName, setNewClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [validityDays, setValidityDays] = useState(30);
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

  const handleSaveQuote = (e: React.FormEvent) => {
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
      alert('Veuillez ajouter au moins un article valide');
      return;
    }

    const created = createQuote({
      clientId: cId,
      clientName,
      clientPhone: phone,
      clientEmail: email,
      clientAddress: address,
      items: validLines,
      validity: validityDays,
      notes,
    });

    // Reset Form
    setIsCreating(false);
    setSelectedClientId('');
    setNewClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientAddress('');
    setNotes('');
    setLineItems([{ productId: products[0]?.id, description: products[0]?.name || '', qty: 1, price: products[0]?.price || 0 }]);
    setSelectedQuote(created);
  };

  const filteredQuotes = quotes.filter(
    q =>
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      q.clientName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Files className="w-3.5 h-3.5" />
            <span>Gestion Commerciale</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">
            Devis & Propositions Pro-forma
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Établissez des devis professionnels et convertissez-les en factures en 1 clic
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Fermer le formulaire' : 'Créer un Devis'}</span>
        </button>
      </div>

      {/* CREATE QUOTE FORM */}
      {isCreating && (
        <form
          onSubmit={handleSaveQuote}
          className="bg-white rounded-2xl border border-indigo-200 p-6 shadow-md space-y-6 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Files className="w-4 h-4 text-indigo-600" />
              <span>Nouveau Devis Commercial</span>
            </h3>
            <span className="text-xs text-slate-400">Date : {new Date().toLocaleDateString('fr-FR')}</span>
          </div>

          {/* Client Selection */}
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
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Sélectionner un client enregistré --</option>
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
                placeholder="ex: Ahmed Ould Vall"
                required
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Validité du devis (en jours)
              </label>
              <input
                type="number"
                min="1"
                value={validityDays}
                onChange={e => setValidityDays(parseInt(e.target.value) || 30)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Optional contact info */}
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
                placeholder="client@example.mr"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Adresse</label>
              <input
                type="text"
                value={clientAddress}
                onChange={e => setClientAddress(e.target.value)}
                placeholder="Tevragh Zeina, Nouakchott"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Articles & Prestations
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
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
                    {/* Select Product or type description */}
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
                        placeholder="Description de l'article..."
                        className="w-full text-xs p-1.5 border border-slate-200 rounded-lg"
                        required
                      />
                    </div>

                    {/* Qty */}
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

                    {/* Unit Price */}
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

                    {/* Total line */}
                    <div className="col-span-2 text-right font-bold text-slate-900 pr-2">
                      {((item.qty || 0) * (item.price || 0)).toLocaleString()} {settings.currency}
                    </div>

                    {/* Delete line */}
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

          {/* Notes & Total */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Notes spécifiques / Conditions du devis
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ex: Remise spéciale accordée, livraison incluse, conditions particulières..."
                rows={2}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="w-full sm:w-72 bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-right space-y-1">
              <span className="text-xs text-slate-500">Montant Total du Devis :</span>
              <div className="text-2xl font-extrabold text-indigo-900">
                {calculateTotal().toLocaleString()}{' '}
                <span className="text-sm font-semibold text-indigo-700">{settings.currency}</span>
              </div>
            </div>
          </div>

          {/* Submit */}
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
              className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Enregistrer le Devis</span>
            </button>
          </div>
        </form>
      )}

      {/* QUOTES LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">
              Liste des Devis Émis ({filteredQuotes.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher numéro ou client..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">N° Devis</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Validité</th>
                <th className="py-3 px-4 text-right">Montant</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Files className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Aucun devis trouvé</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cliquez sur "Créer un Devis" pour générer votre première proposition.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuotes.map(quote => (
                  <tr key={quote.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {quote.number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {quote.clientName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{quote.date}</td>
                    <td className="py-3 px-4 text-slate-600">{quote.validity} jours</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {quote.total.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          quote.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : quote.status === 'refused'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {quote.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedQuote(quote)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Aperçu et impression"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Voir</span>
                        </button>

                        {quote.status !== 'accepted' && (
                          <button
                            onClick={() => {
                              const inv = convertQuoteToInvoice(quote.id);
                              if (inv) alert(`Devis converti avec succès en Facture ${inv.number} !`);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Convertir en facture"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Facturer</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm(`Supprimer le devis ${quote.number} ?`)) {
                              deleteQuote(quote.id);
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

      {/* Quote Document Modal */}
      {selectedQuote && (
        <DocumentModal
          type="quote"
          data={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onConvertQuote={id => {
            const inv = convertQuoteToInvoice(id);
            setSelectedQuote(null);
            if (inv) alert(`Devis converti avec succès en Facture ${inv.number} !`);
          }}
        />
      )}
    </div>
  );
};
