'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

/**
 * Форма входа в админ-панель
 * Поддерживает email/password и magic link
 */
export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMagicLink, setIsMagicLink] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
        return
      }

      if (data.user && data.session) {
        await ensureProfile(data.user.id, email)
        const { setServerSession, getRedirectAfterLogin } = await import('./actions')
        await setServerSession(data.session.access_token, data.session.refresh_token)
        const redirectTo = await getRedirectAfterLogin()
        window.location.replace(redirectTo)
        return
      }
      
      // Если нет сессии, показываем ошибку
      if (data.user && !data.session) {
        setError('Сессия не создана. Попробуйте ещё раз.')
        setIsLoading(false)
      }
    } catch {
      setError('Произошла ошибка при входе')
      setIsLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

        try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
        return
      }

      setMagicLinkSent(true)
      setIsLoading(false)
    } catch {
      setError('Произошла ошибка при отправке ссылки')
      setIsLoading(false)
    }
  }

  /**
   * Создаёт профиль пользователя, если его нет
   */
  async function ensureProfile(userId: string, userEmail: string) {
    const { error } = await supabase
      .from('profile')
      .upsert({
        id: userId,
        email: userEmail,
      }, {
        onConflict: 'id',
      })

    if (error) {
      console.error('Ошибка создания профиля:', error)
    }
  }

  if (magicLinkSent) {
    return (
      <div className="space-y-4 p-6 border rounded-lg bg-card">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Проверьте почту</h2>
          <p className="text-sm text-muted-foreground">
            Мы отправили ссылку для входа на <strong>{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Перейдите по ссылке в письме, чтобы войти в админ-панель.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setMagicLinkSent(false)
            setEmail('')
          }}
          className="w-full"
        >
          Отправить ещё раз
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-card">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {isMagicLink ? (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email-magic" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email-magic"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отправка…
              </>
            ) : (
              'Отправить ссылку для входа'
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsMagicLink(false)}
            className="w-full"
            disabled={isLoading}
          >
            Войти с паролем
          </Button>
        </form>
      ) : (
        <form onSubmit={handleEmailPassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Пароль
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Вход…
              </>
            ) : (
              'Войти'
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsMagicLink(true)}
            className="w-full"
            disabled={isLoading}
          >
            Войти по ссылке (без пароля)
          </Button>
        </form>
      )}

      <div className="text-center text-sm pt-4 border-t">
        <Link href="/signup" className="text-primary hover:underline">
          Нет аккаунта? Зарегистрироваться
        </Link>
      </div>
    </div>
  )
}
