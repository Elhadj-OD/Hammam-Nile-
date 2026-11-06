import { redirect } from 'next/navigation'
import SetupNotice from '@/components/SetupNotice'
import LoginForm from '@/components/auth/LoginForm'
import { isConfigured } from '@/lib/config'
import { getProfile } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Connexion équipe — Café Dugout' }

export default async function LoginPage() {
  if (!isConfigured()) return <SetupNotice />

  const { user, staff } = await getProfile()
  if (user && staff) redirect('/pos')

  return <LoginForm email={user?.email || ''} noRole={Boolean(user) && !staff} />
}
