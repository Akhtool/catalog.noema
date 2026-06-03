'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { sendMagicLink, signInWithEmailPassword } from './actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, Lock, Link2, Eye, EyeOff } from 'lucide-react'

// Временно скрыты magic link (переключить на true для включения)
const SHOW_MAGIC_LINK = false

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
  const [showPassword, setShowPassword] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await signInWithEmailPassword(email, password)

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        setIsLoading(false)
        return
      }

      setIsRedirecting(true)
      setTimeout(() => window.location.replace(result.redirectTo ?? '/'), 600)
    } catch {
      const msg = 'Произошла ошибка при входе'
      setError(msg)
      toast.error(msg)
      setIsLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

        try {
      const result = await sendMagicLink(email)

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        setIsLoading(false)
        return
      }

      setMagicLinkSent(true)
      setIsLoading(false)
    } catch {
      const msg = 'Произошла ошибка при отправке ссылки'
      setError(msg)
      toast.error(msg)
      setIsLoading(false)
    }
  }

  const cardClass =
    'rounded-2xl bg-[#F8F9FA] shadow-sm p-6 space-y-4'
  const labelClass = 'text-sm font-medium text-[#333]'
  const inputWrapperClass = 'relative'
  const inputClass =
    'h-10 w-full rounded-xl bg-[#EEEEEE] border-0 pl-10 text-[#222] placeholder:text-[#999] focus-visible:ring-2 focus-visible:ring-[#ccc]'

  if (isRedirecting) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F9FAFB]"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2 className="h-10 w-10 animate-spin text-[#333]" />
        <p className="mt-4 text-[#666] font-medium">Переход в каталог…</p>
      </div>
    )
  }

  if (magicLinkSent) {
    return (
      <div className={`${cardClass} border border-[#eee]`}>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-[#222]">Проверьте почту</h2>
          <p className="text-sm text-[#666]">
            Мы отправили ссылку для входа на <strong>{email}</strong>
          </p>
          <p className="text-sm text-[#666]">
            Перейдите по ссылке в письме, чтобы войти в админ-панель.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setMagicLinkSent(false)
            setEmail('')
          }}
          className="w-full rounded-xl border-[#ddd]"
        >
          Отправить ещё раз
        </Button>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-xl">
          {error}
        </div>
      )}

      {isMagicLink ? (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email-magic" className={labelClass}>
              Email
            </label>
            <div className={inputWrapperClass}>
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999]" />
              <Input
                id="email-magic"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className={inputClass}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold"
            disabled={isLoading}
          >
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
            className="w-full text-[#333] hover:bg-[#eee] rounded-xl"
            disabled={isLoading}
          >
            Войти с паролем
          </Button>
        </form>
      ) : (
        <form onSubmit={handleEmailPassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <div className={inputWrapperClass}>
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999]" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className={labelClass}>
              Пароль
            </label>
            <div className={inputWrapperClass}>
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999]" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="......"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999] hover:text-[#666] focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Вход…
              </>
            ) : (
              'Войти'
            )}
          </Button>

          {SHOW_MAGIC_LINK && (
            <>
              <div className="flex items-center gap-3 py-1">
                <span className="flex-1 h-px bg-[#ddd]" />
                <span className="text-sm text-[#666]">или</span>
                <span className="flex-1 h-px bg-[#ddd]" />
              </div>
              <button
                type="button"
                onClick={() => setIsMagicLink(true)}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 text-[#333] hover:text-[#111] text-sm font-medium"
              >
                <Link2 className="h-4 w-4 text-[#999]" />
                Войти по ссылке (без пароля)
              </button>
            </>
          )}
        </form>
      )}
    </div>
  )
}
