import ClientMenu from '@/components/client/ClientMenu'
import SetupNotice from '@/components/SetupNotice'
import { isConfigured } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default function Page({ searchParams }) {
  if (!isConfigured()) return <SetupNotice />
  const t = String(searchParams?.t || '').toUpperCase().slice(0, 8)
  const k = String(searchParams?.k || '').slice(0, 64)
  const s = String(searchParams?.s || '').slice(0, 200)
  return <ClientMenu t={t} k={k} s={s} />
}
