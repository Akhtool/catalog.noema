"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Product } from "@/types"
import { useCartStore } from "@/store/cart"
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react"

interface ProductDetailCardProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductDetailCard({
  product,
  open,
  onOpenChange,
}: ProductDetailCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = () => {
    addItem(product)
  }

  const images = product.images && product.images.length > 0 ? product.images : []
  const hasMultipleImages = images.length > 1

  const goToPreviousImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    )
  }

  const goToNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Галерея изображений */}
          {images.length > 0 ? (
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
              <Image
                src={images[currentImageIndex]}
                alt={`${product.name} - изображение ${currentImageIndex + 1}`}
                fill
                className="object-cover"
                priority
              />

              {/* Навигация по изображениям */}
              {hasMultipleImages && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                    onClick={goToPreviousImage}
                    aria-label="Предыдущее изображение"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                    onClick={goToNextImage}
                    aria-label="Следующее изображение"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {/* Индикатор текущего изображения */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        className={`h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? "w-8 bg-primary"
                            : "w-2 bg-background/60"
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                        aria-label={`Перейти к изображению ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Миниатюры (если больше одного изображения) */}
              {hasMultipleImages && images.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/80 backdrop-blur-sm">
                  <div className="flex gap-2 overflow-x-auto">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        className={`relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                          index === currentImageIndex
                            ? "border-primary"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <Image
                          src={image}
                          alt={`Миниатюра ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">Нет изображения</span>
            </div>
          )}

          {/* Описание */}
          {product.description && (
            <div>
              <h3 className="font-semibold mb-2">Описание</h3>
              <p className="text-muted-foreground whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Бренд */}
          {product.brand && (
            <div>
              <h3 className="font-semibold mb-2">Бренд</h3>
              <p className="text-muted-foreground">{product.brand}</p>
            </div>
          )}

          {/* Цена и кнопка */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Цена</p>
              <p className="text-3xl font-bold">
                {product.price.toLocaleString("ru-RU")} ₽
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="flex-shrink-0"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {product.inStock ? "Добавить в корзину" : "Нет в наличии"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
