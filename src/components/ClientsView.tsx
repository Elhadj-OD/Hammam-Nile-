import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Client, Sale } from '../types';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Search,
  CheckCircle2,
  FileText,
  ShoppingBag,
  Clock,
  Calendar,
  Eye,
  Receipt,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';

export const ClientsView: React.FC = () => {
  const { clients, addClient, deleteClient, invoices, quotes, sales, settings, firebaseConnected } =
    useApp();

  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClientHistory, setSelectedClientHistory] = useState<Client | null>(null);
  const [receiptSaleToView, setReceiptSaleToView] = useState<Sale | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Le nom du client est obligatoire');
      return;
    }

    addClient({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      notes: notes.trim(),
      purchaseCount: 0,
      totalSpent: 0,
    });

    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    setIsAdding(false);
  };

  // Helper to find all sales associated with a client
  const getClientSales = (client: Client): Sale[] => {
    const cleanPhone = (client.phone || '').replace(/\s+/g, '');
    const cleanName = client.name.trim().toLowerCase();

    return sales.filter(s => {
      if (cleanPhone && s.customerPhone && s.customerPhone.replace(/\s+/g, '') === cleanPhone) {
        return true;
      }
      if (s.customerName && s.customerName.trim().toLowerCase() === cleanName) {
        return true;
      }
      return false;
    });
  };

  // Compute total purchases count & amount for a client
  const getClientMetrics = (client: Client) => {
    const clientSales = getClientSales(client);
    const clientInvoices = invoices.filter(i => i.clientId === client.id);

    const salesTotal = clientSales.reduce((sum, s) => sum + s.total, 0);
    const invoicesTotal = clientInvoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.total, 0);

    const totalSpent = Math.max(
      client.totalSpent || 0,
      salesTotal + invoicesTotal
    );

    const totalPurchases = Math.max(
      client.purchaseCount || 0,
      clientSales.length + clientInvoices.length
    );

    const lastSaleDate = clientSales.length > 0 ? clientSales[0].date : client.lastPurchaseDate || '--';

    return {
      sales: clientSales,
      invoices: clientInvoices,
      totalSpent,
      totalPurchases,
      lastSaleDate,
    };
  };

  const filteredClients = clients.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  // Overall statistics
  const totalClientsCount = clients.length;
  const activeBuyingClients = clients.filter(c => (c.purchaseCount || 0) > 0 || getClientSales(c).length > 0).length;
  const grandTotalSpent = clients.reduce((sum, c) => sum + getClientMetrics(c).totalSpent, 0);

  return (
    <div className="space-y-6">
      {/* Header & Quick stats */}
      <div className="bg-white rounded-3xl border border-[#E7E0D3] p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F4C4A] mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Fichier Clientèle & Historique des Achats</span>
            {firebaseConnected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Firebase Cloud Connecté
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">
            Carnet des Clients & Fréquence d'Achat
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivez le nombre de fois que chaque client a acheté en caisse, le total dépensé et les détails complets des articles
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2.5 bg-[#0A3735] hover:bg-[#0F4C4A] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isAdding ? 'Fermer le formulaire' : 'Nouveau Client Manuel'}</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F0F5FD] text-[#004CB7] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Clients Référencés</div>
            <div className="text-lg font-bold text-slate-900">{totalClientsCount} clients</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Clients Actifs (Ayant Acheté)</div>
            <div className="text-lg font-bold text-slate-900">{activeBuyingClients} fidèles</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Total Dépenses Clients</div>
            <div className="text-lg font-bold text-slate-900">
              {grandTotalSpent.toLocaleString('fr-FR')} {settings.currency}
            </div>
          </div>
        </div>
      </div>

      {/* Add Client Form */}
      {isAdding && (
        <form
          onSubmit={handleAddClient}
          className="bg-white rounded-2xl border border-[#0F4C4A]/30 p-6 shadow-md space-y-4 animate-in fade-in duration-200"
        >
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <UserPlus className="w-4 h-4 text-[#0F4C4A]" />
            <span>Ajouter une Fiche Client au Répertoire</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nom complet du client *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Mohamed Ould Vall"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0F4C4A] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numéro de Téléphone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ex: +222 45 25 10 20"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0F4C4A] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse Email (Optionnel)
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="client@hammam-nile.mr"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0F4C4A] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse géographique / Quartier
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ex: Tevragh Zeina, Nouakchott"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0F4C4A] focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes & Préférences
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Préférences de soins, produits favoris, etc."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0F4C4A] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0A3735] hover:bg-[#0F4C4A] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Enregistrer le client
            </button>
          </div>
        </form>
      )}

      {/* Clients Table Card */}
      <div className="bg-white rounded-3xl border border-[#E7E0D3] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">
              Liste des Clients ({filteredClients.length})
            </span>
            <span className="text-[11px] text-slate-400">
              • Les clients renseignés en caisse apparaissent ici automatiquement
            </span>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher nom, tél, email..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0F4C4A] focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F3EC] text-slate-700 font-semibold border-b border-[#E7E0D3]">
              <tr>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Téléphone (Admin)</th>
                <th className="py-3 px-4">Adresse & Quartier</th>
                <th className="py-3 px-4 text-center">Nb de fois Acheté</th>
                <th className="py-3 px-4 text-right">Total Dépensé</th>
                <th className="py-3 px-4 text-center">Historique & Articles</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Aucun client trouvé</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Renseignez le nom et le numéro d'un client en caisse pour créer sa fiche automatiquement.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => {
                  const metrics = getClientMetrics(client);

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/70 transition">
                      {/* Name */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center font-bold text-[11px]">
                            {client.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div>{client.name}</div>
                            {client.notes && (
                              <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                                {client.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 text-slate-700">
                        {client.phone ? (
                          <a
                            href={`tel:${client.phone}`}
                            className="inline-flex items-center gap-1.5 text-[#004CB7] hover:underline font-medium"
                          >
                            <Phone className="w-3 h-3 text-[#004CB7]" />
                            <span>{client.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 font-normal">--</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4 text-slate-600">
                        {client.address ? (
                          <span className="truncate max-w-xs block">{client.address}</span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* Number of times purchased */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            metrics.totalPurchases > 0
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>
                            {metrics.totalPurchases} achat{metrics.totalPurchases > 1 ? 's' : ''}
                          </span>
                        </span>
                      </td>

                      {/* Total spent */}
                      <td className="py-3 px-4 text-right font-extrabold text-[#0F4C4A] text-[13px]">
                        {metrics.totalSpent.toLocaleString('fr-FR')} {settings.currency}
                      </td>

                      {/* Details button */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedClientHistory(client)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F3EC] hover:bg-[#E4E9E1] text-[#0F4C4A] font-bold rounded-xl text-[11px] transition cursor-pointer border border-[#E7E0D3]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Voir détails ({metrics.sales.length})</span>
                        </button>
                      </td>

                      {/* Delete */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Supprimer la fiche client de ${client.name} ?`)) {
                              deleteClient(client.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Supprimer la fiche"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Client Detailed Purchase History */}
      {selectedClientHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#E7E0D3] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-[#0A3735] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white text-[#0A3735] flex items-center justify-center font-bold text-base shadow-sm">
                  {selectedClientHistory.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-emerald-200 font-extrabold">
                    Détails & Historique Client
                  </div>
                  <h3 className="text-lg font-bold">{selectedClientHistory.name}</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClientHistory(null)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Client summary metrics ribbon */}
            <div className="bg-[#F7F3EC] p-4 border-b border-[#E7E0D3] grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Téléphone</div>
                <div className="font-bold text-xs text-[#004CB7] mt-0.5">
                  {selectedClientHistory.phone || 'Non renseigné'}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Total Achats</div>
                <div className="font-extrabold text-sm text-[#0F4C4A] mt-0.5">
                  {getClientMetrics(selectedClientHistory).totalPurchases} passages en caisse
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Montant Total</div>
                <div className="font-extrabold text-sm text-[#0F4C4A] mt-0.5">
                  {getClientMetrics(selectedClientHistory).totalSpent.toLocaleString('fr-FR')}{' '}
                  {settings.currency}
                </div>
              </div>
            </div>

            {/* Purchases List */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Historique des Tickets & Produits Achetés
              </div>

              {getClientSales(selectedClientHistory).length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Aucun ticket de caisse enregistré pour ce client</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Les futurs achats de ce client avec ce nom ou numéro apparaîtront ici automatiquement.
                  </p>
                </div>
              ) : (
                getClientSales(selectedClientHistory).map(sale => (
                  <div
                    key={sale.id}
                    className="p-4 rounded-2xl border border-[#E7E0D3] bg-white shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-[#F0F5FD] text-[#004CB7] px-2 py-0.5 rounded-md">
                          Ticket #{sale.id}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {sale.date} à {sale.time}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          (Caissière : {sale.caissierName || sale.caissier})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          {sale.paymentDetail || (sale.payment === 'cash' ? 'Espèces' : 'Mobile')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReceiptSaleToView(sale)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-[#0F4C4A] cursor-pointer"
                          title="Voir / Imprimer le ticket"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Products in this sale */}
                    <div className="space-y-1.5">
                      {sale.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{item.emoji || '🧼'}</span>
                            <span className="font-semibold text-slate-800">{item.name}</span>
                            <span className="text-slate-400 text-[11px]">
                              × {item.qty} ({item.price} {settings.currency})
                            </span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {(item.price * item.qty).toLocaleString('fr-FR')} {settings.currency}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Sale Total footer */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium">Total du ticket :</span>
                      <span className="font-extrabold text-[#0F4C4A] text-sm">
                        {sale.total.toLocaleString('fr-FR')} {settings.currency}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedClientHistory(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Reprint / View Modal */}
      {receiptSaleToView && (
        <ReceiptModal
          sale={receiptSaleToView}
          onClose={() => setReceiptSaleToView(null)}
        />
      )}
    </div>
  );
};
