# Data Model

Документ описывает модель данных продукта «Каталог».
Является обязательным источником истины для frontend, backend и Supabase.
Основан на `product-contract.md`.

---

## 1. Общие принципы модели данных

- В базе данных хранятся **только данные каталога**.
- Корзина и заказ **не сохраняются** в базе данных.
- Заказ является виртуальным объектом и используется только для генерации сообщения.
- Клиенты не имеют аккаунтов.
- Все сущности привязаны к бизнесу (Business).

---

## 2. Серверные сущности (Backend / Supabase)

### 2.1 Business

Описывает бизнес, владеющий каталогом.

**Назначение:** Хранит информацию о бизнесе, его контакты, настройки доставки и визуальное оформление.

**Ключевые поля:** `id`, `slug` (публичный URL), `name`, `logo_url`, `cover_url`, `theme_brand_hsl`

```ts
Business {
  id: UUID
  slug: string              // публичный URL
  name: string
  description: string
  logo_url: string | null   // URL логотипа (1:1)
  cover_url: string | null  // URL обложки (4:1)

  /**
   * Акцентный цвет каталога (визуальное оформление).
   * Формат: HSL-триплет без hsl(): "48 100% 50%".
   * Если null — используется дефолтная тема приложения.
   */
  theme_brand_hsl: string | null
  /**
   * Цвет текста на акцентном фоне (для читаемости).
   * Допустимые значения: "black" | "white".
   * Если null — может рассчитываться на фронтенде (по контрасту) или использоваться дефолт.
   */
  theme_brand_foreground: "black" | "white" | null

  phone: string | null
  whatsapp: string | null          // основной WhatsApp, fallback при отсутствии номера по способу
  whatsappDelivery: string | null  // WhatsApp для заказов с доставкой (опционально)
  whatsappPickup: string | null    // WhatsApp для самовывоза (опционально)
  whatsappDineIn: string | null    // WhatsApp для заказа в зале (опционально)
  telegram: string | null

  workingHours: string | null

  deliveryRegions: string | null    // регионы доставки (например, "Россия / СНГ / Европа")
  cityDelivery: string | null       // информация о доставке по городу (например, "По городу бесплатно")

  deliveryTypes: ("delivery" | "pickup" | "dine-in")[]   // доступные способы получения заказа (из Supabase delivery_types)

  // Промокод (один активный на бизнес)
  promo_enabled: boolean       // включён ли промокод
  promo_code: string | null    // код (например "SALE10"); сравнение без учёта регистра
  promo_type: "percent" | "fixed" | null   // тип скидки
  promo_value: numeric | null  // процент (1–100) или сумма в рублях
  promo_min_order: numeric | null   // минимальная сумма заказа для применения (руб)
  promo_date_from: date | null     // начало периода; null = без ограничения
  promo_date_to: date | null       // конец периода; null = без ограничения
  // Срок действия промо (date_from/date_to) проверяется по локальной дате на устройстве клиента.
  promo_max_discount: numeric | null  // макс. сумма скидки для percent (руб); null = без лимита

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Примечания:**

- `slug` используется для публичной страницы каталога.
- Промокод: при включённом `promo_enabled` клиент вводит код в корзине; при совпадении и соблюдении периода/минимума заказа применяется скидка. Расчёт только на клиенте.
- Один Business = один каталог (V1).
- `theme_brand_hsl` и `theme_brand_foreground` влияют только на оформление публичного каталога и не меняют бизнес-логику.

### 2.2 BusinessLocation (филиал/точка)

Точка самовывоза или зал (для способов получения «Самовывоз» и «В зале»).

**Назначение:** Хранение адресов и опциональных контактов по точкам одного бизнеса; выбор точки влияет на текст сообщения заказа и на контакт для связи (WhatsApp/Telegram/телефон).

**Ключевые поля:** `id`, `business_id`, `title`, `address`, `phone`, `whatsapp`, `telegram`, `order_position`, `is_active`

```ts
BusinessLocation {
  id: UUID
  business_id: UUID           // FK -> business(id) ON DELETE CASCADE
  title: string               // название точки (например "ТЦ Афимолл", "Ул. Пушкина")
  address: string | null      // адрес для самовывоза/в зале
  phone: string | null        // контакт точки (если свой)
  whatsapp: string | null
  telegram: string | null
  order_position: number      // порядок отображения (default 0)
  is_active: boolean          // показывать в выборе при оформлении (false = скрыт)
  created_at: timestamp
  updated_at: timestamp
}
```

**Примечания:**

- При отсутствии точек или одной точке выбор в checkout можно не показывать (подставлять единственную или контакт бизнеса).
- Контакты точки используются для deep-link при отправке заказа; если не заданы — используются контакты Business.
- `is_active = false`: точка не показывается в выборе при оформлении (например, на ремонте или временно закрыта).

### 2.3 Category

Категория товаров или услуг.

**Назначение:** Группировка товаров по типам для навигации и фильтрации.

**Ключевые поля:** `id`, `business_id`, `name`, `order`, `is_active`

```ts
Category {
  id: UUID
  business_id: UUID
  name: string
  order: number             // порядок отображения
  is_active: boolean

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Примечания:**

- Категории принадлежат одному Business.
- Используются для навигации и фильтрации.

### 2.4 Brand

Бренд товаров.

**Назначение:** Хранит список брендов, используемых в товарах бизнеса.

**Ключевые поля:** `id`, `business_id`, `name`, `is_active`

```ts
Brand {
  id: UUID
  business_id: UUID
  name: string
  is_active: boolean       // мягкое удаление (default true)

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Примечания:**

- Бренды принадлежат одному Business.
- Используются для фильтрации товаров.
- Бренды не удаляются физически, используется мягкое удаление через `is_active`.
- Нельзя деактивировать бренд, если есть активные товары с этим брендом.

### 2.5 Product

Товар или услуга в каталоге.

**Назначение:** Основная сущность каталога, содержит информацию о товаре.

**Ключевые поля:** `id`, `business_id`, `category_id`, `brand_id`, `name`, `subtitle`, `price`, `in_stock`, `is_active`, `order`

```ts
Product {
  id: UUID
  business_id: UUID
  category_id: UUID
  brand_id: UUID | null

  name: string
  subtitle: string | null  // подзаголовок товара (размер, объём, вариант)
  description: string | null
  price: number

  has_discount: boolean    // есть скидка — показывать оригинальную цену зачёркнутой
  original_price: numeric  // оригинальная цена до скидки; только при has_discount=true
  discount_date_from: date // начало периода скидки; null = без ограничения
  discount_date_to: date   // конец периода скидки; null = без ограничения

  in_stock: boolean
  is_active: boolean
  order: number             // порядок отображения в каталоге (настраивается админом)

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Примечания:**

- Product всегда принадлежит Business и Category.
- `brand_id` опционален, ссылается на Brand.
- `has_discount` и `original_price`: при скидке показывается `original_price` зачёркнутой, `price` — итоговая. Процент скидки рассчитывается на фронте.
- `discount_date_from` и `discount_date_to`: опционально. Если заданы — скидка отображается только когда текущая дата входит в период.
- `order` задаётся админом; при создании товара присваивается max(order)+1 в рамках бизнеса.
- Изображения хранятся в таблице `product_image`.
- Используется в каталоге, фильтрах и корзине.

### 2.6 ProductImage

Изображение товара.

**Назначение:** Хранит изображения товаров с поддержкой порядка отображения.

**Ключевые поля:** `id`, `product_id`, `url`, `position`

```ts
ProductImage {
  id: UUID
  product_id: UUID
  url: string              // URL изображения
  position: number         // порядок отображения (обязательное, 0 = главное фото)

  created_at: timestamp
  updated_at: timestamp
}
```

**Примечания:**

- Изображения принадлежат одному Product.
- `position` — обязательное поле, определяет порядок отображения изображений.
- Первое изображение (position = 0) используется как главное фото и карточка товара.
- Минимум одно изображение на товар.

### 2.7 Profile

Профиль пользователя.

**Назначение:** Хранит данные пользователя системы (владельцы бизнесов).

**Ключевые поля:** `id` (связь с auth.users), `email`, `full_name`

```ts
Profile {
  id: UUID                 // связь с auth.users.id
  email: string
  full_name: string | null
  avatar_url: string | null

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Примечания:**

- Связывается с Supabase Auth через `id`.
- Используется для управления бизнесами через `business_user`.

### 2.8 BusinessUser

Связь пользователя с бизнесом.

**Назначение:** Определяет владельцев и доступы к бизнесам.

**Ключевые поля:** `id`, `business_id`, `user_id`, `role`

```ts
BusinessUser {
  id: UUID
  business_id: UUID
  user_id: UUID            // связь с profile.id
  role: "owner" | "admin"  // роль пользователя

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Примечания:**

- Связывает Profile с Business.
- `role`: `owner` — владелец бизнеса (полный доступ), `admin` — администратор (расширенные права).
- В текущей версии используется только роль `owner`.
- Один пользователь может иметь доступ к нескольким бизнесам.

## 3. Клиентские сущности (Client-side only)

### 3.1 CartItem

Элемент корзины.

CartItem {
  productId: UUID
  businessId: UUID   // бизнес, которому принадлежит товар
  name: string
  price: number
  quantity: number
}

Примечания:

Хранится только в состоянии клиента.

Дублирует часть данных Product для стабильности заказа.

### 3.2 Cart

Корзина пользователя. **Отдельная на каждый бизнес** (cartByBusinessId: Record<businessId, CartSlice>).

CartSlice {
  items: CartItem[]
  comment: string | null
  promoCode: string | null        // введённый код (для отображения и сообщения)
  appliedPromo: AppliedPromo | null  // применённый промокод (для расчёта скидки)
  promoError: string | null        // сообщение об ошибке при применении
  deliveryType: DeliveryType | null
  deliveryAddress: string | null
  selectedPointId: string | null   // UUID точки (BusinessLocation), для pickup/dine-in
}

// Данные применённого промокода (из настроек бизнеса, после успешной проверки)
AppliedPromo {
  code: string
  type: "percent" | "fixed"
  value: number
  minOrder: number | null
  maxDiscount: number | null   // только для percent
  businessId: UUID             // бизнес, для которого применён промо
}

Примечания:

Корзина не сохраняется в базе данных.

Может храниться в памяти или localStorage.

Корзина хранится по businessId; при переходе на витрину другого бизнеса отображается только его корзина.

### 3.3 Order (виртуальный)

Виртуальный заказ, формируемый при оформлении.
Order {
  businessId: UUID
  orderNumber: string

  items: CartItem[]
  subtotal: number        // сумма товаров до скидки
  discountAmount: number  // скидка по промокоду (0 если не применён)
  totalPrice: number     // итог к оплате (subtotal - discountAmount)
  totalQuantity: number

  comment: string | null
  promoCode: string | null
  deliveryType: DeliveryType | null
  deliveryAddress: string | null
  selectedPointId: string | null   // выбранная точка (для текста сообщения и контакта)
  selectedPoint: BusinessLocation | null  // данные точки (для генерации сообщения)
  createdAt: timestamp
}
Примечания:

Не является сущностью продаж.

Используется для генерации текста сообщения.

Не сохраняется на сервере.

## 4. Связи между сущностями

### Основные связи:

- `Business 1 ──── * BusinessLocation` (business_id)
- `Business 1 ──── * Category` (business_id)
- `Business 1 ──── * Brand` (business_id)
- `Business 1 ──── * Product` (business_id)
- `Business 1 ──── * BusinessUser` (business_id)
- `Category 1 ──── * Product` (category_id)
- `Brand 1 ──── * Product` (brand_id, опционально)
- `Product 1 ──── * ProductImage` (product_id)
- `Profile 1 ──── * BusinessUser` (user_id)

### Схема связей:

```
Business
  ├── BusinessLocation (1:N)   // филиалы/точки для самовывоза и «В зале»
  ├── Category (1:N)
  ├── Brand (1:N)
  ├── Product (1:N)
  │     ├── Brand (N:1, опционально)
  │     ├── Category (N:1)
  │     └── ProductImage (1:N)
  └── BusinessUser (1:N)
        └── Profile (N:1)
```

**Примечания:**

- Cart и Order не имеют связей с базой данных.
- Все публичные данные запрашиваются через Business → Category → Product.
- Изображения товаров получаются через Product → ProductImage.

## 5. Фильтрация и поиск

Фильтрация реализуется на клиенте или через query backend:

- по категории (category_id)
- по бренду (brand_id)
- по цене (price)
- по наличию (in_stock)
- по скидке (has_discount) — «Товары со скидкой»
- по текстовому поиску (name, description)

## 6. Аналитика (V1)

Минимально поддерживаемые события:

- просмотр каталога
- просмотр товара
- добавление в корзину
- клик по кнопке «Оформить заказ»

⚠️ Хранение событий аналитики допускается отдельно и не влияет на core-модель.

## 7. Что намеренно НЕ входит в модель

- платежи
- статусы заказов
- пользователи-клиенты
- роли и доступы
- складские остатки
- комиссии

Все перечисленное относится к V2+.

Примечание: информация о доставке (deliveryRegions, cityDelivery) хранится как текстовые поля в Business для отображения на странице каталога. Это не полноценная система управления доставкой.

## 8. Эволюция модели (будущее)

Допускается добавление:

- Order как серверной сущности
- Customer (опционально)
- несколько каталогов на Business
- роли пользователей
- расширенная аналитика

Любые изменения модели требуют обновления:

product-contract.md

данного файла data-model.md

## 9. Статус документа

Этот документ является обязательным для соблюдения.
Код, не соответствующий данной модели данных, считается ошибочным.

## 10. Статус модели данных

Модель данных соответствует требованиям V2 админки. Реализованы таблицы для управления бизнесами, товарами, категориями, брендами и изображениями. Поддерживается система ролей через `business_user` и мягкое удаление брендов. Модель готова для использования в админ-панели и публичном каталоге.