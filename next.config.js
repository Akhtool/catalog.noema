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
    'crusty.catlg.ru',
    'noema-coffee.catlg.ru',
    'catlg.ru',
    'http://localhost:3000',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // Лимит соответствует лимиту Supabase Storage bucket
    },
  },
}

module.exports = nextConfig
