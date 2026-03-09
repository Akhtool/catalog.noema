import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from '@/lib/auth-cookies'

/**
 * Создаёт server-side Supabase клиент для проверки авторизации
 * Используется в Server Components и Server Actions
 */
export async function createServerClient() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value
  
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
  
  if (accessToken && refreshToken) {
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  }
  
  return client
}
