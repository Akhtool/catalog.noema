"use client"

import { useState } from "react"
import Image from "next/image"
import { Product } from "@/types"
import { useCartStore } from "@/store/cart"
import { Plus } from "lucide-react"
import { ProductDetailCard } from "./product-detail-card"

interface ProductCardProps {
  product: Product
  viewMode: "grid" | "list"
}

// Извлекаем вес/объем из description или используем description как есть
function extractWeight(description: string | null): string | null {
  if (!description) return null
  
  // Ищем паттерны типа "896 г", "908г", "1 кг" и т.д.
  const weightMatch = description.match(/(\d+[\s]*(г|кг|ml|л|мл))/i)
  if (weightMatch) {
    return weightMatch[1]
  }
  
  return null
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const addItem = useCartStore((state) => state.addItem)
  const cartItems = useCartStore((state) => state.items)

  const cartItem = cartItems.find((item) => item.productId === product.id)
  const quantity = cartItem?.quantity || 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem(product)
  }

  const handleCardClick = () => {
    setIsDetailOpen(true)
  }

  const weight = extractWeight(product.description)

  if (viewMode === "list") {
    return (
      <>
        <div
          className="flex gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={handleCardClick}
        >
          {product.images && product.images.length > 0 && (
            <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold mb-1 truncate">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {product.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">
                {product.price.toLocaleString("ru-RU")} ₽
              </span>
              <div className="relative">
                <button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="w-9 h-9 flex items-center justify-center bg-brand-yellow rounded-full text-black shadow-md hover:bg-yellow-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Добавить в корзину"
                >
                  <Plus className="h-5 w-5" />
                </button>
                {quantity > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-md">
                    {quantity}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <ProductDetailCard
          product={product}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />
      </>
    )
  }

  return (
    <>
      <div
        className="bg-card-white rounded-[1.25rem] p-4 shadow-soft relative group flex flex-col justify-between h-full border border-transparent hover:border-brand-yellow/30 transition-all cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Вес/объем в левом верхнем углу */}
        {weight && (
          <div className="absolute top-3 left-3 bg-gray-100 px-2 py-1 rounded-md z-10">
            <span className="text-[10px] font-bold text-gray-500">{weight}</span>
          </div>
        )}

        {/* Изображение продукта */}
        <div className="relative h-36 w-full flex items-center justify-center mb-4 mt-2">
          {product.images && product.images.length > 0 && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-300"
            />
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800 leading-snug line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900 bg-brand-yellow/20 px-2 py-1 rounded-lg">
              {product.price.toLocaleString("ru-RU")} ₽
            </span>
            <div className="relative">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="w-9 h-9 flex items-center justify-center bg-brand-yellow rounded-full text-black shadow-md hover:bg-yellow-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Добавить в корзину"
              >
                <Plus className="h-5 w-5" />
              </button>
              {quantity > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-md">
                  {quantity}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ProductDetailCard
        product={product}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </>
  )
}
