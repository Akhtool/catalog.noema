const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Важно для Windows/монореп/OneDrive: у Next могут находиться несколько lockfile выше,
   * из-за чего он неверно определяет workspace root.
   * Явно фиксируем корень трассировки на директорию проекта, чтобы убрать warning.
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats
   */
  outputFileTracingRoot: __dirname,
  // Разрешить dev-запросы с поддоменов каталога (добавляйте сюда новые slug при разработке)
  allowedDevOrigins: [
    'http://crusty.lvh.me:3000',
    'https://crusty.lvh.me:3000',
    'http://arkan.lvh.me:3000',
    'https://arkan.lvh.me:3000',
    'crusty.lvh.me',
    'arkan.lvh.me',
    'crusty.catlg.ru',
    'noema-coffee.catlg.ru',
    'catlg.ru',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    minimumCacheTTL: 86400, // 24 часа — реже повторные запросы к Supabase
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // Лимит соответствует лимиту Supabase Storage bucket
    },
    imgOptTimeoutInSeconds: 60, // Таймаут загрузки удалённых изображений (дефолт ~7 с)
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'
    const baseHeaders = [
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://*.supabase.co",
          "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
          "connect-src 'self' https://*.supabase.co",
          "frame-ancestors 'self'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    ]
    // COOP и HSTS только в prod: на HTTP lvh.me браузер игнорирует COOP как "untrustworthy"
    if (!isDev) {
      baseHeaders.push(
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        }
      )
    }
    return [{ source: '/(.*)', headers: baseHeaders }]
  },
}

module.exports = withBundleAnalyzer(nextConfig)
