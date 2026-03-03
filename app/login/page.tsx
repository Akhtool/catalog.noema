import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getRedirectAfterLogin } from './actions'
import { LoginForm } from './login-form'

/**
 * Страница входа
 * Если пользователь уже авторизован → редирект в админ-зону
 */
export default async function LoginPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(await getRedirectAfterLogin())
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#222]">Вход в админ-панель</h1>
          <p className="text-[#666] mt-2">
            Войдите для управления бизнесом
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
