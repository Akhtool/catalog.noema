# План разделения состояния по бизнесам

Состояние, которое должно быть **отдельным для каждого бизнеса**, сейчас общее на всё приложение. При переходе между витринами (A → B) данные A «утекают» в контекст B: скидки, фильтры, точки доставки, нумерация заказов.

План рассчитан на пошаговое выполнение. Каждый этап — отдельный запрос к Cursor. Выполняй по порядку.

**Предварительно:** обновить `docs/product-contract.md` и `docs/data-model.md` — явно зафиксировать, что корзина, фильтры и нумерация заказов привязаны к бизнесу.

---

## Сводка проблем

| Сущность | Текущее состояние | Ожидаемое |
|----------|-------------------|-----------|
| Корзина (items, promo, delivery, comment, point) | Один store, один localStorage | Отдельная корзина на каждый businessId |
| Фильтры каталога | Один store, categoryId/brands от A применяются к B | Отдельные фильтры на каждый businessId |
| Номер заказа | Один счётчик `catalog_order_counter` | Отдельный счётчик на businessId |
| CartBottomBar | Показывает totalQuantity всех товаров | Только товары текущего бизнеса |

---

## Этап 1. Корзина: структура и хранение по бизнесу

**Цель:** корзина хранится по `businessId`; при смене витрины показывается только корзина текущего бизнеса.

### 1.1 Модель данных

**`types/index.ts`:**
- `CartItem`: добавить `businessId: string` (UUID бизнеса).
- `Cart`: структура без изменений (items содержат businessId).
- Хранилище: `Record<businessId, CartData>` или `cartByBusinessId: Record<string, CartSlice>`.

**`CartSlice`** (новый тип) — данные корзины для одного бизнеса:

```ts
interface CartSlice {
  items: CartItem[];        // уже с businessId в каждом item
  comment: string | null;
  promoCode: string | null;
  appliedPromo: AppliedPromo | null;  // AppliedPromo с businessId (см. promo-bugs-fix-plan)
  promoError: string | null;
  deliveryType: DeliveryType | null;
  deliveryAddress: string | null;
  selectedPointId: string | null;
}
```

**Примечание:** `AppliedPromo` — добавить `businessId` (из `promo-bugs-fix-plan.md` этап 1).

### 1.2 Store (`store/cart.ts`)

- **State:** `cartByBusinessId: Record<string, CartSlice>` (или `Map`).
- **Partialize:** сохранять весь объект `cartByBusinessId` в `catalog-cart-storage`.
- **Actions:** все методы принимают `businessId` (явно или из контекста):
  - `addItem(product)` — брать `product.businessId`, добавлять в срез этого бизнеса.
  - `getItems(businessId)`, `getSubtotal(businessId)`, `getDiscountAmount(businessId)` и т.п.
  - `applyPromo(businessId, promo)`, `clearPromo(businessId)`, `setDeliveryType(businessId, ...)` и т.д.
- **Селекторы:** добавить `useCartForBusiness(businessId)` или передавать `businessId` в хук из `useCurrentBusinessStore`.

### 1.3 UI

- **CartDrawer, CartBottomBar, product-card, product-detail-card:** получать `businessId` из `useCurrentBusinessStore` и использовать только корзину этого бизнеса.
- **CartBottomBar:** `totalQuantity` — только для текущего `business.id`.
- **CheckoutDialog:** работает с корзиной текущего бизнеса (уже через `business`).

### 1.4 Обратная совместимость (миграция)

- При гидрации: если в localStorage старый формат (плоский `items` без `cartByBusinessId`), попытаться мигрировать:
  - items без businessId — либо отбросить, либо привязать к «неизвестному» ключу. Рекомендация: отбросить при миграции.
  - Либо показать однократное предупреждение и очистить старую корзину.

**Подсказка для Cursor:**  
«Переведи корзину на хранение по businessId: структура cartByBusinessId, CartItem с businessId, все actions принимают businessId. Обнови CartDrawer, CartBottomBar, product-card, product-detail-card, checkout-dialog для работы с корзиной текущего бизнеса из useCurrentBusinessStore.»

---

## Этап 2. Номер заказа — счётчик по бизнесу

