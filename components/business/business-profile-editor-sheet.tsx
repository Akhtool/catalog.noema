'use client'

import { useState, useRef } from 'react'
import { updateBusiness, saveImageUrl } from '@/app/admin/business/actions'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Business } from '@/types'
import { Camera, User, Settings, Image as ImageIcon, Frame, X, Phone, Loader2 } from 'lucide-react'
import { useSheetDrag } from '@/lib/useSheetDrag'
import { BusinessImageCropSheet } from './business-image-crop-sheet'

const MAX_FILE_SIZE = 5 * 1024 * 1024

/** Иконка WhatsApp (логотип бренда) */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

/** Иконка Telegram (логотип бренда) */
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

interface BusinessProfileEditorSheetProps {
  business: Business
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface FormErrors {
  name?: string
  phone?: string
  whatsapp?: string
  telegram?: string
}

/**
 * Валидация телефона
 */
function validatePhone(value: string | null): string | undefined {
  if (!value || value.trim() === '') return undefined
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  const cleaned = value.replace(/[\s\-()]/g, '')
  if (!phoneRegex.test(cleaned)) {
    return 'Некорректный формат телефона'
  }
  return undefined
}

/**
 * Валидация Telegram
 */
function validateTelegram(value: string | null): string | undefined {
  if (!value || value.trim() === '') return undefined
  const telegramRegex = /^@?[a-zA-Z0-9_]{5,32}$/
  if (!telegramRegex.test(value.trim())) {
    return 'Некорректный формат Telegram'
  }
  return undefined
}

/**
 * Слайдер редактирования профиля бизнеса
 * Открывается снизу страницы
 */
export function BusinessProfileEditorSheet({
  business,
  open,
  onOpenChange,
  onSuccess,
}: BusinessProfileEditorSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(business.logoUrl)
  const [coverUrl, setCoverUrl] = useState<string | null>(business.coverUrl)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropType, setCropType] = useState<'logo' | 'cover'>('logo')

  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange,
  })

  /**
   * Валидация формы
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
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Открывает cropper для логотипа или обложки
   */
  function handleLogoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Файл должен быть изображением' })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: 'error', text: 'Размер файла не должен превышать 5MB' })
      return
    }
    setCropImageSrc(URL.createObjectURL(file))
    setCropType('logo')
    setCropOpen(true)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  function handleCoverFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Файл должен быть изображением' })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: 'error', text: 'Размер файла не должен превышать 5MB' })
      return
    }
    setCropImageSrc(URL.createObjectURL(file))
    setCropType('cover')
    setCropOpen(true)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  /**
   * Загружает обрезанное изображение (logo или cover)
   */
  async function handleCropComplete(croppedFile: File) {
    const type = cropType
    if (cropImageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropImageSrc)
    }
    setCropOpen(false)
    setCropImageSrc(null)

    if (type === 'logo') setIsUploadingLogo(true)
    else setIsUploadingCover(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Не авторизован' })
        return
      }

      const fileExt = croppedFile.name.split('.').pop() ?? 'jpg'
      const fileName = `${business.id}/${type}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('business')
        .upload(fileName, croppedFile, {
          contentType: croppedFile.type,
          upsert: true,
        })

      if (uploadError) {
        console.error('Ошибка загрузки изображения:', uploadError)
        setMessage({ type: 'error', text: 'Ошибка загрузки изображения' })
        return
      }

      const { data: urlData } = supabase.storage
        .from('business')
        .getPublicUrl(fileName)

      if (!urlData?.publicUrl) {
        setMessage({ type: 'error', text: 'Не удалось получить URL изображения' })
        return
      }

      const saveResult = await saveImageUrl(urlData.publicUrl, type, business.id, business.slug)
      if (saveResult.error) {
        setMessage({ type: 'error', text: saveResult.error })
        return
      }

      if (type === 'logo') setLogoUrl(urlData.publicUrl)
      else setCoverUrl(urlData.publicUrl)
      setMessage({ type: 'success', text: type === 'logo' ? 'Логотип загружен' : 'Обложка загружена' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error(`Ошибка загрузки ${type}:`, error)
      setMessage({ type: 'error', text: `Ошибка загрузки ${type === 'logo' ? 'логотипа' : 'обложки'}` })
    } finally {
      if (type === 'logo') setIsUploadingLogo(false)
      else setIsUploadingCover(false)
    }
  }

  function handleCropClose(open: boolean) {
    if (!open && cropImageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropImageSrc)
    }
    setCropOpen(open)
    setCropImageSrc(null)
  }

  /**
   * Отправка формы
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    setErrors({})
    
    const formData = new FormData(e.currentTarget)
    
    formData.set('business_id', business.id)
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
        setMessage({ type: 'error', text: result.error ?? 'Неизвестная ошибка' })
      } else {
        setMessage({ type: 'success', text: 'Данные успешно сохранены' })
        setTimeout(() => {
          setMessage(null)
          onOpenChange(false)
          if (onSuccess) {
            onSuccess()
          }
        }, 1500)
      }
    } catch {
      setMessage({ 
        type: 'error', 
        text: 'Произошла ошибка при сохранении. Попробуйте ещё раз.' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="w-full max-h-[95vh] rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
        style={sheetStyle}
      >
        {/* Индикатор свайпа вниз */}
        <div
          {...dragHandlers}
          className="w-full pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Шапка: заголовок слева, кнопка закрытия справа */}
        <div className="px-6 pt-3 pb-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <SheetTitle className="text-xl font-bold">Редактор профиля</SheetTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Закрыть редактор"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SheetDescription className="text-sm text-gray-500">
            Логотип и данные отображаются на странице каталога
          </SheetDescription>
        </div>

        {/* Прокручиваемая область с контентом */}
        <div className="flex-1 overflow-y-auto px-6 py-4" style={scrollableStyle}>
          {message && (
            <div
              className={cn(
                'mb-4 p-4 rounded-md border',
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              )}
            >
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="profile" className="flex-1">
                Профиль
              </TabsTrigger>
              <TabsTrigger value="about" className="flex-1">
                О себе
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">
                Настройки
              </TabsTrigger>
            </TabsList>

            {/* Обёртка с фиксированной мин. высотой — избегаем скачка высоты при смене вкладки */}
            <div className="min-h-[500px]">
            {/* Вкладка "Профиль" - только изображения */}
            <TabsContent value="profile" className="space-y-4">
              <div className="space-y-4 rounded-lg border p-4 bg-white">
                {/* Контейнер для обложки и логотипа */}
                <div className="relative w-full pb-12">
                  {/* Обложка */}
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                    {coverUrl ? (
                      <>
                        <Image
                          src={coverUrl}
                          alt="Обложка"
                          fill
                          className="object-cover"
                          sizes="100vw"
                          unoptimized
                        />
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-gray-400 hover:text-gray-600"
                      >
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="text-sm">Загрузить обложку</span>
                      </button>
                    )}
                  </div>
                  {/* Логотип - квадратный с закругленными углами, по центру внизу, вне контейнера обложки */}
                  {logoUrl && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-20">
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border-4 border-white shadow-lg">
                        <Image
                          src={logoUrl}
                          alt="Логотип"
                          fill
                          className="object-cover"
                          sizes="96px"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Кнопки изменения изображений */}
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left disabled:opacity-50"
                    disabled={isUploadingLogo}
                  >
                    <div className="flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      Изменить логотип
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left disabled:opacity-50"
                    disabled={isUploadingCover}
                  >
                    <div className="flex-shrink-0">
                      <Frame className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      Изменить фон
                    </span>
                  </button>
                </div>

                {/* Скрытые input для изображений */}
                <input
                  ref={logoInputRef}
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileSelect}
                  disabled={isUploadingLogo}
                  className="hidden"
                />
                <input
                  ref={coverInputRef}
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileSelect}
                  disabled={isUploadingCover}
                  className="hidden"
                />

              </div>
            </TabsContent>

            {/* Вкладка "О себе" - текстовая информация */}
            <TabsContent value="about" className="space-y-4">
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-brand-yellow" />
                  <h3 className="text-lg font-semibold">О себе</h3>
                </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-red-600">
                ИМЯ*
              </label>
              <Input
                id="name"
                name="name"
                defaultValue={business.name}
                required
                disabled={isSubmitting}
                className={cn(errors.name && 'border-red-500')}
                maxLength={35}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-red-600">
                О СЕБЕ / ОБЩАЯ ИНФОРМАЦИЯ*
              </label>
              <Textarea
                id="description"
                name="description"
                defaultValue={business.description || ''}
                rows={4}
                disabled={isSubmitting}
                placeholder="Краткое и подробное описание бизнеса"
                maxLength={500}
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-red-600">КОНТАКТЫ*</label>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-gray-600" />
                  </div>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={business.phone || ''}
                    placeholder="+7 (999) 123-45-67"
                    disabled={isSubmitting}
                    className={cn('flex-1', errors.phone && 'border-red-500')}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-600 ml-10">{errors.phone}</p>
                )}

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    defaultValue={business.whatsapp || ''}
                    placeholder="+7 (999) 123-45-67"
                    disabled={isSubmitting}
                    className={cn('flex-1', errors.whatsapp && 'border-red-500')}
                  />
                </div>
                {errors.whatsapp && (
                  <p className="text-sm text-red-600 ml-10">{errors.whatsapp}</p>
                )}

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <TelegramIcon className="w-4 h-4 text-[#0088cc]" />
                  </div>
                  <Input
                    id="telegram"
                    name="telegram"
                    type="text"
                    defaultValue={business.telegram || ''}
                    placeholder="@username"
                    disabled={isSubmitting}
                    className={cn('flex-1', errors.telegram && 'border-red-500')}
                  />
                </div>
                {errors.telegram && (
                  <p className="text-sm text-red-600 ml-10">{errors.telegram}</p>
                )}
              </div>
            </div>
              </div>
            </TabsContent>

            {/* Вкладка "Настройки" */}
          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-brand-yellow" />
                <h3 className="text-lg font-semibold">Настройки</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Дополнительные настройки будут доступны в будущих обновлениях.
              </p>
            </div>
          </TabsContent>
            </div>
        </Tabs>

        {/* Кнопка сохранения - всегда видна внизу */}
        <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t -mx-6 px-6">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-yellow text-black hover:bg-brand-yellow/90 font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение…
              </>
            ) : (
              'СОХРАНИТЬ ИЗМЕНЕНИЯ'
            )}
          </Button>
        </div>
        </form>
        </div>
      </SheetContent>
      <BusinessImageCropSheet
        open={cropOpen}
        onOpenChange={handleCropClose}
        type={cropType}
        imageSrc={cropImageSrc}
        onComplete={handleCropComplete}
      />
    </Sheet>
  )
}
