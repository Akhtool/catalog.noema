/**
 * Zustand store для фильтров каталога
 * Client-side only, без серверной логики
 */

import { create } from 'zustand'

export type ViewMode = 'grid' | 'list'

interface CatalogFiltersStore {
  // State
  searchQuery: string
  selectedCategoryId: string | null
  viewMode: ViewMode

  // Actions
  setSearchQuery: (query: string) => void
  setSelectedCategoryId: (categoryId: string | null) => void
  setViewMode: (mode: ViewMode) => void
  resetFilters: () => void
}

export const useCatalogFiltersStore = create<CatalogFiltersStore>((set) => ({
  // Initial state
  searchQuery: '',
  selectedCategoryId: null,
  viewMode: 'grid',

  // Actions
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedCategoryId: (categoryId: string | null) =>
    set({ selectedCategoryId: categoryId }),
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  resetFilters: () =>
    set({
      searchQuery: '',
      selectedCategoryId: null,
      viewMode: 'grid',
    }),
}))
