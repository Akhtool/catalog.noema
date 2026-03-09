'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createBusiness } from './actions'
import { resolveBusinessHomeRedirect } from '@/lib/auth-redirect'
import { buildBusinessCatalogUrl, normalizeHost } from '@/lib/host'

type Message =
  | { type: 'success'; text: string; slug: string }
  | { type: 'error'; text: string }

const PUBLIC_URL_HINT = 'https://{slug}.catlg.ru'

/**
 * Форма создания бизнеса для текущего пользователя.
 * UI максимально простой: валидация на клиенте минимальная, основная — на сервере.
 */
export function CreateBusinessForm() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.set('name', name)
      formData.set('slug', slug)

      const result = await createBusiness(formData)

      if ('error' in result) {
        setMessage({ type: 'error', text: result.error ?? 'Ошибка создания бизнеса' })
        return
      }

      setMessage({
        type: 'success',
        text: 'Бизнес создан. Переходим к настройке профиля…',
        slug: result.slug,
      })

      // После создания бизнеса переходим сразу на поддомен каталога.
      window.location.replace(
        resolveBusinessHomeRedirect({
          slug: result.slug,
          protocol: window.location.protocol,
          port: window.location.port || null,
          host: normalizeHost(window.location.host) ?? '',
        })
      )
    } catch {
      setMessage({ type: 'error', text: 'Ошибка создания бизнеса. Попробуйте ещё раз.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-card max-w-xl">
      {message && (
        <div
          className={cn(
            'p-3 text-sm rounded-md border',
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          )}
        >
          <div className="space-y-1">
            <p className="font-medium">{message.text}</p>
            {message.type === 'success' && (
              <p className="text-xs">
                Публичный URL:{' '}
                <Link
                  className="underline"
                  href={buildBusinessCatalogUrl(message.slug)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {buildBusinessCatalogUrl(message.slug)}
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Название бизнеса *
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isSubmitting}
            placeholder="Например: Кофейня Noema"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="slug" className="text-sm font-medium">
            Slug (URL) (необязательно)
          </label>
          <Input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={isSubmitting}
            placeholder={`Например: noema-coffee (публичный URL: ${PUBLIC_URL_HINT})`}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <p className="text-xs text-muted-foreground">
            Если не заполнить — сгенерируем из названия (латиница/цифры/дефисы).
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Создаём…' : 'Создать бизнес'}
        </Button>
      </form>
    </div>
  )
}

