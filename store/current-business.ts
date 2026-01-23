/**
 * Zustand store для текущего бизнеса
 * Используется для оформления заказа
 */

import { create } from 'zustand'
import { Business } from '@/types'

interface CurrentBusinessStore {
  business: Business | null
  setBusiness: (business: Business) => void
  clearBusiness: () => void
}

export const useCurrentBusinessStore = create<CurrentBusinessStore>((set) => ({
  business: null,
  setBusiness: (business: Business) => set({ business }),
  clearBusiness: () => set({ business: null }),
}))
