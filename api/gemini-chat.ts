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

const PRODUCT_EXTRACTION_PROMPT = `Tu lis une photo d'une note manuscrite listant des articles de boutique (hammam, cosmétiques, accessoires...).
Chaque ligne contient en général une quantité puis le nom de l'article, parfois avec une marque ou une variante entre parenthèses.
Extrais CHAQUE ligne lisible en un objet avec :
- "name" : le nom de l'article, nettoyé et proprement capitalisé (garde la marque/variante si présente)
- "qty" : la quantité en nombre entier (0 si aucune quantité n'est écrite)
Ignore les lignes totalement illisibles. Ne remplis JAMAIS un prix ou une catégorie : ces champs seront complétés par la gérante ensuite.
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
  };

  try {
    if (body.mode === 'extract-products') {
      if (!body.imageBase64) {
        res.status(400).json({ error: 'Aucune image reçue.' });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: body.imageBase64, mimeType: body.mimeType || 'image/jpeg' } },
              { text: PRODUCT_EXTRACTION_PROMPT },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                qty: { type: Type.INTEGER },
              },
              required: ['name', 'qty'],
            },
          },
        },
      });

      const raw = response.text || '[]';
      let items: Array<{ name: string; qty: number }> = [];
      try {
        items = JSON.parse(raw);
      } catch {
        res.status(502).json({ error: "L'assistant n'a pas pu lire cette note clairement. Réessayez avec une photo plus nette." });
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
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction:
          "Tu es l'assistant intégré de l'application Hammam Nile : un système de caisse et de gestion de boutique/hammam à Nouakchott (Mauritanie). Tu aides la gérante à utiliser l'application, comprendre ses ventes/stocks, ou répondre à des questions générales de gestion de sa boutique. Réponds en français, de façon concise, chaleureuse et directement utile.",
      },
    });

    res.status(200).json({ reply: response.text || '' });
  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({ error: "Erreur lors de l'appel à l'assistant IA. Réessayez dans un instant." });
  }
}
