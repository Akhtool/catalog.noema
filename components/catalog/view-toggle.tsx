"use client"

import { Button } from "@/components/ui/button"
import { Grid3x3, List } from "lucide-react"
import { useCatalogFiltersStore } from "@/store/catalog-filters"

export function ViewToggle() {
  const { viewMode, setViewMode } = useCatalogFiltersStore()

  return (
    <div className="flex gap-2 mb-6">
      <Button
        variant={viewMode === "grid" ? "default" : "outline"}
        size="icon"
        onClick={() => setViewMode("grid")}
        aria-label="Сетка"
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "list" ? "default" : "outline"}
        size="icon"
        onClick={() => setViewMode("list")}
        aria-label="Список"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}
