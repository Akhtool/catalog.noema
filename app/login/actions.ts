'use server'

import { createServerClient } from '@/lib/supabase-server'
import { cookies, headers } from 'next/headers'
import { buildBusinessRedirectUrl, getBusinessSlugForUser } from '@/lib/auth-redirect'
import { getRootDomain, normalizeHost } from '@/lib/host'

/**
 * Устанавливает сессию на сервере через токены
 */
export async function setServerSession(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()
  const host = normalizeHost((await headers()).get('host'))
  const root = getRootDomain()
  const cookieDomain = host && (host === root || host.endsWith(`.${root}`)) ? `.${root}` : undefined
  
  // Устанавливаем cookies для сессии
  cookieStore.set('sb-access-token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    domain: cookieDomain,
    maxAge: 60 * 60 * 24 * 7, // 7 дней
  })
  
  cookieStore.set('sb-refresh-token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    domain: cookieDomain,
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  })
  
  return { success: true }
}

/**
 * Проверяет авторизацию и создаёт профиль при необходимости
 */
export async function ensureProfileAfterAuth() {
  const supabase = await createServerClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Не авторизован' }
  }

  // Создаём профиль, если его нет
  const { error } = await supabase
    .from('profile')
    .upsert({
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || null,
    }, {
      onConflict: 'id',
    })

  if (error) {
    console.error('Ошибка создания профиля:', error)
    return { error: 'Ошибка создания профиля' }
  }

  return { success: true }
}

const FALLBACK_REDIRECT = '/'

/**
 * Возвращает URL для редиректа после входа.
 * Каталог доступен на поддомене: после входа возвращаемся на `/` текущего host.
 */
export async function getRedirectAfterLogin(): Promise<string> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return FALLBACK_REDIRECT

  const slug = await getBusinessSlugForUser(supabase, user.id)
  if (!slug) return FALLBACK_REDIRECT

  const hostRaw = (await headers()).get('host')
  const host = normalizeHost(hostRaw) ?? ''

  // В dev/prod достаточно: http+3000 в dev, https без порта в prod.
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const port = process.env.NODE_ENV === 'production' ? null : '3000'

  return (
    buildBusinessRedirectUrl({
      slug,
      protocol,
      port,
      host,
    }) ?? FALLBACK_REDIRECT
  )
}

/**
 * Выход из системы
 * Очищает cookies и сессию Supabase
 */
export async function logout() {
  const cookieStore = await cookies()
  
  // Очищаем cookies сессии
  cookieStore.delete('sb-access-token')
  cookieStore.delete('sb-refresh-token')
  
  // Очищаем сессию Supabase на сервере
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  
  return { success: true }
}
