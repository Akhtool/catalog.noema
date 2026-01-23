"use client"

import { Category } from "@/types"
import { useCatalogFiltersStore } from "@/store/catalog-filters"
import { useRef, useEffect } from "react"

interface CategoryListProps {
  categories: Category[]
}

export function CategoryList({ categories }: CategoryListProps) {
  const { selectedCategoryId, setSelectedCategoryId, catalogMode } = useCatalogFiltersStore()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const categoryRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  // Скролл к выбранной категории при изменении
  useEffect(() => {
    if (selectedCategoryId && catalogMode === "catalog") {
      const button = categoryRefs.current.get(selectedCategoryId)
      if (button && scrollContainerRef.current) {
        button.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        })
      }
    }
  }, [selectedCategoryId, catalogMode])

  // Не показываем в режиме "Категории"
  if (catalogMode === "categories" || categories.length === 0) {
    return null
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 mb-6"
    >
      {catalogMode === "catalog" && (
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={`whitespace-nowrap px-6 py-3 text-sm font-bold rounded-full transition-all ${
            selectedCategoryId === null
              ? "bg-brand-yellow text-black shadow-yellow-glow"
              : "bg-white text-gray-500 border border-gray-100 shadow-sm hover:text-black hover:border-brand-yellow"
          }`}
        >
          Все
        </button>
      )}
      {categories.map((category) => (
        <button
          key={category.id}
          ref={(el) => {
            if (el) categoryRefs.current.set(category.id, el)
          }}
          onClick={() => {
            // В режиме каталога - скроллим к категории
            setSelectedCategoryId(category.id)
          }}
          className={`whitespace-nowrap px-6 py-3 text-sm font-semibold rounded-full transition-all ${
            selectedCategoryId === category.id
              ? "bg-brand-yellow text-black shadow-yellow-glow"
              : "bg-white text-gray-500 border border-gray-100 shadow-sm hover:text-black hover:border-brand-yellow"
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
