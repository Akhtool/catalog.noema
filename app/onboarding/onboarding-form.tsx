'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { signUpWithEmailPassword } from '@/app/login/actions'
import { CreateBusinessForm } from '@/app/admin/business/new/create-business-form'

const MIN_PASSWORD_LENGTH = 6

type Mode = 'signup' | 'business'

type OnboardingFormProps = {
  initialMode: Mode
}

/**
 * Внутренняя форма команды: регистрация владельца (логин/пароль для клиента) и создание бизнеса.
 * После успешной регистрации переключается на шаг бизнеса без перезагрузки.
 */
export function OnboardingForm({ initialMode }: OnboardingFormProps) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Пароль не менее ${MIN_PASSWORD_LENGTH} символов`)
        setIsLoading(false)
        return
      }

      const result = await signUpWithEmailPassword(
        email.trim(),
        password,
        fullName.trim() || null
      )

      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      // Сессия и профиль созданы на сервере — переходим к шагу бизнеса.
      setMode('business')
    } catch {
      setError('Произошла ошибка. Попробуйте ещё раз.')
    } finally {
      setIsLoading(false)
    }
  }

  if (mode === 'business') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[#666]">Шаг 2: данные бизнеса для витрины. После создания отправьте клиенту ссылку на вход и учётные данные.</p>
        <CreateBusinessForm />
      </div>
    )
  }

  const cardClass = 'rounded-2xl bg-[#F8F9FA] shadow-sm p-6 space-y-4 border border-[#eee]'
  const labelClass = 'text-sm font-medium text-[#333]'

  return (
    <div className={cardClass}>
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-xl">{error}</div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="onboarding-email" className={labelClass}>
            Email владельца (логин для входа) *
          </label>
          <Input
            id="onboarding-email"
            type="email"
            placeholder="owner@client-domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="h-10 rounded-xl bg-[#EEEEEE] border-0"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="onboarding-password" className={labelClass}>
            Пароль (выдайте клиенту для входа, не менее {MIN_PASSWORD_LENGTH} символов) *
          </label>
          <Input
            id="onboarding-password"
            type="password"
            placeholder="······"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            disabled={isLoading}
            className="h-10 rounded-xl bg-[#EEEEEE] border-0"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="onboarding-name" className={labelClass}>
            Имя владельца (необязательно)
          </label>
          <Input
            id="onboarding-name"
            type="text"
            placeholder="Для отображения в профиле"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
            className="h-10 rounded-xl bg-[#EEEEEE] border-0"
          />
        </div>

        <Button
          type="submit"
          className="w-full rounded-xl bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold"
          disabled={isLoading}
        >
          {isLoading ? 'Создаём учётную запись…' : 'Создать учётную запись →'}
        </Button>
      </form>
    </div>
  )
}
