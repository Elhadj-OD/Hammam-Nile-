import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCategory } from '../types';
import {
  Sparkles,
  Send,
  Camera,
  MessageCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Trash2,
  PackagePlus,
  PackageMinus,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface ExtractedRow {
  name: string;
  qty: number;
  category: ProductCategory;
  price: string;
  minQty: string;
  include: boolean;
}

interface RemoveRow {
  extractedName: string;
  matchedProductId: number | null;
  qtyToRemove: number;
  deleteEntirely: boolean;
  include: boolean;
}

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: 'savons', label: 'Savons & Gommages' },
  { value: 'huiles', label: 'Huiles & Parfums' },
  { value: 'accessoires', label: 'Accessoires & Foutas' },
  { value: 'linge', label: 'Linge & Bains' },
  { value: 'femmes', label: 'Boutique Femme' },
  { value: 'hommes', label: 'Boutique Homme' },
  { value: 'hammam_bains', label: 'Hammam & Bains' },
  { value: 'spa_massage', label: 'Esthétique' },
  { value: 'coiffure_salon', label: 'Coiffure & Salon' },
  { value: 'epilation_traditionnelle', label: 'Épilation Traditionnelle' },
  { value: 'fitness_gym', label: 'Fitness Gym' },
  { value: 'autres', label: 'Autres / Coffrets' },
];

