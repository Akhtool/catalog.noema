"use client"

import { useMemo } from "react"
import { Category, Product } from "@/types"
import { useCatalogFiltersStore } from "@/store/catalog-filters"
import { CategoryList } from "./category-list"
import { SearchInput } from "./search-input"
import { ViewToggle } from "./view-toggle"
import { ProductCard } from "./product-card"

interface CatalogProps {
  categories: Category[]
  products: Product[]
}

export function Catalog({ categories, products }: CatalogProps) {
  const { searchQuery, selectedCategoryId, viewMode } = useCatalogFiltersStore()

  // Фильтрация товаров
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Фильтр по категории
    if (selectedCategoryId) {
      filtered = filtered.filter(
        (product) => product.categoryId === selectedCategoryId
      )
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
  }, [products, selectedCategoryId, searchQuery])

  return (
    <div className="space-y-6">
      {/* Поиск */}
      <SearchInput />

      {/* Категории */}
      <CategoryList categories={categories} />

      {/* Переключение вида и список товаров */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Товары {filteredProducts.length > 0 && `(${filteredProducts.length})`}
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
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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
