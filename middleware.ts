import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSlugFromSubdomain, normalizeHost } from '@/lib/host'

/**
 * Поддомены клиентов: `{slug}.catlg.ru` → внутренний rewrite на `/${slug}` без редиректа.
 * Важно: Host должен быть сохранён на уровне прокси (nginx), иначе slug не извлечётся.
 *
 * Почему rewrite строкой (а не URL):
 * В некоторых конфигурациях reverse proxy Next может видеть origin как `https://localhost:3000`,
 * и тогда rewrite на URL превращается во "внешний" и Next пытается проксировать на этот origin,
 * что приводит к 500/EPROTO. Относительный путь гарантирует внутренний rewrite.
 */
export function middleware(request: NextRequest) {
  const hostname = normalizeHost(request.headers.get('host'))
  if (!hostname) return NextResponse.next()

  const slug = getSlugFromSubdomain(hostname)
  if (!slug) return NextResponse.next()

  const url = request.nextUrl
  const destination = `/${slug}${url.pathname}${url.search}`
  return NextResponse.rewrite(destination)
}

export const config = {
  // Исключаем системные маршруты, чтобы не ломать ассеты и API.
  matcher: ['/((?!api|_next|favicon\\.ico|robots\\.txt|sitemap\\.xml|admin|login|signup|auth).*)'],
}
