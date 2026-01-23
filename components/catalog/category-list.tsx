"use client"

import { Badge } from "@/components/ui/badge"
import { Category } from "@/types"
import { useCatalogFiltersStore } from "@/store/catalog-filters"

interface CategoryListProps {
  categories: Category[]
}

export function CategoryList({ categories }: CategoryListProps) {
  const { selectedCategoryId, setSelectedCategoryId } = useCatalogFiltersStore()

  if (categories.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Badge
        variant={selectedCategoryId === null ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => setSelectedCategoryId(null)}
      >
        Все
      </Badge>
      {categories.map((category) => (
        <Badge
          key={category.id}
          variant={selectedCategoryId === category.id ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedCategoryId(category.id)}
        >
          {category.name}
        </Badge>
      ))}
    </div>
  )
}
