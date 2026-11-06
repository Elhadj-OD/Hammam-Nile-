const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
// Autorise l'API Supabase configurée (prod ou stack locale `supabase start`)
const CONNECT = SB
  ? `${SB} ${SB.replace(/^http/, 'ws')} wss://*.supabase.co`
  : 'https://*.supabase.co wss://*.supabase.co'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              `connect-src 'self' ${CONNECT}`,
              "img-src 'self' data: blob: https://*.supabase.co http://127.0.0.1:* http://localhost:*",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

export default nextConfig
