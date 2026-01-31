'use client'

import { useState, useRef } from 'react'
import { updateBusiness, saveImageUrl } from './actions'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface BusinessFormProps {
  business: {
    id: string
    name: string
    description: string | null
    phone: string | null
    whatsapp: string | null
    telegram: string | null
    yandex_metrika: string | null
    logo_url: string | null
    cover_url: string | null
  }
}

interface FormErrors {
  name?: string
  phone?: string
  whatsapp?: string
  telegram?: string
  yandex_metrika?: string
}

/**
 * Валидация телефона (формат: +7 или начинается с +)
 */
function validatePhone(value: string | null): string | undefined {
  if (!value || value.trim() === '') return undefined
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  const cleaned = value.replace(/[\s\-()]/g, '')
  if (!phoneRegex.test(cleaned)) {
    return 'Некорректный формат телефона. Используйте формат: +7 (999) 123-45-67'
  }
  return undefined
}

/**
 * Валидация Telegram (формат: @username или username)
 */
function validateTelegram(value: string | null): string | undefined {
  if (!value || value.trim() === '') return undefined
  const telegramRegex = /^@?[a-zA-Z0-9_]{5,32}$/
  if (!telegramRegex.test(value.trim())) {
    return 'Некорректный формат Telegram. Используйте формат: @username'
  }
  return undefined
}

/**
 * Валидация Яндекс.Метрики (только цифры)
 */
function validateYandexMetrika(value: string | null): string | undefined {
  if (!value || value.trim() === '') return undefined
  const metrikaRegex = /^\d+$/
  if (!metrikaRegex.test(value.trim())) {
    return 'ID Яндекс.Метрики должен содержать только цифры'
  }
  return undefined
}

/**
 * Форма редактирования бизнеса
 * Client-side form с server action, валидацией и улучшенным UX
 */
