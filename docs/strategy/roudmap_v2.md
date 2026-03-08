# 📍 ROADMAP V2 — Catalog Platform (Admin-first, UI Overlay)

## 🧠 Базовые принципы проекта (ОБЯЗАТЕЛЬНО)

1. **Public UI = основа продукта**
   - Каталог, карточки товаров, фильтры уже существуют
   - Public UI НЕ дублируется в админке

2. **Admin UI = Public UI + edit-слой**
   - Нет отдельной “админ-версии каталога”
   - Админ видит ту же страницу, что и пользователь
   - Отличие — кнопки редактирования, модалки, действия

3. **UI появляется только после данных и доступа**
   - Сначала: таблицы и связи
   - Потом: RLS и ownership
   - Потом: server actions
   - Потом: UI
   - В конце: UX polish

4. **Один этап = один смысл**
   - Никаких “заодно”
   - Минимальный рабочий UI
   - Без преждевременного улучшательства

---

## ✅ ЭТАП 1 — Data Model V2 (ЗАВЕРШЁН)

**Цель:** подготовить модель данных под Admin и масштабирование.

### Реализовано
- Таблицы:
  - business
  - category
  - product
  - brand
  - product_image
  - profile
  - business_user
- Обновления:
  - product.brand_id
  - product.subtitle
  - business.logo_url
  - business.cover_url
  - business.yandex_metrika
- Soft delete (`is_active`)
- Внешние ключи и индексы
- Триггеры `updated_at`
- `reference/data-model.md`
- `v2_data_model.sql`

📌 UI на этом этапе **НЕ ДЕЛАЕТСЯ**.

---

## ✅ ЭТАП 2 — Auth + Ownership (ЗАВЕРШЁН)

**Цель:** определить, кто и что может редактировать.

### Реализовано
- Supabase Auth
- Таблица `profile`
- Таблица `business_user`
- Роли: `owner`, `admin`
- RLS политики:
  - public read
  - owner/admin write
- Проверка доступа через `EXISTS`
- `v2_auth.sql`
- Guard на `/admin`

📌 Безопасность считается зафиксированной.  
📌 RLS меняется ТОЛЬКО через новые миграции.

---

## ✅ ЭТАП 3 — Business Admin Overlay (ЗАВЕРШЁН)

**Цель:** сделать бизнес-профиль редактируемым поверх public UI.

### UI-модель
- Используется та же страница каталога
- Админ получает:
  - ✏️ кнопки
  - модалки
  - формы

### 3.1 Базовое редактирование (ГОТОВО)
- name
- description
- contacts (phone / whatsapp / telegram)
- yandex_metrika
- Server Actions
- RLS-проверки

### 3.2 Media (ГОТОВО)
- Логотип (1:1)
- Обложка (4:1)
- Загрузка в Supabase Storage
- Сохранение `logo_url`, `cover_url`
- Preview
- (Опционально) crop — на этапе 8 (Media UX)

📌 Никаких новых страниц. Всё поверх public UI.

---

## ✅ ЭТАП 4 — Brand Manager (ЗАВЕРШЁН)

**Цель:** управляемые бренды товаров.

### Data / Logic
- CRUD брендов
- Soft delete (`is_active`)
- Привязка к business

### UI (overlay)
- Модалка “Бренды”
- Список брендов
- ➕ добавить
- ✏️ переименовать
- 🗑️ деактивировать

### Использование
- В Product Editor
- В фильтрах каталога

📌 Отдельной страницы каталога не создаётся.

---

## ✅ ЭТАП 5 — Category Manager (ЗАВЕРШЁН)

**Цель:** управление структурой каталога.

### Data / Logic
- CRUD категорий
- Сортировка
- `is_active`
- Привязка к business

### UI (overlay)
- Модалка категорий
- ➕ добавить
- ✏️ редактировать
- (Опционально) drag / reorder

📌 Категории — часть public UI, редактируемая только админом.

---

## ✅ ЭТАП 6 — Product Editor (ЯДРО V2) (ЗАВЕРШЁН)

