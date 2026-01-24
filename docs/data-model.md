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

```ts
Business {
  id: UUID
  slug: string              // публичный URL
  name: string
  description: string
  logoUrl: string | null
  coverUrl: string | null

  phone: string | null
  whatsapp: string | null
  telegram: string | null

  workingHours: string | null

  deliveryRegions: string | null    // регионы доставки (например, "Россия / СНГ / Европа")
  cityDelivery: string | null       // информация о доставке по городу (например, "По городу бесплатно")

  deliveryTypes: ("delivery" | "pickup" | "dine-in")[]   // доступные способы получения заказа (из Supabase delivery_types)

  createdAt: timestamp
  updatedAt: timestamp
}
Примечания:

slug используется для публичной страницы каталога.

Один Business = один каталог (V1).

### 2.2 Category

Категория товаров или услуг.

Category {
  id: UUID
  businessId: UUID
  name: string
  order: number             // порядок отображения
  isActive: boolean

  createdAt: timestamp
  updatedAt: timestamp
}

Примечания:

Категории принадлежат одному Business.

Используются для навигации и фильтрации.

2.3 Product

Товар или услуга в каталоге.

Product {
  id: UUID
  businessId: UUID
  categoryId: UUID

  name: string
  description: string | null
  price: number

  images: string[]          // URLs изображений
  brand: string | null

  inStock: boolean
  isActive: boolean

  createdAt: timestamp
  updatedAt: timestamp
}

Примечания:

Product всегда принадлежит Business и Category.

Используется в каталоге, фильтрах и корзине.

3. Клиентские сущности (Client-side only)
3.1 CartItem

Элемент корзины.

CartItem {
  productId: UUID
  name: string
  price: number
  quantity: number
}

Примечания:

Хранится только в состоянии клиента.

Дублирует часть данных Product для стабильности заказа.

3.2 Cart

Корзина пользователя.

Cart {
  items: CartItem[]
  comment: string | null
}

Примечания:

Корзина не сохраняется в базе данных.

Может храниться в памяти или localStorage.

3.3 Order (виртуальный)

Виртуальный заказ, формируемый при оформлении.
Order {
  businessId: UUID

  items: CartItem[]
  totalPrice: number
  totalQuantity: number

  comment: string | null
  createdAt: timestamp
}
Примечания:

Не является сущностью продаж.

Используется для генерации текста сообщения.

Не сохраняется на сервере.

4. Связи между сущностями
Business 1 ──── * Category
Business 1 ──── * Product
Category 1 ──── * Product
Cart и Order не имеют связей с базой данных.

Все публичные данные запрашиваются через Business → Category → Product.

5. Фильтрация и поиск

Фильтрация реализуется на клиенте или через query backend:

по категории

по бренду

по цене

по наличию

по текстовому поиску (name, description)

6. Аналитика (V1)

Минимально поддерживаемые события:

просмотр каталога

просмотр товара

добавление в корзину

клик по кнопке «Оформить заказ»

⚠️ Хранение событий аналитики допускается отдельно и не влияет на core-модель.

7. Что намеренно НЕ входит в модель

платежи

статусы заказов

пользователи-клиенты

роли и доступы

складские остатки

комиссии

Все перечисленное относится к V2+.

Примечание: информация о доставке (deliveryRegions, cityDelivery) хранится как текстовые поля в Business для отображения на странице каталога. Это не полноценная система управления доставкой.

8. Эволюция модели (будущее)

Допускается добавление:

Order как серверной сущности

Customer (опционально)

несколько каталогов на Business

роли пользователей

расширенная аналитика

Любые изменения модели требуют обновления:

product-contract.md

данного файла data-model.md

9. Статус документа

Этот документ является обязательным для соблюдения.
Код, не соответствующий данной модели данных, считается ошибочным.