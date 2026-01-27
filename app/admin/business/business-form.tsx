'use client'

import { useState } from 'react'
import { updateBusiness } from './actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface BusinessFormProps {
  business: {
    id: string
    name: string
    description: string | null
    phone: string | null
    whatsapp: string | null
    telegram: string | null
    yandex_metrika: string | null
  }
}

/**
 * Форма редактирования бизнеса
 * Client-side form с server action
 */
export function BusinessForm({ business }: BusinessFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    const result = await updateBusiness(formData)
    setIsSubmitting(false)
    
    if ('error' in result) {
      alert(result.error)
    } else {
      alert('Данные успешно сохранены')
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Название бизнеса *
        </label>
        <Input
          id="name"
          name="name"
          defaultValue={business.name}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Описание
        </label>
        <Textarea
          id="description"
          name="description"
          defaultValue={business.description || ''}
          rows={4}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Контакты</h3>
        
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Телефон
          </label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={business.phone || ''}
            placeholder="+7 (999) 123-45-67"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="whatsapp" className="text-sm font-medium">
            WhatsApp
          </label>
          <Input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            defaultValue={business.whatsapp || ''}
            placeholder="+7 (999) 123-45-67"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="telegram" className="text-sm font-medium">
            Telegram
          </label>
          <Input
            id="telegram"
            name="telegram"
            type="text"
            defaultValue={business.telegram || ''}
            placeholder="@username"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="yandex_metrika" className="text-sm font-medium">
          Яндекс.Метрика (ID)
        </label>
        <Input
          id="yandex_metrika"
          name="yandex_metrika"
          type="text"
          defaultValue={business.yandex_metrika || ''}
          placeholder="12345678"
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </form>
  )
}
