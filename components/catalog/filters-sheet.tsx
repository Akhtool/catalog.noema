"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { X } from "lucide-react"
import { useCatalogFiltersStore } from "@/store/catalog-filters"
import { Category, Product } from "@/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useSheetDrag } from "@/lib/useSheetDrag"

interface FiltersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  products: Product[]
}

export function FiltersSheet({
  open,
  onOpenChange,
  categories,
  products,
}: FiltersSheetProps) {
  const {
    selectedCategoryId,
    selectedBrands,
    minPrice,
    maxPrice,
    showPopular,
    showDiscounted,
    setSelectedCategoryId,
    toggleBrand,
    setPriceRange,
    setShowPopular,
    setShowDiscounted,
    resetFilters,
  } = useCatalogFiltersStore()

  // Получаем уникальные бренды из товаров
  const brands = Array.from(
    new Set(products.map((p) => p.brand).filter((b): b is string => !!b))
  ).sort()

  // Вычисляем минимальную и максимальную цены
  const prices = products.map((p) => p.price)
  const minProductPrice =
    prices.length > 0 ? Math.min(...prices) : 0
  const maxProductPrice =
    prices.length > 0 ? Math.max(...prices) : 0

  const [localMinPrice, setLocalMinPrice] = useState(
    minPrice?.toString() || ""
  )
  const [localMaxPrice, setLocalMaxPrice] = useState(
    maxPrice?.toString() || ""
  )

  const handleApplyPriceFilter = () => {
    const min = localMinPrice ? parseFloat(localMinPrice) : null
    const max = localMaxPrice ? parseFloat(localMaxPrice) : null
    setPriceRange(min, max)
  }

  const handleReset = () => {
    resetFilters()
    setLocalMinPrice("")
    setLocalMaxPrice("")
  }

  // Используем хук для перетаскивания
  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="w-full max-h-[90vh] rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
        showCloseButton={false}
        style={sheetStyle}
      >
        {/* Шапка: полоска свайпа и крестик в одной строке у верхнего края */}
        <header
          {...dragHandlers}
          className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-gray-100 cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-8 flex-shrink-0" aria-hidden />
          <div className="flex-1 flex items-center justify-center min-w-0 py-0.5">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0 touch-manipulation"
            aria-label="Закрыть фильтры"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Заголовок — свайп вниз тоже закрывает */}
        <div
          {...dragHandlers}
          className="px-6 pt-4 pb-4 border-b cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <SheetTitle className="text-xl font-bold">Фильтры</SheetTitle>
        </div>

        {/* Содержимое фильтров */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
          style={scrollableStyle}
        >
          {/* Категории */}
          <div>
            <h3 className="text-base font-semibold mb-3">Категории</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                  selectedCategoryId === null
                    ? "bg-brand-yellow border-brand-yellow text-black font-medium"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                Все категории
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                    selectedCategoryId === category.id
                      ? "bg-brand-yellow border-brand-yellow text-black font-medium"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Бренды */}
          {brands.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3">Бренды</h3>
              <div className="space-y-2">
                {brands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => toggleBrand(brand)}
                    className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                      selectedBrands.includes(brand)
                        ? "bg-brand-yellow border-brand-yellow text-black font-medium"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Цена */}
          <div>
            <h3 className="text-base font-semibold mb-3">Цена</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">
                  От
                </label>
                <Input
                  type="number"
                  placeholder={minProductPrice.toString()}
                  value={localMinPrice}
                  onChange={(e) => setLocalMinPrice(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">
                  До
                </label>
                <Input
                  type="number"
                  placeholder={maxProductPrice.toString()}
                  value={localMaxPrice}
                  onChange={(e) => setLocalMaxPrice(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                onClick={handleApplyPriceFilter}
                className="mt-6 bg-brand-yellow hover:bg-brand-yellow/90 text-black font-medium"
              >
                Применить
              </Button>
            </div>
          </div>

          {/* Популярные и со скидкой */}
          <div>
            <h3 className="text-base font-semibold mb-3">Дополнительно</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowPopular(!showPopular)}
                className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                  showPopular
                    ? "bg-brand-yellow border-brand-yellow text-black font-medium"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                Популярные
              </button>
              <button
                onClick={() => setShowDiscounted(!showDiscounted)}
                className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                  showDiscounted
                    ? "bg-brand-yellow border-brand-yellow text-black font-medium"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                Товары со скидкой
              </button>
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="px-6 pb-6 pt-4 border-t bg-white space-y-3">
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full"
          >
            Сбросить фильтры
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-brand-yellow hover:bg-brand-yellow/90 text-black font-bold"
          >
            Применить
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
