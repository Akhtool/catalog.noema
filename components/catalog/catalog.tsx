"use client"

import { useMemo } from "react"
import { Category, Product } from "@/types"
import { useCatalogFiltersStore } from "@/store/catalog-filters"
import { CategoryList } from "./category-list"
import { SearchInput } from "./search-input"
import { ViewToggle } from "./view-toggle"
import { ProductCard } from "./product-card"
import { CatalogModeToggle } from "./catalog-mode-toggle"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface CatalogProps {
  categories: Category[]
  products: Product[]
}

export function Catalog({ categories, products }: CatalogProps) {
  const {
    searchQuery,
    selectedCategoryId,
    selectedBrands,
    minPrice,
    maxPrice,
    showPopular,
    showDiscounted,
    viewMode,
    catalogMode,
    resetFilters,
    hasActiveFilters,
  } = useCatalogFiltersStore()

  const hasFilters = hasActiveFilters()

  // Фильтрация товаров
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Фильтр по категории
    if (selectedCategoryId) {
      filtered = filtered.filter(
        (product) => product.categoryId === selectedCategoryId
      )
    }

    // Фильтр по брендам
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(
        (product) => product.brand && selectedBrands.includes(product.brand)
      )
    }

    // Фильтр по цене
    if (minPrice !== null) {
      filtered = filtered.filter((product) => product.price >= minPrice)
    }
    if (maxPrice !== null) {
      filtered = filtered.filter((product) => product.price <= maxPrice)
    }

    // Фильтр "Популярные" (пока просто все товары, можно добавить логику на основе просмотров/продаж)
    if (showPopular) {
      // Пока оставляем все товары, можно добавить сортировку по популярности
      filtered = filtered
    }

    // Фильтр "Товары со скидкой" (пока нет поля скидки, можно добавить позже)
    if (showDiscounted) {
      // Пока оставляем все товары, можно добавить проверку на наличие скидки
      filtered = filtered
    }

    // Фильтр по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.description &&
            product.description.toLowerCase().includes(query)) ||
          (product.brand && product.brand.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [
    products,
    selectedCategoryId,
    selectedBrands,
    minPrice,
    maxPrice,
    showPopular,
    showDiscounted,
    searchQuery,
  ])


  // Если режим "Категории" - показываем только список категорий
  if (catalogMode === "categories") {
    return (
      <div className="space-y-6">
        <CatalogModeToggle />
        <SearchInput categories={categories} products={products} />
        {hasFilters && (
          <div className="flex items-center justify-end">
            <Button
              onClick={resetFilters}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-sm"
            >
              <X className="h-4 w-4" />
              Очистить фильтры
            </Button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category) => {
            const categoryProducts = products.filter(
              (p) => p.categoryId === category.id
            )
            return (
              <div
                key={category.id}
                className="bg-card-white rounded-[1.25rem] p-6 shadow-soft border border-transparent hover:border-brand-yellow/30 transition-all cursor-pointer"
                onClick={() => {
                  // Переключаемся в режим каталога и выбираем категорию
                  useCatalogFiltersStore.getState().setCatalogMode("catalog")
                  useCatalogFiltersStore.getState().setSelectedCategoryId(category.id)
                  // Скроллим к началу каталога
                  setTimeout(() => {
                    document.getElementById("catalog-section")?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }, 100)
                }}
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {categoryProducts.length} товаров
                </p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Режим "Каталог" - показываем товары, сгруппированные по категориям
  return (
    <div id="catalog-section" className="space-y-6">
      <CatalogModeToggle />
      <SearchInput categories={categories} products={products} />
      {hasFilters && (
        <div className="flex items-center justify-end">
          <Button
            onClick={resetFilters}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-sm"
          >
            <X className="h-4 w-4" />
            Очистить фильтры
          </Button>
        </div>
      )}
      <CategoryList categories={categories} />

      {/* Переключение вида и заголовок */}
      <div className="flex items-center justify-between mb-5 px-1">
        <h2 className="text-xl font-bold text-gray-900">
          {selectedCategoryId
            ? categories.find((c) => c.id === selectedCategoryId)?.name || "Товары"
            : "Популярное"}
        </h2>
        <ViewToggle />
      </div>

      {/* Список товаров */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Товары не найдены</p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-2 gap-4"
              : "space-y-4"
          }
        >
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  )
}
