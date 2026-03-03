/**
 * Zustand store для корзины (отдельная на каждый бизнес)
 * Основан на /docs/data-model.md, /docs/per-business-state-fix-plan.md
 * Client-side only, без серверной логики
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type {
  CartItem,
  CartSlice,
  Order,
  Product,
  DeliveryType,
  BusinessLocation,
  BusinessPromo,
} from '@/types';
import { validatePromo, calculatePromoDiscount } from '@/lib/promo';

const EMPTY_SLICE: CartSlice = {
  items: [],
  comment: null,
  promoCode: null,
  appliedPromo: null,
  promoError: null,
  deliveryType: null,
  deliveryAddress: null,
  selectedPointId: null,
};

interface CartStore {
  cartByBusinessId: Record<string, CartSlice>;
  /** orderNumber по businessId — генерируется при оформлении, не персистится */
  orderNumberByBusinessId: Record<string, string>;

  addItem: (product: Product) => void;
  increaseQuantity: (businessId: string, productId: string) => void;
  decreaseQuantity: (businessId: string, productId: string) => void;
  removeItem: (businessId: string, productId: string) => void;
  clearCart: (businessId: string) => void;
  setComment: (businessId: string, comment: string | null) => void;
  setPromoCode: (businessId: string, promoCode: string | null) => void;
  applyPromo: (businessId: string, promo: BusinessPromo | null | undefined) => boolean;
  clearPromo: (businessId: string) => void;
  setDeliveryType: (businessId: string, type: DeliveryType | null) => void;
  setDeliveryAddress: (businessId: string, address: string | null) => void;
  setSelectedPointId: (businessId: string, pointId: string | null) => void;
  generateOrderNumber: (businessId: string) => string;

  getItems: (businessId: string) => CartItem[];
  getSubtotal: (businessId: string) => number;
  getDiscountAmount: (businessId: string) => number;
  getTotalPrice: (businessId: string) => number;
  getTotalQuantity: (businessId: string) => number;

  createOrder: (businessId: string, pickupPoints?: BusinessLocation[]) => Order;
}

/**
 * Время жизни корзины в миллисекундах (1 час)
 */
const CART_EXPIRY_TIME = 60 * 60 * 1000;

const STORAGE_VERSION = 2;

/**
 * Интерфейс для данных, сохраняемых в localStorage (новый формат)
 */
interface StoredCartData {
  cartByBusinessId: Record<string, CartSlice>;
  timestamp: number;
}

/**
 * Старый формат (для миграции)
 */
interface LegacyStoredCartData {
  items: CartItem[];
  comment: string | null;
  promoCode: string | null;
  appliedPromo: { code: string; type: string; value: number; minOrder: number | null; maxDiscount: number | null } | null;
  deliveryType: DeliveryType | null;
  deliveryAddress: string | null;
  selectedPointId: string | null;
  timestamp?: number;
}

function isCartExpired(timestamp: number): boolean {
  return Date.now() - timestamp > CART_EXPIRY_TIME;
}

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function getSlice(state: { cartByBusinessId: Record<string, CartSlice> }, businessId: string): CartSlice {
  return state.cartByBusinessId[businessId] ?? EMPTY_SLICE;
}

function generateOrderNumberForBusiness(businessId: string): string {
  const STORAGE_KEY = `catalog_order_counter_${businessId}`;
  let counter = 1;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      counter = parseInt(stored, 10) || 1;
    }
  } catch {
    // ignore
  }
  const orderNumber = counter.toString();
  try {
    localStorage.setItem(STORAGE_KEY, (counter + 1).toString());
  } catch {
    // ignore
  }
  return orderNumber;
}

