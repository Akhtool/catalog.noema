'use server'

import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

/**
 * Устанавливает сессию на сервере через токены
 */
export async function setServerSession(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()
  
  // Устанавливаем cookies для сессии
  cookieStore.set('sb-access-token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 дней
  })
  
  cookieStore.set('sb-refresh-token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
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

const FALLBACK_REDIRECT = '/admin'

/**
 * Возвращает URL для редиректа после входа: страница бизнеса пользователя или /admin.
 */
export async function getRedirectAfterLogin(): Promise<string> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return FALLBACK_REDIRECT

  const { data: businessUsers } = await supabase
    .from('business_user')
    .select('business_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!businessUsers?.length) return FALLBACK_REDIRECT

  const { data: business } = await supabase
    .from('business')
    .select('slug')
    .eq('id', businessUsers[0].business_id)
    .single()

  return business?.slug ? `/${business.slug}` : FALLBACK_REDIRECT
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
