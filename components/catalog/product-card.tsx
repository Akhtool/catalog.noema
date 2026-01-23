"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Product } from "@/types"
import { useCartStore } from "@/store/cart"
import { ShoppingCart } from "lucide-react"
import { ProductDetailCard } from "./product-detail-card"

interface ProductCardProps {
  product: Product
  viewMode: "grid" | "list"
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem(product)
  }

  const handleCardClick = () => {
    setIsDetailOpen(true)
  }

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
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={!product.inStock}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                В корзину
              </Button>
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
        className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleCardClick}
      >
        {product.images && product.images.length > 0 && (
          <div className="relative w-full aspect-square">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">
              {product.price.toLocaleString("ru-RU")} ₽
            </span>
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={!product.inStock}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              В корзину
            </Button>
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
