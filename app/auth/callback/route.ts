import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * Callback route для обработки OAuth и magic link
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/admin'

  if (code) {
    const supabase = await createServerClient()
    
    // Обмениваем code на session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Создаём профиль, если его нет
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await supabase
          .from('profile')
          .upsert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || null,
          }, {
            onConflict: 'id',
          })
      }

      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Ошибка или нет code
  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
}
