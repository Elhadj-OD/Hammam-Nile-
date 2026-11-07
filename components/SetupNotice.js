import { BRAND } from '@/lib/config'

export default function SetupNotice({ title = 'Supabase n’est pas encore configuré' }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 p-5">
      <div className="card p-6">
        <img src="/brand/entete.jpg" alt="Café DUGOUT — Le café des passionnés" width={1080} height={626} className="mb-5 h-auto w-full rounded-xl" />
        <div className="serif gt text-2xl font-bold">{BRAND.n}</div>
        <h1 className="serif mt-2 text-xl font-bold">{title}</h1>
        <p className="mut mt-2 text-sm">
          Crée un fichier <code className="gt">.env.local</code> à la racine du projet avec les deux
          variables ci-dessous (Supabase → Project Settings → API), puis redémarre le serveur.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl p-3 text-xs" style={{ background: 'rgba(20,5,9,.6)' }}>
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx (ou ancienne clé anon eyJ...)`}
        </pre>
        <ul className="mut mt-4 list-disc space-y-1 pl-5 text-sm">
          <li>La clé <b className="gt">anon</b> est publique, c’est normal : la sécurité vient de la RLS.</li>
          <li>Ne jamais mettre la clé <b>service_role</b> dans le projet Next.js.</li>
          <li>
            Sur Vercel : Settings → Environment Variables, mêmes deux noms, puis Redeploy.
          </li>
        </ul>
      </div>
    </main>
  )
}
