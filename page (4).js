import DiagClient from './DiagClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Diagnostic', robots: { index: false, follow: false } }

// Côté serveur : on indique seulement si chaque variable EXISTE (jamais sa valeur).
export default function DiagnosticPage() {
  const server = {
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    TABLE_TOKEN_SECRET: Boolean(process.env.TABLE_TOKEN_SECRET),
    NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL)
  }
  return <DiagClient server={server} />
}