**Цель:** полноценное управление товарами.

### Data / Logic
- product (draft / published)
- Связи с brand и category
- Server Actions

### UI (overlay, КРИТИЧНО)
- Кнопка ➕ “Добавить позицию”
- Карточка товара:
  - ✏️ редактировать
  - 👁️ скрыть из каталога (деактивация; для админа скрытая карточка серая с кнопкой «Показать карточку снова»)
- Модалка Product Editor:
  - name
  - subtitle
  - description
  - price
  - discount
  - brand
  - category
  - status

📌 Карточка товара НЕ дублируется.

---

## ✅ ЭТАП 7 — Product Images (ЗАВЕРШЁН)

**Цель:** управление изображениями товаров.

### Data
- Таблица `product_image`
- position
- FK → product

### UI
- Загрузка 1–12 изображений (в редакторе позиции, после сохранения)
- Кнопки «вверх/вниз» для изменения порядка (первое = карточка в каталоге)
- Удаление изображений
- Bucket в Supabase Storage: `product` (нужно создать публичный bucket, если ещё нет)

📌 Используется и в public, и в admin.

---

## ✅ ЭТАП 8 — Media UX (ЗАВЕРШЁН)

**Цель:** удобство и защита от ошибок.

- ✅ Cropper (изображения товаров — `ProductImageCropSheet`, react-easy-crop, 3:4)
- ✅ Cropper для logo/cover — `BusinessImageCropSheet` (1:1 и 4:1)
- ✅ Preview перед сохранением (во всех cropper)
- ✅ Ограничения по размеру (5MB для business и product images)
- ✅ Toast (sonner) вместо alert для ошибок загрузки

---

## ✅ ЭТАП 9 — UX & Stability (ЗАВЕРШЁН)

**Цель:** продакшн-качество.

- ✅ Loading states (Loader2 на кнопках submit в ProductEditor, BusinessProfileEditor, LoginForm)
- ✅ Disabled кнопки и поля при submit (ProductEditorSheet — все поля и кнопки)
- ✅ Ошибки форм (submitError, message уже были)
- ✅ Empty states (каталог: «Товары не найдены» vs «В каталоге пока нет товаров»; режим категорий: «Категорий пока нет»)
- ✅ Confirm dialogs (скрытие товара — диалог «Скрыть товар из каталога?»)
- ✅ Edge-cases (пустой products в FiltersSheet — fix Infinity/-Infinity; нет брендов/категорий — подсказки в picker)

📌 Никакой новой логики.

---

## 🚀 ЭТАП 10 — V3 (ПОЗЖЕ)

- Аналитика
- Хранение заказов
- Онлайн-оплата
- Клиенты
- SEO (OG, meta)
- Кастомные домены
- Тарифы / подписки

---

## 🎯 Текущий статус

### ✅ Выполненные этапы

**ЭТАП 1 — Data Model V2** ✅ ЗАВЕРШЁН
- Созданы все необходимые таблицы (business, category, product, brand, product_image, profile, business_user)
- Обновлена структура данных (product.brand_id, product.subtitle, business.logo_url, business.cover_url, business.yandex_metrika)
- Реализован soft delete через `is_active`
- Настроены внешние ключи, индексы и триггеры `updated_at`
- Миграция: `migrations/v2_data_model.sql`

**ЭТАП 2 — Auth + Ownership** ✅ ЗАВЕРШЁН
- Настроен Supabase Auth (login, signup, magic link)
- Создана таблица `profile` для профилей пользователей
- Создана таблица `business_user` для связи пользователей с бизнесами
- Реализованы роли: `owner`, `admin`
- Настроены RLS политики (public read, owner/admin write)
- Реализована проверка доступа через `EXISTS`
- Добавлен guard на `/admin` (редирект неавторизованных на `/login`)
- Миграция: `migrations/v2_auth.sql`
- UI: `/app/login`, `/app/signup`, `/app/admin`

**ЭТАП 3 — Business Admin Overlay** ✅ ЗАВЕРШЁН

