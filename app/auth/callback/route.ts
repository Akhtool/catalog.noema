import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getBusinessSlugForUser, resolveRedirectAfterLogin } from '@/lib/auth-redirect'
import { writeServerSessionCookies } from '@/lib/auth-cookies'

const FALLBACK_REDIRECT = '/'

/**
 * Callback для OAuth и magic link.
 * После успешной авторизации возвращаемся на `/` текущего host.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
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

        const businessSlug = await getBusinessSlugForUser(supabase, user.id)
        const redirectUrl = resolveRedirectAfterLogin({
          slug: businessSlug,
          protocol: requestUrl.protocol.replace(':', ''),
          port: requestUrl.port || null,
          host: requestUrl.hostname,
        })

        const response = NextResponse.redirect(new URL(redirectUrl, request.url))

        if (session) {
          writeServerSessionCookies(response.cookies, session, requestUrl.host)
        }

        return response
      }

      const response = NextResponse.redirect(new URL(FALLBACK_REDIRECT, request.url))
      if (session) {
        writeServerSessionCookies(response.cookies, session, requestUrl.host)
      }
      return response
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
}
