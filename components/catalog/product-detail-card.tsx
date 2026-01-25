"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet"
import { Product } from "@/types"
import { useCartStore } from "@/store/cart"
import { X, Share2, Minus, Plus } from "lucide-react"
import { useSheetDrag } from "@/lib/useSheetDrag"

interface ProductDetailCardProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Извлекаем вес/объем и порции из description
function extractWeightAndPortions(description: string | null): {
  weight: string | null
  portions: string | null
} {
  if (!description) return { weight: null, portions: null }

  // Ищем паттерны типа "900g", "900 г", "1 кг" и т.д.
  const weightMatch = description.match(/(\d+[\s]*(г|кг|g|kg|ml|л|мл))/i)
  const weight = weightMatch ? weightMatch[1] : null

  // Ищем паттерны типа "30 порций", "30 порций" и т.д.
  const portionsMatch = description.match(/(\d+[\s]*порций?)/i)
  const portions = portionsMatch ? portionsMatch[1] : null

  return { weight, portions }
}

export function ProductDetailCard({
  product,
  open,
  onOpenChange,
}: ProductDetailCardProps) {
  const [currentImageIndex] = useState(0)
  const addItem = useCartStore((state) => state.addItem)
  const increaseQuantity = useCartStore((state) => state.increaseQuantity)
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity)
  const cartItems = useCartStore((state) => state.items)

  const cartItem = cartItems.find((item) => item.productId === product.id)
  const quantity = cartItem?.quantity || 0

  const handleAddToCart = () => {
    if (quantity === 0) {
      addItem(product)
    } else {
      increaseQuantity(product.id)
    }
  }

  const handleIncrease = () => {
    if (quantity === 0) {
      addItem(product)
    } else {
      increaseQuantity(product.id)
    }
  }

  const handleDecrease = () => {
    if (quantity > 0) {
      decreaseQuantity(product.id)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description || "",
          url: window.location.href,
        })
      } catch {
        // Пользователь отменил или произошла ошибка
      }
    } else {
      // Fallback: копируем в буфер обмена
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  const images = product.images && product.images.length > 0 ? product.images : []
  const { weight, portions } = extractWeightAndPortions(product.description)
  const weightAndPortions = weight && portions ? `${weight} / ${portions}` : weight || portions || null

  // Используем хук для перетаскивания
  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] max-h-[90vh] rounded-t-[2rem] p-0 flex flex-col overflow-hidden border-0"
        showCloseButton={false}
        style={sheetStyle}
      >
        {/* Скрытый заголовок для доступности */}
        <SheetTitle className="sr-only">{product.name}</SheetTitle>
        
        {/* Индикатор свайпа */}
        <div
          {...dragHandlers}
          className="w-full pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Кнопки управления */}
        <div
          {...dragHandlers}
          className="relative flex items-center justify-center px-5 pt-2 pb-2 z-20 select-none"
        >
          {/* Кнопки справа */}
          <div className="absolute right-5 top-3 flex items-center gap-2 z-30">
            <button
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Поделиться"
            >
              <Share2 className="h-5 w-5 text-gray-700" />
            </button>
            <SheetClose asChild>
              <button
                className="w-10 h-10 flex items-center justify-center bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </SheetClose>
          </div>
        </div>

        {/* Контент с прокруткой */}
        <div className="flex-1 overflow-y-auto" style={scrollableStyle}>
          {/* Секция изображения продукта */}
          {images.length > 0 ? (
            <div className="relative w-full h-[500px] bg-orange-500 rounded-b-[2rem] overflow-hidden">
              <Image
                src={images[currentImageIndex]}
                alt={`${product.name} - изображение ${currentImageIndex + 1}`}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />

              {/* Индикаторы карусели */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {images.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? "w-2 bg-brand-yellow"
                          : "w-2 bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-[500px] bg-orange-500 rounded-b-[2rem] flex items-center justify-center">
              <span className="text-white/60">Нет изображения</span>
            </div>
          )}

          {/* Детали продукта */}
          <div className="px-5 pt-4 pb-6 space-y-4">
            {/* Метка BEST SELLER и рейтинг (пока скрыто, так как нет в модели) */}
            {/* <div className="flex items-center gap-3">
              <span className="bg-brand-yellow text-black text-xs font-bold px-2 py-1 rounded">
                BEST SELLER
              </span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-brand-yellow text-brand-yellow" />
                <span className="text-sm font-semibold text-gray-700">4.9</span>
              </div>
            </div> */}

            {/* Название продукта */}
            <h2 className="text-2xl font-black text-gray-900 leading-tight">
              {product.name}
            </h2>

            {/* Объем/порции */}
            {weightAndPortions && (
              <p className="text-sm text-gray-500 font-medium">
                {weightAndPortions}
              </p>
            )}

            {/* Секция ОПИСАНИЕ */}
            {product.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  ОПИСАНИЕ
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Панель действий (фиксированная внизу) */}
        <div className="px-5 pb-5 pt-4 border-t bg-white">
          <div className="flex items-center justify-between gap-3">
            {/* Цена слева */}
            <div className="text-2xl font-black text-gray-900">
              {product.price.toLocaleString("ru-RU")} ₽
            </div>

            {/* Кнопка с плюсиком или селектор количества справа */}
            {quantity > 0 ? (
              <div className="flex items-center gap-3 bg-white border-2 border-brand-yellow rounded-xl px-3 h-12">
                <button
                  onClick={handleDecrease}
                  disabled={quantity === 0}
                  className="w-6 h-6 flex items-center justify-center text-gray-700 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Уменьшить количество"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-base font-semibold text-gray-900 min-w-[20px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrease}
                  disabled={!product.inStock}
                  className="w-6 h-6 flex items-center justify-center text-gray-700 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Увеличить количество"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="w-12 h-12 flex items-center justify-center bg-brand-yellow rounded-full text-black shadow-md hover:bg-yellow-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Добавить в корзину"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
