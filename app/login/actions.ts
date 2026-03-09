'use server'

import { createServerClient } from '@/lib/supabase-server'
import { cookies, headers } from 'next/headers'
import { getBusinessSlugForUser, resolveRedirectAfterLogin } from '@/lib/auth-redirect'
import { clearServerSessionCookies, writeServerSessionCookies } from '@/lib/auth-cookies'
import { normalizeHost } from '@/lib/host'

/**
 * Устанавливает сессию на сервере через токены
 */
export async function setServerSession(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()
  const host = (await headers()).get('host')

  writeServerSessionCookies(
    cookieStore,
    {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
    host
  )

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

const ANONYMOUS_REDIRECT = '/'

/**
 * Возвращает URL для редиректа после входа.
 * Каталог доступен на поддомене: после входа возвращаемся на `/` текущего host.
 */
export async function getRedirectAfterLogin(): Promise<string> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return ANONYMOUS_REDIRECT

  const slug = await getBusinessSlugForUser(supabase, user.id)

  const hostRaw = (await headers()).get('host')
  const host = normalizeHost(hostRaw) ?? ''

  // В dev/prod достаточно: http+3000 в dev, https без порта в prod.
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const port = process.env.NODE_ENV === 'production' ? null : '3000'

  return resolveRedirectAfterLogin({
    slug,
    protocol,
    port,
    host,
  })
}

/**
 * Выход из системы
 * Очищает cookies и сессию Supabase
 */
export async function logout() {
  const cookieStore = await cookies()
  const host = (await headers()).get('host')

  clearServerSessionCookies(cookieStore, host)
  
  // Очищаем сессию Supabase на сервере
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  
  return { success: true }
}
