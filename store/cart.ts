/**
 * Zustand store для корзины
 * Основан на /docs/data-model.md
 * Client-side only, без серверной логики
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type { CartItem, Cart, Order, Product, DeliveryType, BusinessLocation } from '@/types';

interface CartStore extends Cart {
  orderNumber: string | null; // номер заказа

  // Actions
  addItem: (product: Product) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setComment: (comment: string | null) => void;
  setPromoCode: (promoCode: string | null) => void;
  setDeliveryType: (type: DeliveryType | null) => void;
  setDeliveryAddress: (address: string | null) => void;
  setSelectedPointId: (pointId: string | null) => void;
  generateOrderNumber: () => string;

  // Computed values (functions)
  getTotalPrice: () => number;
  getTotalQuantity: () => number;

  // Order generation (pickupPoints для подстановки selectedPoint в Order)
  createOrder: (businessId: string, pickupPoints?: BusinessLocation[]) => Order;
}

/**
 * Время жизни корзины в миллисекундах (1 час)
 */
const CART_EXPIRY_TIME = 60 * 60 * 1000; // 1 час

/**
 * Интерфейс для данных, сохраняемых в localStorage
 */
interface StoredCartData {
  items: CartItem[];
  comment: string | null;
  promoCode: string | null;
  deliveryType: DeliveryType | null;
  deliveryAddress: string | null;
  selectedPointId: string | null;
  timestamp: number; // время последнего обновления
}

/**
 * Проверяет, истек ли срок хранения корзины
 */
function isCartExpired(timestamp: number): boolean {
  const now = Date.now();
  return now - timestamp > CART_EXPIRY_TIME;
}

/**
 * Проверяет доступность localStorage
 */
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

/**
 * Кастомный storage для проверки срока годности корзины
 */
