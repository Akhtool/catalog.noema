/**
 * Zustand store для корзины
 * Основан на /docs/data-model.md
 * Client-side only, без серверной логики
 */

import { create } from 'zustand';
import type { CartItem, Cart, Order, Product } from '@/types';

interface CartStore extends Cart {
  // Actions
  addItem: (product: Product) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setComment: (comment: string | null) => void;

  // Computed values (functions)
  getTotalPrice: () => number;
  getTotalQuantity: () => number;

  // Order generation
  createOrder: (businessId: string) => Order;
}

export const useCartStore = create<CartStore>((set, get) => ({
  // Initial state
  items: [],
  comment: null,

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
    });
  },

  // Set order comment
  setComment: (comment: string | null) => {
    set({ comment });
  },

  // Create Order object for message generation
  createOrder: (businessId: string): Order => {
    const state = get();
    return {
      businessId,
      items: state.items,
      totalPrice: state.getTotalPrice(),
      totalQuantity: state.getTotalQuantity(),
      comment: state.comment,
      createdAt: new Date().toISOString(),
    };
  },
}));

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
