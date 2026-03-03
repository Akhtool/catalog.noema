/**
 * Утилиты для работы с доменом/хостом и публичными ссылками каталога.
 * Делаем отдельным модулем, чтобы:
 * - не дублировать строковые константы;
 * - переиспользовать и в middleware (Edge), и в UI (client/server).
 */

const DEFAULT_ROOT_DOMAIN = 'catlg.ru'
const WWW_SUBDOMAIN = 'www'
const DEFAULT_PROTOCOL = 'https'
const PORT_SEPARATOR = ':'
const DEV_ROOT_HOSTNAMES = new Set(['localhost', '127.0.0.1'])

/** Возвращает корневой домен (на проде), который используется для поддоменов каталогов. */
export function getRootDomain(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim()
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_ROOT_DOMAIN
}

/** Нормализует значение Host: lower-case и удаляет порт (например, `acme.catlg.ru:3000`). */
export function normalizeHost(rawHost: string | null): string | null {
  if (!rawHost) return null
  const lower = rawHost.trim().toLowerCase()
  if (!lower) return null
  return lower.split(PORT_SEPARATOR)[0] ?? null
}

/** Проверяет, что hostname — это корневой домен или `www` на корневом домене. */
export function isRootDomainHost(hostname: string): boolean {
  const root = getRootDomain()
  // В dev считаем localhost/127.0.0.1 "корневым доменом", чтобы можно было проверять анти-дубли без реального catlg.ru.
  if (process.env.NODE_ENV !== 'production' && DEV_ROOT_HOSTNAMES.has(hostname)) return true

  return hostname === root || hostname === `${WWW_SUBDOMAIN}.${root}`
}

/**
 * Извлекает slug из поддомена: `muscool.catlg.ru` -> `muscool`.
 * Возвращает null, если это не клиентский поддомен или формат не поддерживается.
 */
export function getSlugFromSubdomain(hostname: string): string | null {
  const root = getRootDomain()
  const suffix = `.${root}`

  if (!hostname.endsWith(suffix)) return null
  if (hostname === root || hostname === `${WWW_SUBDOMAIN}.${root}`) return null

  const withoutRoot = hostname.slice(0, -suffix.length)
  // Берём только первую часть до точки: `a.b.catlg.ru` -> `a`
  const slug = withoutRoot.split('.')[0]?.trim()
  return slug ? slug : null
}

/**
 * Собирает публичный URL каталога по slug: `https://{slug}.catlg.ru`.
 * В dev можно передать `protocol/port`, чтобы получить, например, `http://crusty.catlg.ru:3000`.
 */
export function buildBusinessCatalogUrl(
  slug: string,
  options?: {
    protocol?: string | null
    port?: string | number | null
  }
): string {
  const root = getRootDomain()
  const safeSlug = slug.trim()

  const protocolRaw = options?.protocol?.trim()
  const protocol = (protocolRaw && protocolRaw.length > 0 ? protocolRaw : DEFAULT_PROTOCOL).replace(':', '')

  const portRaw = options?.port
  const portValue = typeof portRaw === 'number' ? String(portRaw) : portRaw?.trim()
  const port = portValue && portValue.length > 0 ? `:${portValue}` : ''

  return `${protocol}://${safeSlug}.${root}${port}`
}
