import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { SignupForm } from './signup-form'

/**
 * Страница регистрации
 * Если пользователь уже авторизован → редирект на главную текущего host
 */
export default async function SignupPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Если уже авторизован, перенаправляем на главную
  if (user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Регистрация</h1>
          <p className="text-muted-foreground mt-2">
            Создайте аккаунт для управления бизнесом
          </p>
        </div>
        <SignupForm />
        <div className="text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Уже есть аккаунт? Войти
          </Link>
        </div>
      </div>
    </div>
  )
}