**3.1 Базовое редактирование** ✅ ГОТОВО
- Реализовано редактирование полей:
  - `name` (название бизнеса)
  - `description` (описание)
  - `phone` (телефон)
  - `whatsapp` (WhatsApp)
  - `telegram` (Telegram)
  - `yandex_metrika` (ID Яндекс.Метрики)
- Server Actions: `app/admin/business/actions.ts`
- Overlay: `BusinessProfileEditorSheet`, `ContactOrEditSection`, `BusinessProfileEditorWrapper`
- Отдельная страница: `app/admin/business/page.tsx`, `business-form.tsx`
- RLS-проверки реализованы

**3.2 Media** ✅ ГОТОВО
- Загрузка логотипа (1:1) и обложки (4:1) в Supabase Storage
- Сохранение `logo_url`, `cover_url` через Server Actions
- Preview в overlay (`business-profile-editor-sheet.tsx`) и в форме админки
- Crop — реализован в этапе 8 (Media UX)

**ЭТАП 4 — Brand Manager** ✅ ЗАВЕРШЁН
- Server Actions: `getBrands`, `createBrand`, `updateBrand`, `deleteBrand`, `getProductCountByBrand`
- Модалка выбора/управления брендами: BrandPickerSheet (добавить, переименовать, удалить с подтверждением и опцией «удалить связанные товары»)
- Интеграция в Product Editor (выбор бренда для позиции)

**ЭТАП 5 — Category Manager** ✅ ЗАВЕРШЁН
- Server Actions: `getCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `getProductCountByCategory`
- Модалка выбора/управления категориями: CategoryPickerSheet (добавить, переименовать, удалить с подтверждением)
- Интеграция в Product Editor (выбор категории для позиции)

**ЭТАП 6 — Product Editor (ЯДРО V2)** ✅ ЗАВЕРШЁН
- Server Actions: `getProduct`, `createProduct`, `updateProduct`, `deleteProduct` (soft delete), `restoreProduct`
- ProductEditorSheet: создание/редактирование позиции (name, subtitle, description, price, brand, category, isActive, inStock), фиксированная высота, лоадер при загрузке
- Контекст: `openProductEditor(productId?)`, `hasAccess`, `deleteProduct`, `restoreProduct`
- Карточка товара для админа: кнопки «Редактировать» и «Скрыть» (иконка глаза); скрытая карточка — серая, по центру кнопка «Показать карточку снова»
- Страница `[slug]`: для админа загружаются все товары (в т.ч. скрытые), для остальных — только активные

**ЭТАП 7 — Product Images** ✅ ЗАВЕРШЁН
- Таблица `product_image`: загрузка изображений в bucket `product`, CRUD через Server Actions
- Каталог `[slug]`: товары загружаются с изображениями из `product_image` (по position)
- Редактор позиции: список фото (1–12), загрузка, удаление, изменение порядка (кнопки вверх/вниз)
- Первое изображение используется на карточке товара и в деталях

**ЭТАП 8 — Media UX** ✅ ЗАВЕРШЁН
- Cropper для изображений товаров (`ProductImageCropSheet`, 3:4)
- Cropper для logo/cover (`BusinessImageCropSheet`, 1:1 и 4:1)
- Preview перед сохранением во всех cropper
- Ограничения по размеру (5MB) для business и product images
- Toast (sonner) вместо alert для ошибок загрузки
- Интеграция cropper в `ImageUploadButton` и `BusinessProfileEditorSheet`

**ЭТАП 9 — UX & Stability** ✅ ЗАВЕРШЁН
- Loading states на кнопках submit (ProductEditorSheet, BusinessProfileEditorSheet, LoginForm)
- Disabled поля и кнопки при submit (ProductEditorSheet)
- Empty states: каталог (нет товаров / товары не найдены), режим категорий (нет категорий)
- Confirm dialog при скрытии товара (ProductCard)
- Edge-cases: FiltersSheet — fix при пустом products (Infinity/-Infinity)

### 🔜 Следующие этапы
- ЭТАП 10 — V3 (ПОЗЖЕ)




