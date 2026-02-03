/** @type {import('next').NextConfig} */
const nextConfig = {
  // Разрешить dev-запросы с поддоменов каталога (например crusty.catlg.ru)
  allowedDevOrigins: ['crusty.catlg.ru', 'catlg.ru'],
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
