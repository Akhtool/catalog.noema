'use client'

import { useEffect, useState } from 'react'
import { checkBusinessAccess } from '@/app/admin/business/actions'
import { ImageUploadButton } from './image-upload-button'

interface BusinessImageEditorProps {
  businessId: string
  businessSlug: string
  type: 'logo' | 'cover'
  currentUrl: string | null
}

/**
 * Компонент для редактирования изображения бизнеса на публичной странице
 * Показывает кнопку загрузки только для owner/admin
 */
export function BusinessImageEditor({
  businessId,
  businessSlug,
  type,
  currentUrl,
}: BusinessImageEditorProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(currentUrl)

  useEffect(() => {
    /**
     * Проверяет права доступа к бизнесу
     */
    async function checkAccess() {
      const result = await checkBusinessAccess(businessSlug)
      setHasAccess(result.hasAccess ?? false)
    }

    checkAccess()
  }, [businessSlug])

  // Показываем компонент только если есть доступ и есть изображение
  if (hasAccess === null || !hasAccess || !currentImageUrl) {
    return null
  }

  return (
    <ImageUploadButton
      businessId={businessId}
      businessSlug={businessSlug}
      type={type}
      currentUrl={currentImageUrl}
      onUploadSuccess={(url) => {
        setCurrentImageUrl(url)
        // Обновляем страницу для отображения нового изображения
        window.location.reload()
      }}
    />
  )
}
