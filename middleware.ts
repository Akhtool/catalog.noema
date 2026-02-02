import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSlugFromSubdomain, normalizeHost } from '@/lib/host'

const FORWARDED_PROTO_HEADER = 'x-forwarded-proto'
const HOST_HEADER = 'host'

/**
 * Достаёт порт из Host (например, `acme.catlg.ru:3000` -> `3000`).
 * Нужен для dev; в проде обычно порта в Host нет.
 */
function getPortFromHost(rawHost: string | null): string | null {
  if (!rawHost) return null
  const trimmed = rawHost.trim()
  // IPv6 host вида [::1]:3000 здесь не поддерживаем (в нашем сценарии не используется).
  const lastColon = trimmed.lastIndexOf(':')
  if (lastColon <= 0) return null
  const portCandidate = trimmed.slice(lastColon + 1)
  return /^\d+$/.test(portCandidate) ? portCandidate : null
}

/**
 * Поддомены клиентов: `{slug}.catlg.ru` → внутренний rewrite на `/${slug}` без редиректа.
 * Важно: Host должен быть сохранён на уровне прокси (nginx), иначе slug не извлечётся.
 *
 * Важно: Next.js Middleware (v15+) требует абсолютный URL для rewrite.
 * При работе за reverse-proxy `request.nextUrl` может иметь origin `http://127.0.0.1:3000`,
 * поэтому мы принудительно выставляем hostname/protocol из заголовков запроса.
 */
export function middleware(request: NextRequest) {
  const rawHost = request.headers.get(HOST_HEADER)
  const hostname = normalizeHost(rawHost)
  if (!hostname) return NextResponse.next()

  const slug = getSlugFromSubdomain(hostname)
  if (!slug) return NextResponse.next()

  const url = request.nextUrl.clone()
  const slugPrefix = `/${slug}`

  // Защита от зацикливания: после rewrite Next повторно прогоняет middleware уже на `/${slug}/*`.
  // Если мы снова добавим `/${slug}`, получится бесконечная цепочка вида `/crusty/crusty/...`.
  if (url.pathname === slugPrefix || url.pathname.startsWith(`${slugPrefix}/`)) {
    return NextResponse.next()
  }

  url.pathname = `${slugPrefix}${url.pathname}`

  // Обеспечиваем корректный origin, чтобы rewrite не указывал на localhost/127.0.0.1.
  url.hostname = hostname
  url.port = getPortFromHost(rawHost) ?? ''

  const forwardedProto = request.headers.get(FORWARDED_PROTO_HEADER)?.split(',')[0]?.trim()
  if (forwardedProto) {
    url.protocol = `${forwardedProto.replace(':', '')}:`
  }

  return NextResponse.rewrite(url)
}

export const config = {
  // Исключаем системные маршруты, чтобы не ломать ассеты и API.
  matcher: ['/((?!api|_next|favicon\\.ico|robots\\.txt|sitemap\\.xml|admin|login|signup|auth).*)'],
}
