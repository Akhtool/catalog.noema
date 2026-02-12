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

  /**
   * Акцентный цвет каталога (визуальное оформление).
   * Формат: HSL-триплет без hsl(): "48 100% 50%".
   * null = дефолтная тема приложения.
   */
  themeBrandHsl: string | null;
  /**
   * Цвет текста на акцентном фоне (для читаемости).
   * null = дефолт/расчёт на фронтенде.
   */
  themeBrandForeground: "black" | "white" | null;

  phone: string | null;
  whatsapp: string | null; // основной WhatsApp, fallback
  /** WhatsApp для доставки; если null — используется whatsapp */
  whatsappDelivery: string | null;
  /** WhatsApp для самовывоза; если null — используется whatsapp */
  whatsappPickup: string | null;
  /** WhatsApp для заказа в зале; если null — используется whatsapp */
  whatsappDineIn: string | null;
  telegram: string | null;

  workingHours: string | null;

  deliveryRegions: string | null; // регионы доставки (например, "Россия / СНГ / Европа")
  cityDelivery: string | null; // информация о доставке по городу (например, "По городу бесплатно")

  /** Доступные способы получения заказа (из Supabase delivery_types). Если пусто — считаем все три. */
  deliveryTypes: DeliveryType[];

  /** Точки/филиалы для самовывоза и «В зале». Загружаются отдельно (business_location). */
  pickupPoints?: BusinessLocation[];

  /** Настройки промокода (один активный на бизнес). */
  promo?: BusinessPromo | null;

  createdAt: string; // timestamp (ISO string)
  updatedAt: string; // timestamp (ISO string)
}

/**
 * Настройки промокода бизнеса (из БД).
 */
export interface BusinessPromo {
  enabled: boolean;
  code: string | null;
  type: "percent" | "fixed" | null;
  value: number | null;
  minOrder: number | null;
  dateFrom: string | null; // yyyy-MM-dd
  dateTo: string | null;
  maxDiscount: number | null;
}

/**
 * Применённый промокод (после успешной проверки), для расчёта скидки в корзине.
 */
export interface AppliedPromo {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number | null;
  maxDiscount: number | null;
  /** UUID бизнеса, для которого применён промо */
  businessId: string;
}

/**
 * Филиал/точка бизнеса (самовывоз, в зале)
 */
export interface BusinessLocation {
  id: string;
  businessId: string;
  title: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  telegram: string | null;
  orderPosition: number;
  /** Показывать в выборе при оформлении заказа (false = скрыт, например на ремонте) */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Бренд товаров (привязан к business)
 */
export interface Brand {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

  /** Есть скидка — показывать оригинальную цену зачёркнутой */
  hasDiscount: boolean;
  /** Оригинальная цена до скидки; используется только при hasDiscount */
  originalPrice: number | null;
  /** Начало периода скидки (yyyy-MM-dd); null = без ограничения */
  discountDateFrom: string | null;
  /** Конец периода скидки (yyyy-MM-dd); null = без ограничения */
  discountDateTo: string | null;

  images: string[]; // URLs изображений
  brand: string | null;

  inStock: boolean;
  isActive: boolean;
  /** Порядок отображения в каталоге (настраивается админом) */
  order: number;

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
  businessId: string; // UUID бизнеса
  name: string;
  price: number;
  quantity: number;
  /** Оригинальная цена до скидки; показывается зачёркнутой, если задана */
  originalPrice?: number | null;
}

/**
 * Данные корзины для одного бизнеса
 */
export interface CartSlice {
  items: CartItem[];
  comment: string | null;
  promoCode: string | null;
  appliedPromo: AppliedPromo | null;
  promoError: string | null;
  deliveryType: DeliveryType | null;
  deliveryAddress: string | null;
  selectedPointId: string | null;
}

/**
 * Способ получения заказа
 */
export type DeliveryType = "delivery" | "pickup" | "dine-in";

/**
 * Корзина пользователя
 */
export interface Cart {
  items: CartItem[];
  comment: string | null;
  promoCode: string | null;
  /** Применённый промокод (для расчёта скидки). */
  appliedPromo: AppliedPromo | null;
  /** Сообщение об ошибке при применении промокода. */
  promoError: string | null;
  deliveryType: DeliveryType | null;
  deliveryAddress: string | null;
  /** ID выбранной точки (BusinessLocation) для pickup/dine-in */
  selectedPointId: string | null;
}

/**
 * Виртуальный заказ, формируемый при оформлении
 */
export interface Order {
  businessId: string; // UUID
  orderNumber: string; // номер заказа

  items: CartItem[];
  /** Сумма товаров до скидки по промокоду. */
  subtotal: number;
  /** Скидка по промокоду (0 если не применён). */
  discountAmount: number;
  /** Итог к оплате (subtotal - discountAmount). */
  totalPrice: number;
  totalQuantity: number;

  comment: string | null;
  promoCode: string | null;
  deliveryType: DeliveryType | null;
  deliveryAddress: string | null;
  /** Выбранная точка для pickup/dine-in (для текста сообщения и контакта) */
  selectedPointId: string | null;
  selectedPoint: BusinessLocation | null;
  createdAt: string; // timestamp (ISO string)
}
