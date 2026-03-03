"use client";

import { Grid3x3, List } from "lucide-react";
import { useFiltersForBusiness } from "@/store/catalog-filters";
import { useCurrentBusinessStore } from "@/store/current-business";

export function ViewToggle() {
  const business = useCurrentBusinessStore((s) => s.business);
  const { viewMode, setViewMode } = useFiltersForBusiness(business?.id ?? null);

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setViewMode("list")}
        aria-label="Список"
        className={`p-2 rounded-lg transition-colors ${
          viewMode === "list"
            ? "bg-gray-900 text-brand-yellow"
            : "text-gray-400 hover:text-brand-yellow"
        }`}
      >
        <List className="h-5 w-5" />
      </button>
      <button
        onClick={() => setViewMode("grid")}
        aria-label="Сетка"
        className={`p-2 rounded-lg transition-colors ${
          viewMode === "grid"
            ? "bg-gray-900 text-brand-yellow"
            : "text-gray-400 hover:text-brand-yellow"
        }`}
      >
        <Grid3x3 className="h-5 w-5" />
      </button>
    </div>
  );
}