const cartStorage = {
  getItem: (name: string): string | null => {
    if (!isLocalStorageAvailable()) {
      return null;
    }
    
    try {
      const item = localStorage.getItem(name);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      const data = parsed.state as Partial<StoredCartData>;
      
      // Если timestamp есть и данные устарели, удаляем их и возвращаем null
      if (data.timestamp && isCartExpired(data.timestamp)) {
        localStorage.removeItem(name);
        return null;
      }
      
      // Удаляем timestamp из данных перед возвратом; добавляем selectedPointId если нет (старые данные)
      if (data.timestamp !== undefined) {
        const { timestamp, ...stateWithoutTimestamp } = data;
        const state = {
          ...stateWithoutTimestamp,
          selectedPointId: stateWithoutTimestamp.selectedPointId ?? null,
        };
        return JSON.stringify({ ...parsed, state });
      }
      
      // Если timestamp отсутствует, возвращаем данные как есть (обратная совместимость)
      return item;
    } catch (error) {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (!isLocalStorageAvailable()) {
      return;
    }
    
    try {
      // С createJSONStorage value всегда будет строкой
      const parsed = JSON.parse(value);
      
      // Проверяем структуру данных от persist middleware
      // Zustand persist сохраняет данные в формате: { state: {...}, version: 0 }
      if (parsed && typeof parsed === 'object' && parsed.state) {
        const stateWithTimestamp = {
          ...parsed,
          state: {
            ...parsed.state,
            timestamp: Date.now(),
          },
        };
        const serialized = JSON.stringify(stateWithTimestamp);
        localStorage.setItem(name, serialized);
      } else {
        // Если формат неожиданный, сохраняем как есть (fallback)
        localStorage.setItem(name, value);
      }
    } catch (error) {
      // Fallback: сохраняем как есть, если парсинг не удался
      try {
        localStorage.setItem(name, value);
      } catch (fallbackError) {
        // Игнорируем ошибку сохранения
      }
    }
  },
  removeItem: (name: string): void => {
    if (!isLocalStorageAvailable()) {
      return;
    }
    
    try {
      localStorage.removeItem(name);
    } catch (error) {
      // Игнорируем ошибку удаления
    }
  },
};

/**
 * Генерирует номер заказа - возрастающее число на основе счетчика в localStorage
 */
function generateOrderNumber(): string {
  const STORAGE_KEY = 'catalog_order_counter';
  
  // Получаем текущий счетчик из localStorage
  let counter = 1;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      counter = parseInt(stored, 10) || 1;
    }
  } catch (error) {
    // Если localStorage недоступен, начинаем с 1
  }
  
  // Увеличиваем счетчик и сохраняем
  const orderNumber = counter.toString();
  try {
    localStorage.setItem(STORAGE_KEY, (counter + 1).toString());
  } catch (error) {
    // Игнорируем ошибку сохранения счетчика
  }
  
  return orderNumber;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      comment: null,
      promoCode: null,
      deliveryType: null,
      deliveryAddress: null,
      selectedPointId: null,
      orderNumber: null,

  // Computed values
  getTotalPrice: () => {
    const state = get();
    return state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  },

  getTotalQuantity: () => {
    const state = get();
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  // Add item to cart
  addItem: (product: Product) => {
    set((state) => {
      const existingItem = state.items.find(
        (item) => item.productId === product.id
      );

      if (existingItem) {
        // Увеличиваем количество, если товар уже в корзине
        return {
          items: state.items.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }

      // Добавляем новый товар
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      };

      return {
        items: [...state.items, newItem],
      };
    });
  },

  // Increase item quantity
  increaseQuantity: (productId: string) => {
    set((state) => {
      const item = state.items.find((item) => item.productId === productId);

      if (!item) {
        return state;
      }

      // Увеличиваем количество
      return {
        items: state.items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      };
    });
  },

  // Decrease item quantity
  decreaseQuantity: (productId: string) => {
    set((state) => {
      const item = state.items.find((item) => item.productId === productId);

      if (!item) {
        return state;
      }

      if (item.quantity <= 1) {
        // Удаляем товар, если количество становится 0
        return {
          items: state.items.filter((item) => item.productId !== productId),
        };
      }

      // Уменьшаем количество
      return {
        items: state.items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        ),
      };
    });
  },

  // Remove item from cart
  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    }));
  },

  // Clear entire cart
  clearCart: () => {
    set({
      items: [],
      comment: null,
      promoCode: null,
      deliveryType: null,
      deliveryAddress: null,
      selectedPointId: null,
      orderNumber: null,
    });
  },

  // Generate order number
  generateOrderNumber: () => {
    const orderNumber = generateOrderNumber();
    set({ orderNumber });
    return orderNumber;
  },

  // Set order comment
  setComment: (comment: string | null) => {
    set({ comment });
  },

  // Set promo code
  setPromoCode: (promoCode: string | null) => {
    set({ promoCode });
  },

  // Set delivery type
  setDeliveryType: (deliveryType: DeliveryType | null) => {
    set({ deliveryType });
    if (deliveryType !== "delivery") {
      set({ deliveryAddress: null });
    }
    // Очищаем точку при переходе на доставку
    if (deliveryType === "delivery") {
      set({ selectedPointId: null });
    }
  },

  setSelectedPointId: (selectedPointId: string | null) => {
    set({ selectedPointId });
  },

  // Set delivery address
  setDeliveryAddress: (deliveryAddress: string | null) => {
    set({ deliveryAddress });
  },

  // Create Order object for message generation (pure: no set() — do not call during render)
  createOrder: (businessId: string, pickupPoints?: BusinessLocation[]): Order => {
    const state = get();
    const orderNumber = state.orderNumber ?? generateOrderNumber();
    const selectedPoint =
      state.selectedPointId && pickupPoints?.length
        ? pickupPoints.find((p) => p.id === state.selectedPointId) ?? null
        : null;
    return {
      businessId,
      orderNumber,
      items: state.items,
      totalPrice: state.getTotalPrice(),
      totalQuantity: state.getTotalQuantity(),
      comment: state.comment,
      promoCode: state.promoCode,
      deliveryType: state.deliveryType,
      deliveryAddress: state.deliveryAddress,
      selectedPointId: state.selectedPointId,
      selectedPoint: selectedPoint ?? null,
      createdAt: new Date().toISOString(),
    };
  },
    }),
    {
      name: 'catalog-cart-storage', // ключ в localStorage
      storage: createJSONStorage(() => cartStorage), // используем кастомный storage с проверкой срока годности
      // Сохраняем только данные корзины, не сохраняем номер заказа
      partialize: (state) => ({
        items: state.items,
        comment: state.comment,
        promoCode: state.promoCode,
        deliveryType: state.deliveryType,
        deliveryAddress: state.deliveryAddress,
        selectedPointId: state.selectedPointId,
      }),
      // В Zustand v5 persist автоматически сохраняет изменения
      // Не используем skipHydration, чтобы данные восстанавливались автоматически
    }
  )
);

// Селекторы для удобного использования в компонентах
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartComment = () => useCartStore((state) => state.comment);
export const useCartTotalPrice = () =>
  useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
export const useCartTotalQuantity = () =>
  useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

/**
 * Хук для проверки гидратации корзины
 * В Zustand v5 persist автоматически гидратирует состояние, но может потребоваться время
 */
export function useCartHydration() {
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    // В Zustand v5 persist автоматически гидратирует состояние при монтировании
    // Просто отмечаем, что компонент смонтирован
    setIsHydrated(true);
  }, []);
  
  return isHydrated;
}
