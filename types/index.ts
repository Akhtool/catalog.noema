/**
 * TypeScript типы для модели данных каталога
 * Основаны на /docs/data-model.md
 * Никакой логики, только типы
 */

// ============================================================================
// Серверные сущности (Backend / Supabase)
// ============================================================================

/**
 * Бизнес, владеющий каталогом
 */
export interface Business {
  id: string; // UUID
  slug: string; // публичный URL
  name: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;

  phone: string | null;
  whatsapp: string | null;
  telegram: string | null;

  workingHours: string | null;

  deliveryRegions: string | null; // регионы доставки (например, "Россия / СНГ / Европа")
  cityDelivery: string | null; // информация о доставке по городу (например, "По городу бесплатно")

  createdAt: string; // timestamp (ISO string)
  updatedAt: string; // timestamp (ISO string)
}

/**
 * Категория товаров или услуг
 */
export interface Category {
  id: string; // UUID
  businessId: string; // UUID
  name: string;
  order: number; // порядок отображения
  isActive: boolean;

  createdAt: string; // timestamp (ISO string)
  updatedAt: string; // timestamp (ISO string)
}

/**
 * Товар или услуга в каталоге
 */
export interface Product {
  id: string; // UUID
  businessId: string; // UUID
  categoryId: string; // UUID

  name: string;
  description: string | null;
  price: number;

  images: string[]; // URLs изображений
  brand: string | null;

  inStock: boolean;
  isActive: boolean;

  createdAt: string; // timestamp (ISO string)
  updatedAt: string; // timestamp (ISO string)
}

// ============================================================================
// Клиентские сущности (Client-side only)
// ============================================================================

/**
 * Элемент корзины
 */
export interface CartItem {
  productId: string; // UUID
  name: string;
  price: number;
  quantity: number;
}

/**
 * Корзина пользователя
 */
export interface Cart {
  items: CartItem[];
  comment: string | null;
}

/**
 * Виртуальный заказ, формируемый при оформлении
 */
export interface Order {
  businessId: string; // UUID
  orderNumber: string; // номер заказа

  items: CartItem[];
  totalPrice: number;
  totalQuantity: number;

  comment: string | null;
  createdAt: string; // timestamp (ISO string)
}
