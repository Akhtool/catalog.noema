import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * API route для проверки авторизации
 * Используется клиентом для проверки сессии после логина
 */
export async function GET() {
  const supabase = await createServerClient()
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ authenticated: true, userId: user.id })
}
