import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSlugFromSubdomain, normalizeHost } from '@/lib/host'

/**
 * Поддомены клиентов: `{slug}.catlg.ru` → внутренний rewrite на `/${slug}` без редиректа.
 * Важно: Host должен быть сохранён на уровне прокси (nginx), иначе slug не извлечётся.
 */
export function middleware(request: NextRequest) {
  const hostname = normalizeHost(request.headers.get('host'))
  if (!hostname) return NextResponse.next()

  const slug = getSlugFromSubdomain(hostname)
  if (!slug) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/${slug}${url.pathname}`

  return NextResponse.rewrite(url)
}

export const config = {
  // Исключаем системные маршруты, чтобы не ломать ассеты и API.
  matcher: ['/((?!api|_next|favicon\\.ico|robots\\.txt|sitemap\\.xml|admin|login|signup|auth).*)'],
}
