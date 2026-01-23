/**
 * Zustand store для фильтров каталога
 * Client-side only, без серверной логики
 */

import { create } from 'zustand'

export type ViewMode = 'grid' | 'list'
export type CatalogMode = 'catalog' | 'categories'

interface CatalogFiltersStore {
  // State
  searchQuery: string
  selectedCategoryId: string | null
  selectedBrands: string[]
  minPrice: number | null
  maxPrice: number | null
  showPopular: boolean
  showDiscounted: boolean
  viewMode: ViewMode
  catalogMode: CatalogMode

  // Actions
  setSearchQuery: (query: string) => void
  setSelectedCategoryId: (categoryId: string | null) => void
  toggleBrand: (brand: string) => void
  setPriceRange: (min: number | null, max: number | null) => void
  setShowPopular: (show: boolean) => void
  setShowDiscounted: (show: boolean) => void
  setViewMode: (mode: ViewMode) => void
  setCatalogMode: (mode: CatalogMode) => void
  resetFilters: () => void
  hasActiveFilters: () => boolean
}

export const useCatalogFiltersStore = create<CatalogFiltersStore>((set) => ({
  // Initial state
  searchQuery: '',
  selectedCategoryId: null,
  selectedBrands: [],
  minPrice: null,
  maxPrice: null,
  showPopular: false,
  showDiscounted: false,
  viewMode: 'grid',
  catalogMode: 'catalog',

  // Actions
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedCategoryId: (categoryId: string | null) =>
    set({ selectedCategoryId: categoryId }),
  toggleBrand: (brand: string) =>
    set((state) => ({
      selectedBrands: state.selectedBrands.includes(brand)
        ? state.selectedBrands.filter((b) => b !== brand)
        : [...state.selectedBrands, brand],
    })),
  setPriceRange: (min: number | null, max: number | null) =>
    set({ minPrice: min, maxPrice: max }),
  setShowPopular: (show: boolean) => set({ showPopular: show }),
  setShowDiscounted: (show: boolean) => set({ showDiscounted: show }),
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  setCatalogMode: (mode: CatalogMode) => set({ catalogMode: mode }),
  resetFilters: () =>
    set({
      searchQuery: '',
      selectedCategoryId: null,
      selectedBrands: [],
      minPrice: null,
      maxPrice: null,
      showPopular: false,
      showDiscounted: false,
      viewMode: 'grid',
      catalogMode: 'catalog',
    }),
  hasActiveFilters: () => {
    const state = useCatalogFiltersStore.getState()
    return (
      state.searchQuery.trim() !== '' ||
      state.selectedCategoryId !== null ||
      state.selectedBrands.length > 0 ||
      state.minPrice !== null ||
      state.maxPrice !== null ||
      state.showPopular ||
      state.showDiscounted
    )
  },
}))
