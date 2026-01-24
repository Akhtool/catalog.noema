"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useCatalogFiltersStore } from "@/store/catalog-filters";
import { Button } from "@/components/ui/button";
import { FiltersSheet } from "./filters-sheet";
import { Category, Product } from "@/types";

interface SearchInputProps {
  categories: Category[];
  products: Product[];
}

export function SearchInput({ categories, products }: SearchInputProps) {
  const { searchQuery, setSearchQuery, resetFilters, hasActiveFilters } = useCatalogFiltersStore();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const hasFilters = hasActiveFilters();

  return (
    <>
      <div className="bg-white rounded-2xl shadow-card p-2 flex items-center gap-2 my-2.5">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="search-input"
            type="search"
            placeholder="Поиск товаров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl pl-12 py-3.5 text-[16px] font-medium focus:ring-2 focus:ring-brand-yellow focus:bg-white transition-all placeholder-gray-400"
          />
        </div>
        {hasFilters && (
          <Button
            size="icon"
            className="w-12 h-12 flex items-center justify-center bg-gray-900 rounded-xl text-brand-yellow hover:bg-black transition-colors"
            aria-label="Очистить фильтры"
            onClick={resetFilters}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
        <Button
          size="icon"
          className="w-12 h-12 flex items-center justify-center bg-gray-900 rounded-xl text-brand-yellow hover:bg-black transition-colors"
          aria-label="Фильтры"
          onClick={() => setIsFiltersOpen(true)}
        >
          <SlidersHorizontal className="h-5 w-5" />
        </Button>
      </div>
      <FiltersSheet
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        categories={categories}
        products={products}
      />
    </>
  );
}
