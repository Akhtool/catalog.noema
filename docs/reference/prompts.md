# 🧠 Cursor Prompts — Catalog Platform (V2)

> Принципы для ВСЕХ промптов:
> - НЕ дублировать Public UI
> - Admin UI = Public UI + edit-слой
> - Не добавлять поля/таблицы без явного указания
> - Делать минимально рабочий UI
> - Один промпт = одна задача

---

# ✅ ЭТАП 3 — Business Admin Overlay

## 3.1 Базовое редактирование бизнеса (ГОТОВО)
(пропускаем)

---

## 3.2 Загрузка логотипа и обложки бизнеса

### Prompt 3.2.1 — Storage upload (logic)
Добавь загрузку изображений логотипа и обложки бизнеса.

Нужно:

использовать Supabase Storage

bucket: business

logo: соотношение 1:1

cover: соотношение 4:1

после загрузки сохранять публичный URL в:

business.logo_url

business.cover_url

Ограничения:

без cropper

без сложной валидации

не менять RLS

shell
Копировать код

### Prompt 3.2.2 — UI overlay
Добавь UI для загрузки logo и cover поверх public страницы бизнеса.

Нужно:

кнопки ✏️ возле логотипа и обложки

preview загруженных изображений

сохранение через server action

показывать кнопки ТОЛЬКО для owner/admin

Не создавай новых страниц.

yaml
Копировать код

---

# 🔜 ЭТАП 4 — Brand Manager

## Prompt 4.1 — CRUD брендов (data + actions)
Реализуй server actions для управления брендами.

Нужно:

получить список брендов текущего бизнеса

создать бренд

обновить название

soft delete (is_active = false)

Ограничения:

использовать существующие RLS

работать только в рамках бизнеса пользователя

shell
Копировать код

## Prompt 4.2 — Brand Manager UI (overlay)
Добавь Brand Manager как overlay UI.

Нужно:

кнопка "Бренды" в admin-режиме

модалка со списком брендов

кнопки ➕ ✏️ 🗑️

empty state (если брендов нет)

Не делай отдельную страницу.

yaml
Копировать код

---

# 🔜 ЭТАП 5 — Category Manager

## Prompt 5.1 — CRUD категорий
Реализуй server actions для категорий.

Нужно:

получить категории бизнеса

создать категорию

обновить название

изменить порядок

soft delete

Используй существующую модель category.

shell
Копировать код

## Prompt 5.2 — Category UI (overlay)
Добавь UI управления категориями поверх каталога.

Нужно:

кнопка "Категории" (admin only)

модалка со списком

➕ ✏️ 🗑️

визуальный порядок категорий

Public UI не дублировать.

yaml
Копировать код

---

# 🔜 ЭТАП 6 — Product Editor (CORE)

## Prompt 6.1 — Product server actions
Реализуй server actions для товаров.

Нужно:

получить список товаров бизнеса

создать товар (draft)

обновить товар

удалить товар

Поля:

name

subtitle

description

price

discount

brand_id

category_id

status (draft/published)

shell
Копировать код

## Prompt 6.2 — Product Editor UI
Добавь Product Editor как overlay UI.

Нужно:

кнопка ➕ "Добавить позицию"

модалка редактирования товара

использование брендов и категорий

сохранение через server actions

Карточка товара должна быть та же, что и в public UI.

yaml
Копировать код

---

# 🔜 ЭТАП 7 — Product Images

## Prompt 7.1 — Product images upload
Добавь загрузку изображений товара.

Нужно:

Supabase Storage: products/

загрузка 1–12 изображений

сохранение в product_image

поле position

первое изображение = карточка товара

shell
Копировать код

## Prompt 7.2 — Product images UI
Добавь UI управления изображениями товара.

Нужно:

preview изображений

drag & reorder

удаление изображения

отображение в public карточке товара

Admin only.

yaml
Копировать код

---

# 🔜 ЭТАП 8 — Media UX (опционально)

## Prompt 8.1 — Cropper
Добавь cropper для изображений.

Нужно:

логотип

обложка

изображения товара

Cropper подключать ТОЛЬКО после загрузки базового функционала.

yaml
Копировать код

---

# 🔜 ЭТАП 9 — UX & Stability

## Prompt 9.1 — UX polish
Добавь UX-улучшения.

Нужно:

loading states

disabled кнопки при сохранении

confirm dialogs при удалении

empty states

обработку ошибок

Не добавляй новой логики.

yaml
Копировать код

---

# 🧠 ОБЩИЙ SYSTEM PROMPT ДЛЯ CURSOR

Ты работаешь над SaaS Catalog Platform.

Правила:

Public UI = база

Admin UI = overlay

Не дублируй верстку

Не добавляй сущности без указания

Один промпт = одна задача