const cartStorage = {
  getItem: (name: string): string | null => {
    if (!isLocalStorageAvailable()) return null;
    try {
      const item = localStorage.getItem(name);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const data = parsed.state as Partial<StoredCartData> | Partial<LegacyStoredCartData>;

      if (!data) return null;

      // Миграция: старый формат (items на верхнем уровне)
      if ('items' in data && Array.isArray(data.items)) {
        const legacy = data as LegacyStoredCartData;
        if (legacy.timestamp && isCartExpired(legacy.timestamp)) {
          localStorage.removeItem(name);
          return null;
        }
        // Отбрасываем старые данные — items без businessId
        return JSON.stringify({
          ...parsed,
          state: { cartByBusinessId: {}, timestamp: Date.now() },
        });
      }

      const newData = data as Partial<StoredCartData>;
      if (newData.timestamp && isCartExpired(newData.timestamp)) {
        localStorage.removeItem(name);
        return null;
      }

      // Санитизация: appliedPromo без businessId (старые данные) — сбрасываем промо в этом слайсе
      const rawCart = newData.cartByBusinessId ?? {};
      const sanitizedCart: Record<string, CartSlice> = {};
      for (const [bid, slice] of Object.entries(rawCart)) {
        if (!slice) continue;
        const ap = slice.appliedPromo as { businessId?: string } | null | undefined;
        const hasInvalidPromo =
          ap != null &&
          (typeof ap.businessId !== 'string' || ap.businessId === '');
        sanitizedCart[bid] = hasInvalidPromo
          ? { ...slice, appliedPromo: null, promoError: null }
          : (slice as CartSlice);
      }

      const state = {
        cartByBusinessId: sanitizedCart,
        timestamp: newData.timestamp ?? Date.now(),
      };
      return JSON.stringify({ ...parsed, state });
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (!isLocalStorageAvailable()) return;
    try {
      const parsed = JSON.parse(value);
      if (parsed?.state) {
        parsed.state.timestamp = Date.now();
        localStorage.setItem(name, JSON.stringify(parsed));
      }
    } catch {
      try {
        localStorage.setItem(name, value);
      } catch {
        // ignore
      }
    }
  },
  removeItem: (name: string): void => {
    if (isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(name);
      } catch {
        // ignore
      }
    }
  },
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cartByBusinessId: {},
      orderNumberByBusinessId: {},

      getItems: (businessId) => getSlice(get(), businessId).items,
      getSubtotal: (businessId) => {
        const slice = getSlice(get(), businessId);
        return slice.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
      getDiscountAmount: (businessId) => {
        const slice = getSlice(get(), businessId);
        const subtotal = get().getSubtotal(businessId);
        const ap = slice.appliedPromo;
        if (!ap || ap.businessId !== businessId) return 0;
        const minOrder = ap.minOrder ?? 0;
        if (subtotal < minOrder) return 0;
        return calculatePromoDiscount(subtotal, ap.value, ap.type, ap.maxDiscount ?? null);
      },
      getTotalPrice: (businessId) =>
        get().getSubtotal(businessId) - get().getDiscountAmount(businessId),
      getTotalQuantity: (businessId) =>
        getSlice(get(), businessId).items.reduce((sum, item) => sum + item.quantity, 0),

      addItem: (product) => {
        const businessId = product.businessId;
        set((state) => {
          const slice = getSlice(state, businessId);
          const existing = slice.items.find((i) => i.productId === product.id);
          let nextItems: CartItem[];

          if (existing) {
            nextItems = slice.items.map((i) =>
              i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
            );
          } else {
            const newItem: CartItem = {
              productId: product.id,
              businessId: product.businessId,
              name: product.name,
              price: product.price,
              quantity: 1,
              originalPrice:
                product.hasDiscount &&
                product.originalPrice != null &&
                product.originalPrice > product.price
                  ? product.originalPrice
                  : undefined,
            };
            nextItems = [...slice.items, newItem];
          }

          return {
            cartByBusinessId: {
              ...state.cartByBusinessId,
              [businessId]: { ...slice, items: nextItems },
            },
          };
        });
      },

      increaseQuantity: (businessId, productId) => {
        set((state) => {
          const slice = getSlice(state, businessId);
          const item = slice.items.find((i) => i.productId === productId);
          if (!item) return state;

          const nextItems = slice.items.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
          );
          return {
            cartByBusinessId: {
              ...state.cartByBusinessId,
              [businessId]: { ...slice, items: nextItems },
            },
          };
        });
      },

      decreaseQuantity: (businessId, productId) => {
        set((state) => {
          const slice = getSlice(state, businessId);
          const item = slice.items.find((i) => i.productId === productId);
          if (!item) return state;

          if (item.quantity <= 1) {
            const nextItems = slice.items.filter((i) => i.productId !== productId);
            const nextSlice =
              nextItems.length === 0
                ? { ...slice, items: nextItems, appliedPromo: null, promoError: null, promoCode: null }
                : { ...slice, items: nextItems };
            return {
              cartByBusinessId: {
                ...state.cartByBusinessId,
                [businessId]: nextSlice,
              },
            };
          }

          const nextItems = slice.items.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
          );
          return {
            cartByBusinessId: {
              ...state.cartByBusinessId,
              [businessId]: { ...slice, items: nextItems },
            },
          };
        });
      },

      removeItem: (businessId, productId) => {
        set((state) => {
          const slice = getSlice(state, businessId);
          const nextItems = slice.items.filter((i) => i.productId !== productId);
          const nextSlice =
            nextItems.length === 0
              ? { ...slice, items: nextItems, appliedPromo: null, promoError: null, promoCode: null }
              : { ...slice, items: nextItems };
          return {
            cartByBusinessId: {
              ...state.cartByBusinessId,
              [businessId]: nextSlice,
            },
          };
        });
      },

      clearCart: (businessId) => {
        set((state) => {
          const next = { ...state.cartByBusinessId };
          delete next[businessId];
          return { cartByBusinessId: next };
        });
      },

      generateOrderNumber: (businessId) => {
        const num = generateOrderNumberForBusiness(businessId);
        set((state) => ({
          orderNumberByBusinessId: {
            ...state.orderNumberByBusinessId,
            [businessId]: num,
          },
        }));
        return num;
      },

      setComment: (businessId, comment) => {
        set((state) => {
          const slice = getSlice(state, businessId);
          return {
            cartByBusinessId: {
              ...state.cartByBusinessId,
              [businessId]: { ...slice, comment },
            },
          };
        });
      },

      setPromoCode: (businessId, promoCode) => {
        set((state) => {
          const slice = getSlice(state, businessId);
          return {
            cartByBusinessId: {
              ...state.cartByBusinessId,
              [businessId]: {
                ...slice,
                promoCode,
                appliedPromo: null,
                promoError: null,
              },
            },
          };
        });
      },

      applyPromo: (businessId, promo) => {
        const slice = getSlice(get(), businessId);
        const code = slice.promoCode ?? '';
        const subtotal = get().getSubtotal(businessId);
        const result = validatePromo(promo, code, subtotal, undefined, businessId);

        if (result.valid && result.applied) {
          set((state) => {
            const s = getSlice(state, businessId);
            return {
              cartByBusinessId: {
                ...state.cartByBusinessId,
                [businessId]: { ...s, appliedPromo: result.applied!, promoError: null },
              },
            };
          });
          return true;
        }

        set((state) => {
          const s = getSlice(state, businessId);
          return {
            cartByBusinessId: {
              ...state.cartByBusinessId,
              [businessId]: {
                ...s,
                appliedPromo: null,
                promoError: result.error ?? 'Промокод не найден',
              },
            },
          };
        });
        return false;
      },

      clearPromo: (businessId) => {
        set((state) => {
          const slice = getSlice(state, businessId);
          return {
            cartByBusinessId: {
              ...state.cartByBusinessId,
              [businessId]: {
                ...slice,
                promoCode: null,
                appliedPromo: null,
                promoError: null,
              },
            },
          };
        });
      },

      setDeliveryType: (businessId, deliveryType) => {
        set((state) => {
          const slice = getSlice(state, businessId);
          const next = { ...slice, deliveryType };
          if (deliveryType !== 'delivery') {
            next.deliveryAddress = null;
          }
          if (deliveryType === 'delivery') {
            next.selectedPointId = null;
          }
          return {
            cartByBusinessId: {
              ...state.cartByBusinessId,
              [businessId]: next,
            },
          };
        });
      },

      setSelectedPointId: (businessId, selectedPointId) => {
        set((state) => {
          const slice = getSlice(state, businessId);
          return {
            cartByBusinessId: {
              ...state.cartByBusinessId,
              [businessId]: { ...slice, selectedPointId },
            },
          };
        });
      },

      setDeliveryAddress: (businessId, deliveryAddress) => {
        set((state) => {
          const slice = getSlice(state, businessId);
          return {
            cartByBusinessId: {
              ...state.cartByBusinessId,
              [businessId]: { ...slice, deliveryAddress },
            },
          };
        });
      },

      createOrder: (businessId, pickupPoints) => {
        const state = get();
        const slice = getSlice(state, businessId);
        const orderNumber =
          state.orderNumberByBusinessId[businessId] ?? generateOrderNumberForBusiness(businessId);
        const selectedPoint =
          slice.selectedPointId && pickupPoints?.length
            ? pickupPoints.find((p) => p.id === slice.selectedPointId) ?? null
            : null;
        const subtotal = state.getSubtotal(businessId);
        const discountAmount = state.getDiscountAmount(businessId);
        const totalPrice = state.getTotalPrice(businessId);
        const totalQuantity = state.getTotalQuantity(businessId);

        return {
          businessId,
          orderNumber,
          items: slice.items,
          subtotal,
          discountAmount,
          totalPrice,
          totalQuantity,
          comment: slice.comment,
          promoCode: slice.promoCode,
          deliveryType: slice.deliveryType,
          deliveryAddress: slice.deliveryAddress,
          selectedPointId: slice.selectedPointId,
          selectedPoint: selectedPoint ?? null,
          createdAt: new Date().toISOString(),
        };
      },
    }),
    {
      name: 'catalog-cart-storage',
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => cartStorage),
      partialize: (state) => ({
        cartByBusinessId: state.cartByBusinessId,
      }),
    }
  )
);

