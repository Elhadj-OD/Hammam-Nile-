'use client'

import { useEffect, useState } from 'react'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isConfigured } from '@/lib/config'
import { supabaseBrowser } from '@/lib/supabase/browser'

const hint = (status, msg = '') => {
  const m = String(msg)
  if (status === 401 || status === 403 || /api key|jwt/i.test(m)) return 'Clé refusée : NEXT_PUBLIC_SUPABASE_ANON_KEY est fausse (prendre la clé « publishable » ou « anon » du MÊME projet).'
  if (status === 404 || /PGRST20[245]|could not find|does not exist/i.test(m)) return 'La vue ou table n’existe pas : le SQL n’a pas été exécuté dans CE projet Supabase (1_schema.sql, puis 2_seed.sql).'
  if (/failed to fetch|network|TypeError/i.test(m)) return 'Adresse injoignable : vérifier NEXT_PUBLIC_SUPABASE_URL (https://xxxx.supabase.co, sans « / » final).'
  return m || 'Erreur inconnue'
}

export default function DiagClient({ server }) {
  const [rows, setRows] = useState([])

  useEffect(() => {
    ;(async () => {
      const out = []
      const add = (ok, label, detail) => out.push({ ok, label, detail })
      let host = '—'
      try {
        host = new URL(SUPABASE_URL).host
      } catch {}
      const keyType = SUPABASE_ANON_KEY.startsWith('sb_publishable_')
        ? 'publishable'
        : SUPABASE_ANON_KEY.startsWith('sb_secret_')
          ? 'SECRÈTE (à ne pas mettre ici !)'
          : SUPABASE_ANON_KEY.startsWith('eyJ')
            ? 'ancienne clé JWT (anon ou service_role ?)'
            : 'format inconnu'

      add(isConfigured(), 'Configuration lue par le site', `adresse : ${host} · type de clé : ${keyType} · longueur : ${SUPABASE_ANON_KEY.length}`)
      if (SUPABASE_ANON_KEY.startsWith('sb_secret_')) add(false, 'Clé publique', 'Vous avez collé la clé SECRÈTE dans NEXT_PUBLIC_… : changez-la tout de suite et régénérez-la dans Supabase.')

      if (isConfigured()) {
        // Test 1 : requête brute (sans bibliothèque)
        try {
          const r = await fetch(`${SUPABASE_URL}/rest/v1/v_tables_public?select=code,label`, { headers: { apikey: SUPABASE_ANON_KEY } })
          const j = await r.json().catch(() => null)
          if (r.ok) add(Array.isArray(j) && j.length > 0, 'Tables (requête directe)', Array.isArray(j) && j.length ? `${j.length} tables trouvées` : 'Réponse vide : lancer 2_seed.sql')
          else add(false, 'Tables (requête directe)', `HTTP ${r.status} — ${hint(r.status, j?.message)}`)
        } catch (e) {
          add(false, 'Tables (requête directe)', hint(0, e.message))
        }

        // Test 2 : même requête via la bibliothèque utilisée par l’app
        const sb = supabaseBrowser()
        const t = await sb.from('v_tables_public').select('code,label')
        add(!t.error && (t.data || []).length > 0, 'Tables (via l’application)', t.error ? hint(t.status, t.error.message) : `${(t.data || []).length} tables`)
        const m = await sb.from('menu_items').select('id')
        add(!m.error && (m.data || []).length > 0, 'Menu', m.error ? hint(m.status, m.error.message) : `${(m.data || []).length} produits`)
        const c = await sb.from('categories').select('slug')
        add(!c.error && (c.data || []).length > 0, 'Catégories', c.error ? hint(c.status, c.error.message) : `${(c.data || []).length} catégories`)
      }

      add(server.SUPABASE_SERVICE_ROLE_KEY, 'Variable SUPABASE_SERVICE_ROLE_KEY (serveur)', server.SUPABASE_SERVICE_ROLE_KEY ? 'présente' : 'MANQUANTE dans Vercel')
      add(server.TABLE_TOKEN_SECRET, 'Variable TABLE_TOKEN_SECRET (serveur)', server.TABLE_TOKEN_SECRET ? 'présente' : 'MANQUANTE dans Vercel')
      add(server.NEXT_PUBLIC_SITE_URL, 'Variable NEXT_PUBLIC_SITE_URL', server.NEXT_PUBLIC_SITE_URL ? 'présente' : 'manquante (conseillée)')
      setRows(out)
    })()
  }, [server])

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Diagnostic Café DUGOUT</h1>
      <p style={{ opacity: 0.7, fontSize: 14 }}>Aucune clé n’est affichée. Supprimez la page app/diagnostic une fois le site réparé.</p>
      {!rows.length && <p>Analyse en cours…</p>}
      {rows.map((r, i) => (
        <div key={i} style={{ margin: '12px 0', padding: 12, borderRadius: 12, border: `1px solid ${r.ok ? '#2dffa8' : '#ff6b6b'}`, background: 'rgba(0,0,0,.35)' }}>
          <div style={{ fontWeight: 700 }}>
            {r.ok ? '✅' : '❌'} {r.label}
          </div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>{r.detail}</div>
        </div>
      ))}
    </main>
  )
}
