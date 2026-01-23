"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useCatalogFiltersStore } from "@/store/catalog-filters"

export function SearchInput() {
  const { searchQuery, setSearchQuery } = useCatalogFiltersStore()

  return (
    <div className="relative mb-6">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Поиск товаров..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
      />
    </div>
  )
}
