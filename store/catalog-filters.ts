/**
 * Zustand store для фильтров каталога (отдельные на каждый бизнес)
 * Client-side only, без серверной логики
 * Основан на /docs/plans/per-business-state-fix-plan.md этап 3
 */

import { create } from 'zustand'

export type ViewMode = 'grid' | 'list'
export type CatalogMode = 'catalog' | 'categories'

export interface CatalogFiltersState {
  searchQuery: string
  selectedCategoryId: string | null
  selectedBrands: string[]
  minPrice: number | null
  maxPrice: number | null
  showPopular: boolean
  showDiscounted: boolean
  viewMode: ViewMode
  catalogMode: CatalogMode
}

const DEFAULT_FILTERS: CatalogFiltersState = {
  searchQuery: '',
  selectedCategoryId: null,
  selectedBrands: [],
  minPrice: null,
  maxPrice: null,
  showPopular: false,
  showDiscounted: false,
  viewMode: 'grid',
  catalogMode: 'catalog',
}

interface CatalogFiltersStore {
  filtersByBusinessId: Record<string, CatalogFiltersState>

  setSearchQuery: (businessId: string, query: string) => void
  setSelectedCategoryId: (businessId: string, categoryId: string | null) => void
  toggleBrand: (businessId: string, brand: string) => void
  setPriceRange: (businessId: string, min: number | null, max: number | null) => void
  setShowPopular: (businessId: string, show: boolean) => void
  setShowDiscounted: (businessId: string, show: boolean) => void
  setViewMode: (businessId: string, mode: ViewMode) => void
  setCatalogMode: (businessId: string, mode: CatalogMode) => void
  resetFilters: (businessId: string) => void
  hasActiveFilters: (businessId: string) => boolean
}

function getSlice(
  state: { filtersByBusinessId: Record<string, CatalogFiltersState> },
  businessId: string
): CatalogFiltersState {
  return state.filtersByBusinessId[businessId] ?? DEFAULT_FILTERS
}

export const useCatalogFiltersStore = create<CatalogFiltersStore>((set, get) => ({
  filtersByBusinessId: {},

  setSearchQuery: (businessId, query) =>
    set((state) => ({
      filtersByBusinessId: {
        ...state.filtersByBusinessId,
        [businessId]: { ...getSlice(state, businessId), searchQuery: query },
      },
    })),

  setSelectedCategoryId: (businessId, categoryId) =>
    set((state) => ({
      filtersByBusinessId: {
        ...state.filtersByBusinessId,
        [businessId]: { ...getSlice(state, businessId), selectedCategoryId: categoryId },
      },
    })),

  toggleBrand: (businessId, brand) =>
    set((state) => {
      const slice = getSlice(state, businessId)
      const selectedBrands = slice.selectedBrands.includes(brand)
        ? slice.selectedBrands.filter((b) => b !== brand)
        : [brand]
      return {
        filtersByBusinessId: {
          ...state.filtersByBusinessId,
          [businessId]: { ...slice, selectedBrands },
        },
      }
    }),

  setPriceRange: (businessId, min, max) =>
    set((state) => ({
      filtersByBusinessId: {
        ...state.filtersByBusinessId,
        [businessId]: { ...getSlice(state, businessId), minPrice: min, maxPrice: max },
      },
    })),

  setShowPopular: (businessId, show) =>
    set((state) => ({
      filtersByBusinessId: {
        ...state.filtersByBusinessId,
        [businessId]: { ...getSlice(state, businessId), showPopular: show },
      },
    })),

  setShowDiscounted: (businessId, show) =>
    set((state) => ({
      filtersByBusinessId: {
        ...state.filtersByBusinessId,
        [businessId]: { ...getSlice(state, businessId), showDiscounted: show },
      },
    })),

  setViewMode: (businessId, mode) =>
    set((state) => ({
      filtersByBusinessId: {
        ...state.filtersByBusinessId,
        [businessId]: { ...getSlice(state, businessId), viewMode: mode },
      },
    })),

  setCatalogMode: (businessId, mode) =>
    set((state) => ({
      filtersByBusinessId: {
        ...state.filtersByBusinessId,
        [businessId]: { ...getSlice(state, businessId), catalogMode: mode },
      },
    })),

  resetFilters: (businessId) =>
    set((state) => ({
      filtersByBusinessId: {
        ...state.filtersByBusinessId,
        [businessId]: DEFAULT_FILTERS,
      },
    })),

  hasActiveFilters: (businessId) => {
    const slice = getSlice(get(), businessId)
    return (
      slice.searchQuery.trim() !== '' ||
      slice.selectedCategoryId !== null ||
      slice.selectedBrands.length > 0 ||
      slice.minPrice !== null ||
      slice.maxPrice !== null ||
      slice.showPopular ||
      slice.showDiscounted
    )
  },
}))

/** Хук: фильтры для конкретного бизнеса */
export function useFiltersForBusiness(businessId: string | null) {
  const slice = useCatalogFiltersStore((s) =>
    businessId ? (s.filtersByBusinessId[businessId] ?? DEFAULT_FILTERS) : DEFAULT_FILTERS
  )
  const setSearchQuery = useCatalogFiltersStore((s) => s.setSearchQuery)
  const setSelectedCategoryId = useCatalogFiltersStore((s) => s.setSelectedCategoryId)
  const toggleBrand = useCatalogFiltersStore((s) => s.toggleBrand)
  const setPriceRange = useCatalogFiltersStore((s) => s.setPriceRange)
  const setShowPopular = useCatalogFiltersStore((s) => s.setShowPopular)
  const setShowDiscounted = useCatalogFiltersStore((s) => s.setShowDiscounted)
  const setViewMode = useCatalogFiltersStore((s) => s.setViewMode)
  const setCatalogMode = useCatalogFiltersStore((s) => s.setCatalogMode)
  const resetFilters = useCatalogFiltersStore((s) => s.resetFilters)
  const hasActiveFilters = useCatalogFiltersStore((s) => s.hasActiveFilters)

  return {
    ...slice,
    setSearchQuery: (q: string) => businessId && setSearchQuery(businessId, q),
    setSelectedCategoryId: (id: string | null) => businessId && setSelectedCategoryId(businessId, id),
    toggleBrand: (b: string) => businessId && toggleBrand(businessId, b),
    setPriceRange: (min: number | null, max: number | null) =>
      businessId && setPriceRange(businessId, min, max),
    setShowPopular: (show: boolean) => businessId && setShowPopular(businessId, show),
    setShowDiscounted: (show: boolean) => businessId && setShowDiscounted(businessId, show),
    setViewMode: (mode: ViewMode) => businessId && setViewMode(businessId, mode),
    setCatalogMode: (mode: CatalogMode) => businessId && setCatalogMode(businessId, mode),
    resetFilters: () => businessId && resetFilters(businessId),
    hasActiveFilters: () => (businessId ? hasActiveFilters(businessId) : false),
  }
}


