import type { createServerClient } from '@/lib/supabase-server'
import { buildBusinessCatalogUrl, getRootDomain } from '@/lib/host'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

/**
 * Возвращает slug бизнеса, к которому привязан пользователь (первый найденный).
 * Нужен для корректного редиректа после входа на поддомен каталога.
 */
export async function getBusinessSlugForUser(
  supabase: ServerClient,
  userId: string
): Promise<string | null> {
  const { data: businessUsers } = await supabase
    .from('business_user')
    .select('business_id')
    .eq('user_id', userId)
    .limit(1)

  const businessId = businessUsers?.[0]?.business_id ?? null
  if (!businessId) return null

  const { data: business } = await supabase.from('business').select('slug').eq('id', businessId).single()
  return business?.slug ?? null
}

/**
 * Собирает URL для редиректа на поддомен бизнеса.
 * Если `host` не в зоне `catlg.ru`, возвращает null (в таком окружении лучше не прыгать на другой домен).
 */
export function buildBusinessRedirectUrl(options: {
  slug: string
  protocol: string
  port: string | null
  host: string
}): string | null {
  const root = getRootDomain()
  const inRootZone = options.host === root || options.host.endsWith(`.${root}`)
  if (!inRootZone) return null

  return buildBusinessCatalogUrl(options.slug, {
    protocol: options.protocol,
    port: options.port,
  })
}

