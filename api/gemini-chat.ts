import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// Assistant IA de l'admin : questions libres + extraction de produits depuis
// une photo de note manuscrite. La clé Gemini reste côté serveur (jamais
// exposée au navigateur) — configurez GEMINI_API_KEY dans les variables
// d'environnement Vercel (Production ET Preview).

interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

const PRODUCT_EXTRACTION_PROMPT = `Tu lis soit une photo, soit un texte tapé, listant des articles de boutique OU des prestations/services (menu de coiffure, tarifs hammam, liste de stock manuscrite, etc.).
Chaque ligne contient en général un nom, parfois une quantité, et souvent un prix.
Extrais CHAQUE ligne reconnaissable en un objet avec :
- "name" : le nom de l'article ou du service, nettoyé et proprement capitalisé (garde la marque/variante si présente)
- "qty" : la quantité en nombre entier si elle est indiquée sur la ligne (0 si absente — normal pour un service ou un menu de prix)
- "price" : le prix en nombre, sans unité ni symbole monétaire (0 si aucun prix n'est visible sur cette ligne)
Si une ligne propose plusieurs prix au choix (ex: "Tress 300,400,500"), prends le premier prix et garde les autres dans le nom entre parenthèses.
Ignore les lignes totalement illisibles ou qui ne sont ni un article ni un service. Ne devine jamais une catégorie.
Réponds uniquement avec la liste JSON, rien d'autre.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "L'assistant IA n'est pas encore configuré : ajoutez GEMINI_API_KEY dans les variables d'environnement Vercel, puis redéployez.",
    });
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const body = (req.body || {}) as {
    mode?: 'chat' | 'extract-products';
    message?: string;
    history?: ChatHistoryItem[];
    imageBase64?: string;
    mimeType?: string;
    text?: string;
  };

  try {
    if (body.mode === 'extract-products') {
      if (!body.imageBase64 && !body.text?.trim()) {
        res.status(400).json({ error: 'Aucune image ni texte reçu.' });
        return;
      }

      const parts = body.imageBase64
        ? [
            { inlineData: { data: body.imageBase64, mimeType: body.mimeType || 'image/jpeg' } },
            { text: PRODUCT_EXTRACTION_PROMPT },
          ]
        : [{ text: `${PRODUCT_EXTRACTION_PROMPT}\n\nTexte à analyser :\n${body.text}` }];

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                qty: { type: Type.INTEGER },
                price: { type: Type.NUMBER },
              },
              required: ['name', 'qty', 'price'],
            },
          },
        },
      });

      const raw = response.text || '[]';
      let items: Array<{ name: string; qty: number; price: number }> = [];
      try {
        items = JSON.parse(raw);
      } catch {
        res.status(502).json({ error: "L'assistant n'a pas pu lire ça clairement. Réessayez avec une photo plus nette ou un texte plus simple." });
        return;
      }

      res.status(200).json({ products: items });
      return;
    }

    // mode === 'chat' (par défaut)
    const contents = [
      ...(body.history || []).map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user' as const, parts: [{ text: body.message || '' }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction:
          "Tu es l'assistant intégré de l'application Hammam Nile : un système de caisse et de gestion de boutique/hammam à Nouakchott (Mauritanie), utilisé par la gérante ET par les caissières de chaque caisse (boutique, hammam, coiffure, épilation, gym...). Tu aides à utiliser l'application, comprendre les ventes/stocks/prix, ou répondre à des questions générales de gestion. Rappelle si besoin que l'onglet « Assistant IA » permet aussi d'ajouter des produits ou services (avec leur prix) en tapant une liste ou en envoyant la photo d'un menu/liste de prix. Réponds en français, de façon concise, chaleureuse et directement utile.",
      },
    });

    res.status(200).json({ reply: response.text || '' });
  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({ error: "Erreur lors de l'appel à l'assistant IA. Réessayez dans un instant." });
  }
}
