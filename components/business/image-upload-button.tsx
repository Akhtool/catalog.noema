'use client'

import { useState, useRef } from 'react'
import { uploadBusinessImage } from '@/app/admin/business/actions'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { BusinessImageCropSheet } from './business-image-crop-sheet'

const MAX_FILE_SIZE = 5 * 1024 * 1024

interface ImageUploadButtonProps {
  businessId: string
  businessSlug: string
  type: 'logo' | 'cover'
  currentUrl: string | null
  onUploadSuccess?: (url: string) => void
  className?: string
}

/**
 * Кнопка для загрузки изображения (logo или cover) на публичной странице бизнеса.
 * Показывается только для owner/admin. Перед загрузкой открывает cropper.
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
  const [cropOpen, setCropOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Файл должен быть изображением')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Размер файла не должен превышать 5MB')
      return
    }

    const url = URL.createObjectURL(file)
    setCropImageSrc(url)
    setCropOpen(true)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleCropComplete(croppedFile: File) {
    if (cropImageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropImageSrc)
    }
    setCropImageSrc(null)

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', croppedFile)

      const result = await uploadBusinessImage(formData, type, businessId, businessSlug)
      if (result.error) {
        toast.error(result.error)
        return
      }

      setPreviewUrl(result.publicUrl!)
      toast.success(type === 'logo' ? 'Логотип загружен' : 'Обложка загружена')
      onUploadSuccess?.(result.publicUrl!)
    } catch (error) {
      console.error(`Ошибка загрузки ${type}:`, error)
      toast.error(`Ошибка загрузки ${type === 'logo' ? 'логотипа' : 'обложки'}`)
    } finally {
      setIsUploading(false)
    }
  }

  function handleCropClose(open: boolean) {
    if (!open && cropImageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropImageSrc)
    }
    setCropOpen(open)
    setCropImageSrc(null)
  }

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
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

      <BusinessImageCropSheet
        open={cropOpen}
        onOpenChange={handleCropClose}
        type={type}
        imageSrc={cropImageSrc}
        onComplete={handleCropComplete}
      />
    </div>
  )
}
