'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Форма регистрации
 */
export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Регистрируем пользователя
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || null,
          },
        },
      })

      if (signUpError) {
        const msg = getAuthErrorMessage(signUpError.message)
        setError(msg)
        toast.error(msg)
        setIsLoading(false)
        return
      }

      if (data.user && data.session) {
        // Создаём профиль
        const { error: profileError } = await supabase
          .from('profile')
          .insert({
            id: data.user.id,
            email: email,
            full_name: fullName || null,
          })

        if (profileError) {
          console.error('Ошибка создания профиля:', profileError)
        }

        // Устанавливаем сессию на сервере через server action
        const { setServerSession } = await import('../login/actions')
        await setServerSession(data.session.access_token, data.session.refresh_token)
        
        // Используем window.location для гарантированного редиректа
        window.location.replace('/')
      }
    } catch {
      const msg = 'Произошла ошибка при регистрации'
      setError(msg)
      toast.error(msg)
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-card">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            Имя (необязательно)
          </label>
          <Input
            id="fullName"
            type="text"
            placeholder="Иван Иванов"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email *
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
            Пароль *
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={isLoading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Минимум 6 символов
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
        </Button>
      </form>
    </div>
  )
}