const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(',');
      resolve({ data: base64, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const AssistantView: React.FC = () => {
  const { products, addProduct, deleteProduct, addMovement } = useApp();

  const [mode, setMode] = useState<'chat' | 'photo'>('chat');
  const [photoMode, setPhotoMode] = useState<'add' | 'remove'>('add');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Bonjour ! Posez-moi une question, ou passez sur « Ajouter par photo » pour que je lise une note manuscrite et prépare les articles à ajouter ou à retirer du stock.' },
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Photo extraction state
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [removeRows, setRemoveRows] = useState<RemoveRow[]>([]);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [removedCount, setRemovedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Devine le produit existant correspondant à un nom lu sur la photo
  // (correspondance approximative, insensible à la casse).
  const findBestMatch = (name: string): number | null => {
    const q = name.trim().toLowerCase();
    if (!q) return null;
    const exact = products.find(p => p.name.toLowerCase() === q);
    if (exact) return exact.id;
    const partial = products.find(p => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
    return partial ? partial.id : null;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || chatLoading) return;

    setChatError('');
    const nextMessages = [...messages, { role: 'user' as const, text }];
    setMessages(nextMessages);
    setInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          message: text,
          history: nextMessages.slice(0, -1),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue.');
      setMessages(prev => [...prev, { role: 'model', text: data.reply || '(Réponse vide)' }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Impossible de contacter l'assistant.");
    } finally {
      setChatLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setExtractError('Fichier invalide : veuillez sélectionner une image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setExtractError('Photo trop lourde (max 8 Mo).');
      return;
    }
    setImageFile(file);
    setExtractError('');
    setRows([]);
    setRemoveRows([]);
    setAddedCount(null);
    setRemovedCount(null);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setExtracting(true);
    setExtractError('');
    setRows([]);
    setRemoveRows([]);
    setAddedCount(null);
    setRemovedCount(null);
    try {
      const { data, mimeType } = await fileToBase64(imageFile);
      const res = await fetch('/api/gemini-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'extract-products', imageBase64: data, mimeType }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur inconnue.');

      const extractedList: { name: string; qty: number }[] = result.products || [];

      if (extractedList.length === 0) {
        setExtractError("Aucun article reconnu sur cette photo. Essayez une photo plus nette, bien cadrée sur le texte.");
        return;
      }

      if (photoMode === 'add') {
        setRows(
          extractedList.map(p => ({
            name: p.name,
            qty: Number.isFinite(p.qty) ? p.qty : 0,
            category: 'autres',
            price: '0',
            minQty: '5',
            include: true,
          }))
        );
      } else {
        setRemoveRows(
          extractedList.map(p => ({
            extractedName: p.name,
            matchedProductId: findBestMatch(p.name),
            qtyToRemove: Number.isFinite(p.qty) && p.qty > 0 ? p.qty : 1,
            deleteEntirely: false,
            include: true,
          }))
        );
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Impossible d'analyser cette photo.");
    } finally {
      setExtracting(false);
    }
  };

  const updateRow = (index: number, updates: Partial<ExtractedRow>) => {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmAdd = () => {
    const toAdd = rows.filter(r => r.include && r.name.trim());
    toAdd.forEach(r => {
      addProduct({
        name: r.name.trim(),
        category: r.category,
        price: Math.max(0, parseFloat(r.price) || 0),
        qty: Math.max(0, r.qty || 0),
        minQty: Math.max(1, parseInt(r.minQty) || 5),
        emoji: '🧴',
      });
    });
    setAddedCount(toAdd.length);
    setRows([]);
    setImagePreview('');
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateRemoveRow = (index: number, updates: Partial<RemoveRow>) => {
    setRemoveRows(prev => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const removeRemoveRow = (index: number) => {
    setRemoveRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmRemove = () => {
    const toProcess = removeRows.filter(r => r.include && r.matchedProductId !== null);
    toProcess.forEach(r => {
      if (r.deleteEntirely) {
        deleteProduct(r.matchedProductId as number);
      } else {
        addMovement({
          productId: r.matchedProductId as number,
          type: 'out',
          qty: Math.max(1, r.qtyToRemove || 1),
          reason: 'Retrait via Assistant IA (photo/liste)',
        });
      }
    });
    setRemovedCount(toProcess.length);
    setRemoveRows([]);
    setImagePreview('');
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetPhoto = () => {
    setImagePreview('');
    setImageFile(null);
    setRows([]);
    setRemoveRows([]);
    setExtractError('');
    setAddedCount(null);
    setRemovedCount(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E0D3] shadow-xs">
        <div className="flex items-center gap-2 text-[#0F4C4A] text-xs font-bold uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4 text-[#B8874B]" />
          <span>Assistant IA</span>
        </div>
        <h1 className="text-2xl font-bold font-display text-[#1C2321]">
          Assistant Hammam Nile
        </h1>
        <p className="text-sm text-[#6B7873] mt-1">
          Posez une question, ou envoyez la photo d'une note manuscrite/liste pour ajouter ou retirer automatiquement des articles du stock.
        </p>

        {/* Mode Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => setMode('chat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              mode === 'chat'
                ? 'bg-[#0F4C4A] text-white shadow-xs'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Discuter
          </button>
          <button
            type="button"
            onClick={() => setMode('photo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              mode === 'photo'
                ? 'bg-[#0F4C4A] text-white shadow-xs'
                : 'bg-[#F7F3EC] text-[#6B7873] hover:text-[#1C2321]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Gérer le stock par photo
          </button>
        </div>

        {mode === 'photo' && (
          <div className="flex gap-2 mt-2.5">
            <button
              type="button"
              onClick={() => {
                setPhotoMode('add');
                resetPhoto();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                photoMode === 'add'
                  ? 'bg-[#0F4C4A] text-white border-[#0F4C4A]'
                  : 'bg-[#F7F3EC] text-[#1C2321] border-[#E7E0D3] hover:bg-[#E4E9E1]'
              }`}
            >
              <PackagePlus className="w-3 h-3" />
              Ajouter des articles
            </button>
            <button
              type="button"
              onClick={() => {
                setPhotoMode('remove');
                resetPhoto();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                photoMode === 'remove'
                  ? 'bg-[#0F4C4A] text-white border-[#0F4C4A]'
                  : 'bg-[#F7F3EC] text-[#1C2321] border-[#E7E0D3] hover:bg-[#E4E9E1]'
              }`}
            >
              <PackageMinus className="w-3 h-3" />
              Retirer des articles
            </button>
          </div>
        )}
      </div>

      {/* ── CHAT MODE ── */}
      {mode === 'chat' && (
        <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xs flex flex-col h-[560px]">
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#0F4C4A] text-white rounded-br-sm'
                      : 'bg-[#F7F3EC] text-[#1C2321] rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[#F7F3EC] text-[#6B7873] px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2 text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  En train de réfléchir…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {chatError && (
            <div className="mx-5 mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{chatError}</span>
            </div>
          )}

          <form onSubmit={handleSend} className="border-t border-[#E7E0D3] p-3 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Écrivez votre question…"
              className="flex-1 text-sm p-2.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-xl text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={chatLoading || !input.trim()}
              className="p-2.5 bg-[#0F4C4A] hover:bg-[#0A3735] disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── PHOTO MODE ── */}
      {mode === 'photo' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xs p-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
              id="assistant-photo-input"
            />

            {!imagePreview ? (
              <label
                htmlFor="assistant-photo-input"
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#E7E0D3] rounded-2xl py-12 cursor-pointer hover:bg-[#F7F3EC]/60 transition"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#E4E9E1] text-[#0F4C4A] flex items-center justify-center">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="font-bold text-sm text-[#1C2321]">Prendre ou choisir une photo</p>
                <p className="text-xs text-[#6B7873]">
                  {photoMode === 'add'
                    ? 'Photo de la note manuscrite des articles à ajouter'
                    : 'Photo de la liste des articles à retirer du stock'}
                </p>
              </label>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <img
                    src={imagePreview}
                    alt="Note à analyser"
                    className="w-32 h-32 object-cover rounded-xl border border-[#E7E0D3] shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-[#6B7873]">
                      Photo prête. Cliquez sur « Analyser » pour que l'assistant lise les articles et leurs quantités.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAnalyze}
                        disabled={extracting}
                        className="px-4 py-2 bg-[#0F4C4A] hover:bg-[#0A3735] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                      >
                        {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {extracting ? 'Analyse en cours…' : 'Analyser la photo'}
                      </button>
                      <button
                        type="button"
                        onClick={resetPhoto}
                        className="px-3 py-2 bg-[#F7F3EC] hover:bg-[#E7E0D3] text-[#1C2321] rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Changer de photo
                      </button>
                    </div>
                  </div>
                </div>

                {extractError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{extractError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {addedCount !== null && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {addedCount} article{addedCount > 1 ? 's ajoutés' : ' ajouté'} à la boutique. Complétez les prix dans l'écran Produits.
            </div>
          )}

          {rows.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#E7E0D3] bg-[#F7F3EC]/50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#1C2321] uppercase tracking-wider">
                  {rows.length} article{rows.length > 1 ? 's' : ''} reconnu{rows.length > 1 ? 's' : ''} — vérifiez avant d'ajouter
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F7F3EC]/80 border-b border-[#E7E0D3] text-[#6B7873] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3">Nom de l'article</th>
                      <th className="py-2.5 px-3 w-24">Qté</th>
                      <th className="py-2.5 px-3 w-52">Catégorie</th>
                      <th className="py-2.5 px-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D3]">
                    {rows.map((row, i) => (
                      <tr key={i} className={row.include ? '' : 'opacity-40'}>
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={row.include}
                            onChange={e => updateRow(i, { include: e.target.checked })}
                            className="w-4 h-4 accent-[#0F4C4A] cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.name}
                            onChange={e => updateRow(i, { name: e.target.value })}
                            className="w-full text-xs p-1.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-lg text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={row.qty}
                            onChange={e => updateRow(i, { qty: parseInt(e.target.value) || 0 })}
                            className="w-full text-xs p-1.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-lg text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.category}
                            onChange={e => updateRow(i, { category: e.target.value as ProductCategory })}
                            className="w-full text-xs p-1.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-lg text-[#1C2321] focus:outline-none focus:border-[#0F4C4A]"
                          >
                            {CATEGORY_OPTIONS.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="p-1 text-[#6B7873] hover:text-rose-600 cursor-pointer"
                            title="Retirer cette ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-[#E7E0D3] bg-[#F7F3EC]/40 flex items-center justify-between">
                <p className="text-[11px] text-[#6B7873]">
                  Prix mis à 0 par défaut — à compléter ensuite dans l'écran Produits.
                </p>
                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  disabled={!rows.some(r => r.include && r.name.trim())}
                  className="px-4 py-2.5 bg-[#0F4C4A] hover:bg-[#0A3735] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Ajouter à la boutique
                </button>
              </div>
            </div>
          )}

          {removedCount !== null && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {removedCount} article{removedCount > 1 ? 's traités' : ' traité'} — stock mis à jour.
            </div>
          )}

          {removeRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E7E0D3] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#E7E0D3] bg-[#F7F3EC]/50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#1C2321] uppercase tracking-wider">
                  {removeRows.length} article{removeRows.length > 1 ? 's' : ''} reconnu{removeRows.length > 1 ? 's' : ''} — vérifiez la correspondance avant de retirer
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F7F3EC]/80 border-b border-[#E7E0D3] text-[#6B7873] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3">Lu sur la photo</th>
                      <th className="py-2.5 px-3">Produit correspondant</th>
                      <th className="py-2.5 px-3 w-28">Qté à retirer</th>
                      <th className="py-2.5 px-3 w-32">Supprimer tout</th>
                      <th className="py-2.5 px-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D3]">
                    {removeRows.map((row, i) => {
                      const matched = products.find(p => p.id === row.matchedProductId);
                      return (
                        <tr key={i} className={row.include ? '' : 'opacity-40'}>
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={row.include}
                              onChange={e => updateRemoveRow(i, { include: e.target.checked })}
                              className="w-4 h-4 accent-[#0F4C4A] cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 text-[#6B7873]">{row.extractedName}</td>
                          <td className="py-2 px-3">
                            <select
                              value={row.matchedProductId ?? ''}
                              onChange={e =>
                                updateRemoveRow(i, {
                                  matchedProductId: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              className={`w-full text-xs p-1.5 border rounded-lg focus:outline-none focus:border-[#0F4C4A] ${
                                matched ? 'bg-[#F7F3EC] border-[#E7E0D3] text-[#1C2321]' : 'bg-rose-50 border-rose-200 text-rose-700'
                              }`}
                            >
                              <option value="">— Aucune correspondance —</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (stock : {p.qty})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="1"
                              value={row.qtyToRemove}
                              disabled={row.deleteEntirely}
                              onChange={e => updateRemoveRow(i, { qtyToRemove: parseInt(e.target.value) || 1 })}
                              className="w-full text-xs p-1.5 bg-[#F7F3EC] border border-[#E7E0D3] rounded-lg text-[#1C2321] focus:outline-none focus:border-[#0F4C4A] disabled:opacity-40"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={row.deleteEntirely}
                              onChange={e => updateRemoveRow(i, { deleteEntirely: e.target.checked })}
                              className="w-4 h-4 accent-rose-600 cursor-pointer"
                              title="Supprimer entièrement ce produit du catalogue"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeRemoveRow(i)}
                              className="p-1 text-[#6B7873] hover:text-rose-600 cursor-pointer"
                              title="Retirer cette ligne"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-[#E7E0D3] bg-[#F7F3EC]/40 flex items-center justify-between">
                <p className="text-[11px] text-[#6B7873]">
                  Vérifiez bien le produit correspondant avant de confirmer — l'action est immédiate.
                </p>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  disabled={!removeRows.some(r => r.include && r.matchedProductId !== null)}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <PackageMinus className="w-4 h-4" />
                  Retirer du stock
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