/** Хук: данные корзины для конкретного бизнеса */
export function useCartForBusiness(businessId: string | null) {
  const slice = useCartStore((s) =>
    businessId ? s.cartByBusinessId[businessId] ?? EMPTY_SLICE : EMPTY_SLICE
  );
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getDiscountAmount = useCartStore((s) => s.getDiscountAmount);
  const getTotalPrice = useCartStore((s) => s.getTotalPrice);
  const getTotalQuantity = useCartStore((s) => s.getTotalQuantity);

  return {
    ...slice,
    getSubtotal: () => (businessId ? getSubtotal(businessId) : 0),
    getDiscountAmount: () => (businessId ? getDiscountAmount(businessId) : 0),
    getTotalPrice: () => (businessId ? getTotalPrice(businessId) : 0),
    getTotalQuantity: () => (businessId ? getTotalQuantity(businessId) : 0),
  };
}

// Обратная совместимость селекторов — требуют businessId, используйте useCartForBusiness
export const useCartItems = (businessId: string | null) =>
  useCartStore((s) => (businessId ? s.getItems(businessId) : []));
export const useCartTotalQuantity = (businessId: string | null) =>
  useCartStore((s) => (businessId ? s.getTotalQuantity(businessId) : 0));

/**
 * Хук для проверки гидратации корзины
 */
export function useCartHydration() {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  return isHydrated;
}
