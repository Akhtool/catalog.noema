'use client'

import { useState } from 'react'
import { Business } from '@/types'
import { BusinessProfileEditorSheet } from './business-profile-editor-sheet'
import { EditProfileButton } from './edit-profile-button'
import { useRouter } from 'next/navigation'

interface BusinessProfileEditorWrapperProps {
  business: Business
}

/**
 * Обёртка для управления слайдером редактирования профиля
 * Управляет состоянием открытия/закрытия и обновлением страницы
 */
export function BusinessProfileEditorWrapper({
  business,
}: BusinessProfileEditorWrapperProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  /**
   * Обработка успешного сохранения
   */
  function handleSuccess() {
    router.refresh()
  }

  return (
    <>
      {/* Кнопка редактирования профиля - показывается в правом верхнем углу баннера или страницы */}
      <div className="absolute top-4 right-4 z-30">
        <EditProfileButton
          businessSlug={business.slug}
          onOpenEditor={() => setIsOpen(true)}
        />
      </div>

      <BusinessProfileEditorSheet
        business={business}
        open={isOpen}
        onOpenChange={setIsOpen}
        onSuccess={handleSuccess}
      />
    </>
  )
}
