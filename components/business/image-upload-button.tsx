'use client'

import { useState, useRef } from 'react'
import { saveImageUrl } from '@/app/admin/business/actions'
import { supabase } from '@/lib/supabase'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadButtonProps {
  businessId: string
  businessSlug: string
  type: 'logo' | 'cover'
  currentUrl: string | null
  onUploadSuccess?: (url: string) => void
  className?: string
}

/**
 * Кнопка для загрузки изображения (logo или cover) на публичной странице бизнеса
 * Показывается только для owner/admin бизнеса
 */
export function ImageUploadButton({
  businessId,
  businessSlug,
  type,
  currentUrl,
  onUploadSuccess,
  className,
}: ImageUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [, setPreviewUrl] = useState<string | null>(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Обработка загрузки изображения
   */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      alert('Файл должен быть изображением')
      return
    }

    // Проверка размера файла (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      alert('Размер файла не должен превышать 5MB')
      return
    }

    setIsUploading(true)

    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Не авторизован')
        return
      }

      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop()
      const fileName = `${businessId}/${type}-${Date.now()}.${fileExt}`
      const filePath = fileName

      // Загружаем файл напрямую в Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('business')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) {
        console.error('Ошибка загрузки изображения:', uploadError)
        alert('Ошибка загрузки изображения')
        return
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('business')
        .getPublicUrl(filePath)

      if (!urlData?.publicUrl) {
        alert('Не удалось получить URL изображения')
        return
      }

      // Сохраняем URL в базу данных через Server Action
      const saveResult = await saveImageUrl(urlData.publicUrl, type, businessId, businessSlug)
      if (saveResult.error) {
        alert(saveResult.error)
        return
      }

      // Обновляем preview
      setPreviewUrl(urlData.publicUrl)
      if (onUploadSuccess) {
        onUploadSuccess(urlData.publicUrl)
      }
    } catch (error) {
      console.error(`Ошибка загрузки ${type}:`, error)
      alert(`Ошибка загрузки ${type === 'logo' ? 'логотипа' : 'обложки'}`)
    } finally {
      setIsUploading(false)
      // Сбрасываем input для возможности повторной загрузки того же файла
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={isUploading}
        className="hidden"
        id={`${type}-upload-${businessId}`}
      />
      <label
        htmlFor={`${type}-upload-${businessId}`}
        className={cn(
          'absolute z-30 flex items-center justify-center',
          'w-8 h-8 rounded-full bg-white shadow-lg',
          'cursor-pointer hover:bg-gray-50 transition-colors',
          'border-2 border-brand-yellow',
          isUploading && 'opacity-50 cursor-not-allowed'
        )}
        style={
          type === 'logo'
            ? { top: '0.5rem', right: '0.5rem' }
            : { top: '1rem', right: '1rem' }
        }
      >
        {isUploading ? (
          <div className="w-4 h-4 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
        ) : (
          <Pencil className="w-4 h-4 text-brand-yellow" />
        )}
      </label>
    </div>
  )
}
