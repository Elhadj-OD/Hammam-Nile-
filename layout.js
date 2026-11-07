import './globals.css'
import Toaster from '@/components/Toaster'
import PwaRegister from '@/components/PwaRegister'
import { BRAND } from '@/lib/config'

export const metadata = {
  title: {
    default: BRAND.n + ' — Commande à table',
    template: '%s · ' + BRAND.n
  },
  description: 'Menu, commande à table et encaissement du ' + BRAND.n,
  applicationName: BRAND.n,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: BRAND.n,
    statusBarStyle: 'black-translucent'
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }]
  },
  formatDetection: { telephone: false }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#002e25'
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  )
}
