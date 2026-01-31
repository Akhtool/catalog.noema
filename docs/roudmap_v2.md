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
- `data-model.md`
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

## 🟡 ЭТАП 3 — Business Admin Overlay (В ПРОЦЕССЕ)

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

### 3.2 Media (ОСТАЛОСЬ СДЕЛАТЬ)
- Логотип (1:1)
- Обложка (4:1)
- Загрузка в Supabase Storage
- Сохранение `logo_url`, `cover_url`
- Preview
- (Опционально) crop

📌 Никаких новых страниц. Всё поверх public UI.

---

## 🔜 ЭТАП 4 — Brand Manager

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

## 🔜 ЭТАП 5 — Category Manager

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

## 🔜 ЭТАП 6 — Product Editor (ЯДРО V2)

**Цель:** полноценное управление товарами.

### Data / Logic
- product (draft / published)
- Связи с brand и category
- Server Actions

### UI (overlay, КРИТИЧНО)
- Кнопка ➕ “Добавить позицию”
- Карточка товара:
  - ✏️ редактировать
  - 🗑️ удалить
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

## 🔜 ЭТАП 7 — Product Images

**Цель:** управление изображениями товаров.

### Data
- Таблица `product_image`
- position
- FK → product

### UI
- Загрузка 1–12 изображений
- Drag & reorder
- Первое изображение = карточка
- Удаление изображений

📌 Используется и в public, и в admin.

---

## 🔜 ЭТАП 8 — Media UX (УЛУЧШЕНИЕ)

**Цель:** удобство и защита от ошибок.

- Cropper
- Preview перед сохранением
- Ограничения по размеру
- Ошибки загрузки

📌 Делается после базовой загрузки.

---

## 🔜 ЭТАП 9 — UX & Stability

**Цель:** продакшн-качество.

- Loading states
- Disabled кнопки
- Ошибки форм
- Empty states
- Confirm dialogs
- Edge-cases (нет брендов / категорий)

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

**ЭТАП 3 — Business Admin Overlay** 🟡 В ПРОЦЕССЕ

**3.1 Базовое редактирование** ✅ ГОТОВО
- Реализовано редактирование полей:
  - `name` (название бизнеса)
  - `description` (описание)
  - `phone` (телефон)
  - `whatsapp` (WhatsApp)
  - `telegram` (Telegram)
  - `yandex_metrika` (ID Яндекс.Метрики)
- Server Actions: `app/admin/business/actions.ts`
- UI: `app/admin/business/business-form.tsx`
- Страница: `app/admin/business/page.tsx`
- RLS-проверки реализованы

**3.2 Media** ❌ НЕ СДЕЛАНО
- Загрузка логотипа (1:1) — не реализовано
- Загрузка обложки (4:1) — не реализовано
- Интеграция с Supabase Storage — не реализовано
- Preview изображений — не реализовано
- Crop функциональность — не реализовано

### 🔜 Следующие этапы

- ЭТАП 4 — Brand Manager (не начат)
- ЭТАП 5 — Category Manager (не начат)
- ЭТАП 6 — Product Editor (не начат)
- ЭТАП 7 — Product Images (не начат)
- ЭТАП 8 — Media UX (не начат)
- ЭТАП 9 — UX & Stability (не начат)
- ЭТАП 10 — V3 (не начат)

