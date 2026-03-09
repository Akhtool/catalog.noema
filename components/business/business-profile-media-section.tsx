"use client"

import type { ChangeEvent, RefObject } from "react"
import Image from "next/image"
import { Camera, Frame, Image as ImageIcon } from "lucide-react"

type Props = {
  logoUrl: string | null
  coverUrl: string | null
  logoInputRef: RefObject<HTMLInputElement>
  coverInputRef: RefObject<HTMLInputElement>
  isUploadingLogo: boolean
  isUploadingCover: boolean
  handleLogoFileSelect: (event: ChangeEvent<HTMLInputElement>) => void
  handleCoverFileSelect: (event: ChangeEvent<HTMLInputElement>) => void
}

export function BusinessProfileMediaSection({
  logoUrl,
  coverUrl,
  logoInputRef,
  coverInputRef,
  isUploadingLogo,
  isUploadingCover,
  handleLogoFileSelect,
  handleCoverFileSelect,
}: Props) {
  return (
    <div className="space-y-4 rounded-lg border bg-white p-4">
      <div className="relative w-full pb-12">
        <div className="relative h-48 w-full overflow-hidden rounded-lg bg-gray-100">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt="Обложка"
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
            />
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex h-full w-full cursor-pointer flex-col items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <Camera className="mb-2 h-8 w-8" />
              <span className="text-sm">Загрузить обложку</span>
            </button>
          )}
        </div>

        {logoUrl && (
          <div className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 transform">
            <div className="relative h-24 w-24 overflow-hidden rounded-lg border-4 border-white shadow-lg">
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

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 disabled:opacity-50"
          disabled={isUploadingLogo}
        >
          <div className="flex-shrink-0">
            <ImageIcon className="h-5 w-5 text-gray-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">Изменить логотип</span>
        </button>

        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 disabled:opacity-50"
          disabled={isUploadingCover}
        >
          <div className="flex-shrink-0">
            <Frame className="h-5 w-5 text-gray-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">Изменить фон</span>
        </button>
      </div>

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
  )
}
