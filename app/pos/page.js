import { redirect } from 'next/navigation'
import Link from 'next/link'
import SetupNotice from '@/components/SetupNotice'
import PosApp from '@/components/pos/PosApp'
import PosProvider from '@/components/pos/PosProvider'
import { isConfigured } from '@/lib/config'
import { getProfile } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Espace équipe — Café Dugout' }

export default async function PosPage() {
  if (!isConfigured()) return <SetupNotice />

  const { user, staff } = await getProfile()
  if (!user) redirect('/login')

  if (!staff) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center p-5">
        <div className="card p-6">
          <h1 className="serif text-xl font-bold">Compte sans rôle actif</h1>
          <p className="mut mt-2 text-sm">
            Le compte <b className="gt">{user.email}</b> existe, mais aucune ligne
            <code className="gt"> public.staff </code>ne lui donne de rôle. Demande à l’admin :
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl p-3 text-xs" style={{ background: 'rgba(20,5,9,.6)' }}>
{`select public.promote_staff('${user.email}', 'serveur', 'Prénom');`}
          </pre>
          <Link className="btn mt-4 w-full" href="/login">
            Changer de compte
          </Link>
        </div>
      </main>
    )
  }

  return (
    <PosProvider staff={staff}>
      <PosApp />
    </PosProvider>
  )
}