**Проблема:** `catalog_order_counter` один на всё приложение. Бизнес A и B получают общую нумерацию.

**Что сделать:**
- В `store/cart.ts` функция `generateOrderNumber(businessId: string)`:
  - Ключ: `catalog_order_counter_${businessId}`.
  - Логика та же: чтение, инкремент, запись.

**Подсказка для Cursor:**  
«Сделай счётчик номера заказа отдельным для каждого бизнеса: localStorage ключ catalog_order_counter_${businessId}.»

---

## Этап 3. Фильтры каталога — отдельные для каждого бизнеса

**Проблема:** У каждого бизнеса свои категории и бренды. `selectedCategoryId`, `selectedBrands` — бизнес-специфичны. При переходе A → B фильтры A не должны применяться к каталогу B. При возврате на A пользователь должен видеть свои прежние фильтры.

**Цель:** Хранить фильтры по `businessId`; при смене витрины подставлять срез для текущего бизнеса.

**Что сделать:**

1. **Store** (`store/catalog-filters.ts`):
   - **State:** `filtersByBusinessId: Record<string, CatalogFiltersState>`.
   - Все actions принимают `businessId` первым аргументом: `setSearchQuery(businessId, query)`, `setSelectedCategoryId(businessId, id)`, `toggleBrand(businessId, brand)` и т.д.
   - При отсутствии среза для businessId — использовать дефолтное значение (пустые фильтры).
   - Без persist (фильтры живут в сессии, перезагрузка сбрасывает).

2. **BusinessProvider** (`components/business-provider.tsx`):
   - Убрать вызов `resetFilters()` при смене бизнеса (фильтры переключаются по businessId, а не сбрасываются).

3. **UI** (catalog.tsx, filters-sheet.tsx, search-input.tsx, category-list.tsx, view-toggle.tsx, catalog-mode-toggle.tsx):
   - Получать `businessId` из `useCurrentBusinessStore`.
   - Вызывать все actions с `businessId`: `setSearchQuery(business.id, ...)`, `setSelectedCategoryId(business.id, ...)` и т.д.
   - Селекторы: использовать `filtersByBusinessId[businessId] ?? DEFAULT_FILTERS` для отображения.

**Подсказка для Cursor:**  
«Переведи фильтры каталога на хранение по businessId: структура filtersByBusinessId, все actions принимают businessId. Обнови catalog.tsx, filters-sheet, search-input, category-list, view-toggle, catalog-mode-toggle — получать businessId из useCurrentBusinessStore и передавать в actions. Убери resetFilters из BusinessProvider.»

---

## Этап 4. Промокоды (интеграция с promo-bugs-fix-plan)

- **minOrder:** в `getDiscountAmount(businessId)` учитывать `appliedPromo.minOrder`.
- **Валидация после гидрации:** при открытии drawer проверять `validatePromo` для текущего бизнеса.

---

## Этап 5. Проверка createOrder и сообщений

- `createOrder(businessId, pickupPoints)` — только товары текущего бизнеса.
- `selectedPointId` и `pickupPoints` относятся к одному бизнесу.

---

## Этап 6. Итоговое тестирование

1. A → товары, промо → B → корзина B пуста.
2. A → фильтр по категории → B → фильтры B пусты; вернуться на A → фильтры A сохранены.
3. Заказ у A #1, заказ у B #1 (разная нумерация).
4. Перезагрузка → корзина восстанавливается по бизнесу.
5. selectedPointId от A не применяется к B.

---

## Изменяемые файлы (сводка)

| Файл | Этапы |
|------|-------|
| `types/index.ts` | 1 |
| `store/cart.ts` | 1, 2, 4, 5 |
| `store/catalog-filters.ts` | 3 |
| `components/business-provider.tsx` | 3 |
| `components/catalog/*` (catalog.tsx, filters-sheet, search-input, category-list, view-toggle, catalog-mode-toggle) | 3 |
| `components/cart/*` | 1, 4, 5 |
| `components/catalog/product-card.tsx`, `product-detail-card.tsx` | 1 |
| `docs/product-contract.md`, `docs/data-model.md` | предварительно |
