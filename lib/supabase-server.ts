import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Создаёт server-side Supabase клиент для проверки авторизации
 * Используется в Server Components и Server Actions
 */
export async function createServerClient() {
  const cookieStore = await cookies()
  
  // Получаем все cookies
  const allCookies = cookieStore.getAll()
  
  // Ищем Supabase auth token в cookies
  let accessToken: string | undefined
  let refreshToken: string | undefined
  
  // Проверяем наши установленные cookies
  const accessTokenCookie = cookieStore.get('sb-access-token')
  const refreshTokenCookie = cookieStore.get('sb-refresh-token')
  
  if (accessTokenCookie) {
    accessToken = accessTokenCookie.value
  }
  
  if (refreshTokenCookie) {
    refreshToken = refreshTokenCookie.value
  }
  
  // Если не нашли в наших cookies, ищем в стандартных Supabase cookies
  if (!accessToken || !refreshToken) {
    for (const cookie of allCookies) {
      if (cookie.name.includes('sb-') && cookie.name.includes('auth-token')) {
        try {
          const tokenData = JSON.parse(decodeURIComponent(cookie.value))
          accessToken = tokenData?.access_token || accessToken
          refreshToken = tokenData?.refresh_token || refreshToken
          break
        } catch {
          // Если не JSON, пробуем как прямой токен
          if (!accessToken) {
            accessToken = cookie.value
          }
        }
      }
    }
  }
  
  // Формируем строку Cookie для заголовков
  const cookieString = allCookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')
  
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: cookieString ? { Cookie: cookieString } : {},
      },
    }
  )
  
  // Если нашли токен, устанавливаем сессию
  if (accessToken && refreshToken) {
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  }
  
  return client
}