export function BusinessForm({ business }: BusinessFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(business.logo_url)
  const [coverUrl, setCoverUrl] = useState<string | null>(business.cover_url)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  
  /**
   * Валидация всех полей формы
   */
  function validateForm(formData: FormData): boolean {
    const newErrors: FormErrors = {}
    
    const name = formData.get('name') as string
    if (!name || name.trim() === '') {
      newErrors.name = 'Название бизнеса обязательно'
    }
    
    const phone = formData.get('phone') as string
    const phoneError = validatePhone(phone)
    if (phoneError) newErrors.phone = phoneError
    
    const whatsapp = formData.get('whatsapp') as string
    const whatsappError = validatePhone(whatsapp)
    if (whatsappError) newErrors.whatsapp = whatsappError
    
    const telegram = formData.get('telegram') as string
    const telegramError = validateTelegram(telegram)
    if (telegramError) newErrors.telegram = telegramError
    
    const yandex_metrika = formData.get('yandex_metrika') as string
    const metrikaError = validateYandexMetrika(yandex_metrika)
    if (metrikaError) newErrors.yandex_metrika = metrikaError
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  /**
   * Обработка загрузки логотипа
   * Загружает файл напрямую в Supabase Storage с клиента для быстрой загрузки
   */
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Файл должен быть изображением' })
      return
    }

    // Проверка размера файла (5MB = 5242880 байт)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: 'error', text: 'Размер файла не должен превышать 5MB' })
      return
    }

    setIsUploadingLogo(true)
    setMessage(null)

    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Не авторизован' })
        return
      }

      // Используем businessId из пропсов (уже загружен)
      const businessId = business.id

      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop()
      const fileName = `${businessId}/logo-${Date.now()}.${fileExt}`
      const filePath = fileName

      // Загружаем файл напрямую в Supabase Storage с клиента
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) {
        console.error('Ошибка загрузки изображения:', uploadError)
        setMessage({ type: 'error', text: 'Ошибка загрузки изображения' })
        return
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('business')
        .getPublicUrl(filePath)

      if (!urlData?.publicUrl) {
        setMessage({ type: 'error', text: 'Не удалось получить URL изображения' })
        return
      }

      // Сохраняем URL в базу данных через Server Action (передаём businessId для избежания лишних запросов)
      const saveResult = await saveImageUrl(urlData.publicUrl, 'logo', businessId)
      if (saveResult.error) {
        setMessage({ type: 'error', text: saveResult.error })
        return
      }

      // Обновляем состояние и показываем успех
      setLogoUrl(urlData.publicUrl)
      setMessage({ type: 'success', text: 'Логотип успешно загружен' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Ошибка загрузки логотипа:', error)
      setMessage({ type: 'error', text: 'Ошибка загрузки логотипа' })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  /**
   * Обработка загрузки обложки
   * Загружает файл напрямую в Supabase Storage с клиента для быстрой загрузки
   */
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Файл должен быть изображением' })
      return
    }

    // Проверка размера файла (5MB = 5242880 байт)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: 'error', text: 'Размер файла не должен превышать 5MB' })
      return
    }

    setIsUploadingCover(true)
    setMessage(null)

    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Не авторизован' })
        return
      }

      // Используем businessId из пропсов (уже загружен)
      const businessId = business.id

      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop()
      const fileName = `${businessId}/cover-${Date.now()}.${fileExt}`
      const filePath = fileName

      // Загружаем файл напрямую в Supabase Storage с клиента
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) {
        console.error('Ошибка загрузки изображения:', uploadError)
        setMessage({ type: 'error', text: 'Ошибка загрузки изображения' })
        return
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('business')
        .getPublicUrl(filePath)

      if (!urlData?.publicUrl) {
        setMessage({ type: 'error', text: 'Не удалось получить URL изображения' })
        return
      }

      // Сохраняем URL в базу данных через Server Action (передаём businessId для избежания лишних запросов)
      const saveResult = await saveImageUrl(urlData.publicUrl, 'cover', businessId)
      if (saveResult.error) {
        setMessage({ type: 'error', text: saveResult.error })
        return
      }

      // Обновляем состояние и показываем успех
      setCoverUrl(urlData.publicUrl)
      setMessage({ type: 'success', text: 'Обложка успешно загружена' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Ошибка загрузки обложки:', error)
      setMessage({ type: 'error', text: 'Ошибка загрузки обложки' })
    } finally {
      setIsUploadingCover(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    setErrors({})
    
    const formData = new FormData(e.currentTarget)
    
    // Добавляем URL изображений в formData
    if (logoUrl) {
      formData.set('logo_url', logoUrl)
    }
    if (coverUrl) {
      formData.set('cover_url', coverUrl)
    }
    
    if (!validateForm(formData)) {
      setMessage({ type: 'error', text: 'Пожалуйста, исправьте ошибки в форме' })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const result = await updateBusiness(formData)
      
      if ('error' in result) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Данные успешно сохранены' })
        // Очищаем сообщение через 3 секунды
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Произошла ошибка при сохранении. Попробуйте ещё раз.' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Сообщения об успехе/ошибке */}
      {message && (
        <div
          className={cn(
            'p-4 rounded-md border',
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          )}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Логотип */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Логотип (1:1)</label>
          <div className="flex items-start gap-4">
            {logoUrl && (
              <div className="relative w-24 h-24 rounded-md overflow-hidden border border-input bg-background flex-shrink-0">
                <Image
                  src={logoUrl}
                  alt="Логотип"
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <Input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isUploadingLogo || isSubmitting}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Рекомендуемое соотношение сторон: 1:1
              </p>
            </div>
          </div>
        </div>

        {/* Обложка */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Обложка (4:1)</label>
          <div className="flex items-start gap-4">
            {coverUrl && (
              <div className="relative w-48 h-12 rounded-md overflow-hidden border border-input bg-background flex-shrink-0">
                <Image
                  src={coverUrl}
                  alt="Обложка"
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <Input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={isUploadingCover || isSubmitting}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Рекомендуемое соотношение сторон: 4:1
              </p>
            </div>
          </div>
        </div>

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
            className={cn(errors.name && 'border-red-500')}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name}</p>
          )}
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
            placeholder="Расскажите о вашем бизнесе"
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
              className={cn(errors.phone && 'border-red-500')}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone}</p>
            )}
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
              className={cn(errors.whatsapp && 'border-red-500')}
            />
            {errors.whatsapp && (
              <p className="text-sm text-red-600">{errors.whatsapp}</p>
            )}
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
              className={cn(errors.telegram && 'border-red-500')}
            />
            {errors.telegram && (
              <p className="text-sm text-red-600">{errors.telegram}</p>
            )}
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
            className={cn(errors.yandex_metrika && 'border-red-500')}
          />
          {errors.yandex_metrika && (
            <p className="text-sm text-red-600">{errors.yandex_metrika}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Только цифры, без пробелов и других символов
          </p>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </div>
  )
}
