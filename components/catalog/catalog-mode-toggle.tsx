"use client"

import { useFiltersForBusiness } from "@/store/catalog-filters"
import { useCurrentBusinessStore } from "@/store/current-business"

export function CatalogModeToggle() {
  const business = useCurrentBusinessStore((s) => s.business)
  const { catalogMode, setCatalogMode } = useFiltersForBusiness(business?.id ?? null)

  return (
    <div className="bg-white rounded-2xl shadow-card p-1 flex items-center gap-1 mb-6">
      <button
        onClick={() => setCatalogMode("catalog")}
        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          catalogMode === "catalog"
            ? "bg-gray-900 text-white shadow-sm"
            : "text-gray-500 hover:text-gray-900"
        }`}
      >
        Каталог
      </button>
      <button
        onClick={() => setCatalogMode("categories")}
        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          catalogMode === "categories"
            ? "bg-gray-900 text-white shadow-sm"
            : "text-gray-500 hover:text-gray-900"
        }`}
      >
        Категории
      </button>
    </div>
  )
}
