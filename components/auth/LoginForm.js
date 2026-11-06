'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/Icon'
import { BRAND } from '@/lib/config'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { toast } from '@/lib/toast'

export default function LoginForm({ email: initial = '', noRole = false }) {
  const router = useRouter()
  const sb = supabaseBrowser()
  const [email, setEmail] = useState(initial)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async e => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) return setError('Email et mot de passe requis.')
    setBusy(true)
    const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (err) {
      setError(
        /invalid login/i.test(err.message)
          ? 'Email ou mot de passe incorrect (ou compte non confirmé).'
          : err.message
      )
      return
    }
    toast('Connexion réussie')
    router.replace('/pos')
    router.refresh()
  }

  const logout = async () => {
    await sb.auth.signOut()
    router.refresh()
    router.replace('/login')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-5">
      <div className="card p-6">
        <section className="brand-banner" aria-label="Café DUGOUT — Le café des passionnés">
          <img src="/brand/entete.jpg" alt="Café DUGOUT — Le café des passionnés" width={1080} height={626} fetchPriority="high" />
        </section>

        <div className="mb-4 flex items-center gap-3">
          <span
            className="gt flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ border: '1px solid var(--gold)', background: 'rgba(217,180,63,.08)' }}
          >
            <img src="/brand/logo.jpg" alt="Logo Café DUGOUT" width={44} height={44} className="h-11 w-11 rounded-xl object-contain" />
          </span>
          <div>
            <div className="serif text-xl font-bold leading-tight">{BRAND.n}</div>
            <div className="mut text-xs">Espace équipe — gérant, admin, serveurs, cuisine</div>
          </div>
        </div>

        {noRole ? (
          <>
            <p className="text-sm">
              Vous êtes connecté en tant que <b className="gt">{initial}</b>, mais ce compte n’a pas
              encore de rôle. Demandez à l’administrateur de lancer, dans le SQL Editor de Supabase :
            </p>
            <pre className="mt-2 overflow-x-auto rounded-xl p-3 text-xs" style={{ background: 'rgba(20,5,9,.6)' }}>
{`select public.promote_staff('${initial}', 'gerant', 'Prénom');`}
            </pre>
            <button className="btn mt-4 w-full" onClick={logout}>
              Se déconnecter
            </button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-2">
            <label className="mut text-xs" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="inp"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <label className="mut text-xs" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="inp"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && (
              <p className="text-sm" style={{ color: '#ff9a9a' }} role="alert">
                {error}
              </p>
            )}
            <button className="btn gold w-full" type="submit" disabled={busy}>
              {busy ? 'Connexion…' : 'Entrer'}
            </button>
          </form>
        )}

        <p className="mut mt-4 text-xs leading-snug">
          Le rôle (admin / gérant / serveur / cuisine) est décidé par la base de données, jamais par
          cette page. Aucun code d’accès n’est stocké dans le navigateur.
        </p>
        <Link href="/" className="btn mt-3 w-full">
          <Icon name="back" size={14} /> Retour au menu client
        </Link>
      </div>
    </main>
  )
}
