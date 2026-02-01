import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const FALLBACK_REDIRECT = '/admin'

/**
 * Callback для OAuth и magic link: редирект на страницу бизнеса пользователя.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
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

        const { data: businessUsers } = await supabase
          .from('business_user')
          .select('business_id')
          .eq('user_id', user.id)
          .limit(1)
        if (businessUsers?.length) {
          const { data: business } = await supabase
            .from('business')
            .select('slug')
            .eq('id', businessUsers[0].business_id)
            .single()
          if (business?.slug) {
            return NextResponse.redirect(new URL(`/${business.slug}`, request.url))
          }
        }
      }

      return NextResponse.redirect(new URL(FALLBACK_REDIRECT, request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
}
