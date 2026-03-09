# План фикса проблем после аудита репозитория

План приведён в соответствие с `docs/reference/routing-rules.md`.

Ключевой контракт маршрутов:

- `catlg.ru/admin` — только будущая platform admin команды.
- `{slug}.catlg.ru/` — публичный каталог конкретного бизнеса.
- `{slug}.catlg.ru/login` — единственная нормальная точка входа владельца бизнеса.
- owner/admin controls живут overlay на каталоге, а не на отдельном tenant `/admin` маршруте.
- internal onboarding и создание бизнеса — операционный flow команды, а не публичный product flow владельца.

---

## Этап 0. Подготовка

- [ ] Создать отдельную ветку под исправления аудита.
- [ ] Зафиксировать текущие findings как baseline для PR/issue tracker.
- [ ] Не смешивать tenant/auth fixes с косметическими правками UI.
- [ ] После каждого этапа прогонять `npm run test:run` и ручной smoke по ключевому сценарию.

---

## Этап 1. Закрыть tenant isolation в owner/business flow

**Цель:** tenant actions и owner overlay должны работать только в контексте текущего business subdomain, без fallback на "первый доступный бизнес".

### 1.1 Tenant business context

- [x] Вынести helper уровня `resolveCurrentBusinessFromHost(headers, supabase)`.
- [x] Вынести helper уровня `assertCurrentBusinessAccess(userId, hostSlug)`.
- [x] Удалить или жёстко ограничить helper'ы вида `getFirstBusinessIdForUser` в code path owner/business flow.

### 1.2 Business server actions

- [x] Убрать в `app/admin/business/actions.ts` логику "первый бизнес пользователя" для tenant/business flow.
- [x] Переделать `getBusiness()` так, чтобы он загружал бизнес по текущему host slug, а не по первому membership.
- [x] Переделать `updateBusiness()` так, чтобы business id резолвился из текущего host slug, а не из `business_id` формы с fallback.
- [x] Проверить `saveImageUrl`, `createLocation`, `updateLocation`, `deleteLocation` на тот же host-scoped контракт.

### 1.3 Owner overlay access

- [x] Проверить `checkBusinessAccess()` и все client-side места, которые решают, показывать ли owner/admin controls.
- [x] Убедиться, что owner controls могут включаться только на текущем `{slug}.catlg.ru`, а не в чужом tenant context.
- [x] Убедиться, что overlay не зависит от root `/admin` как от нормального owner entry point.

### 1.4 Root admin boundary

- [x] Зафиксировать в коде, что `catlg.ru/admin` — root-only platform area.
- [x] Не использовать `app/admin/*` как tenant owner flow.
- [x] Убедиться, что старые `app/admin/business*` маршруты не становятся альтернативным owner workflow.

### 1.5 Проверка после этапа

- [x] Пользователь бизнеса `A` не может выполнить tenant actions в контексте бизнеса `B`.
- [x] Пользователь с доступом к нескольким бизнесам редактирует только тот бизнес, на чьём subdomain находится.
- [x] Сохранение профиля, изображений и локаций не может обновить "первый попавшийся" бизнес.
- [x] Owner/admin controls не становятся доступными через root-domain `/admin`.

---

## Этап 2. Нормализовать auth/session lifecycle

**Цель:** login, callback и logout должны работать с одной и той же cookie-моделью.

### 2.1 Единый cookie helper

- [x] Вынести общие cookie options для auth cookies в один helper.
- [x] Использовать один и тот же `domain/path/secure/sameSite` набор в `setServerSession()` и `logout()`.
- [x] Убедиться, что logout удаляет именно доменные cookies `.catlg.ru`, а не только host-only.

### 2.2 Callback flow

- [x] В `app/auth/callback/route.ts` после успешного `exchangeCodeForSession()` явно установить серверные auth cookies.
- [x] Не полагаться на неявную cookie-персистенцию внутри текущего `createServerClient()`.
- [x] Проверить redirect после callback на root-domain и business-subdomain сценариях.

### 2.3 Server client

- [x] Пересмотреть `lib/supabase-server.ts`: либо оставить текущий подход, но сделать контракт явным, либо перейти на SSR helper с cookie adapter.
- [x] Убедиться, что `createServerClient()` не зависит от случайно оставшихся client-side session артефактов.

### 2.4 Logout

- [x] Починить `logout()` в `app/login/actions.ts` с удалением cookies по тому же domain/path.
- [x] Ручно проверить logout на root host и на business subdomain.
- [x] Проверить, что после logout серверный `supabase.auth.getUser()` возвращает `null`.

### 2.5 Redirect contract

- [x] Убедиться, что владелец бизнеса после логина возвращается на свой `{slug}.catlg.ru/`.
- [x] Убедиться, что отсутствие бизнеса не превращается в публичный self-service flow через root `/admin`.
- [x] Оставить internal onboarding как отдельный team-only сценарий.

### 2.6 Проверка после этапа

- [x] Логин по email/password создаёт рабочую SSR-сессию.
- [x] Magic link / OAuth callback создаёт рабочую SSR-сессию.
- [x] Logout гарантированно завершает серверную сессию на всех subdomains.

---

## Этап 3. Починить ложный optimistic success в owner UI

**Цель:** UI не должен показывать успешное скрытие/восстановление товара, если server action вернул ошибку.

### 3.1 Wrapper

- [x] В `components/business/business-profile-editor-wrapper.tsx` проверять результат `deleteProductAction()` и `restoreProductAction()`.
- [x] Если action вернул `{ error }`, пробрасывать исключение или возвращать ошибку наверх.
- [x] Не делать `router.refresh()` для failed action.

### 3.2 ProductCard

- [x] В `components/catalog/product-card.tsx` обновлять optimistic state только после подтверждённого success.
- [x] Показывать `toast.error` на реальную ошибку от server action.
- [x] Проверить оба сценария: hide и restore.

### 3.3 Смежные места

- [x] Просмотреть остальные client-side вызовы server actions на тот же анти-паттерн "resolved promise = success".
- [x] Исправить аналогичные места, если найдутся.

### 3.4 Проверка после этапа

- [x] При ошибке доступа/валидации товар визуально не пропадает из каталога.
- [x] Success toast показывается только после реального успешного ответа сервера.

---

## Этап 4. Уменьшить лишние ререндеры каталога из-за корзины

**Цель:** изменение одной позиции в корзине не должно ререндерить весь каталог.

### 4.1 ProductCard

- [x] Убрать подписку на весь `items` массив бизнеса в `components/catalog/product-card.tsx`.
- [x] Подписывать карточку только на quantity конкретного `productId`.
- [x] Проверить, что unrelated карточки не получают обновление при изменении чужого quantity.

### 4.2 ProductDetailCard

- [x] Аналогично сузить подписку в `components/catalog/product-detail-card.tsx`.
- [x] Убедиться, что detail card не тянет лишние данные из store.

### 4.3 Store API

- [x] При необходимости добавить в `store/cart.ts` селектор/хелпер `getItemQuantity(businessId, productId)`.
- [x] Если потребуется, подготовить quantity map без лишней денормализации логики.

### 4.4 Проверка после этапа

- [x] При изменении количества товара не перерисовывается весь грид каталога.
- [x] На мобильном устройстве tap latency и scroll не деградируют при наполненной корзине.

---

## Этап 5. Закрыть проблемы целостности данных и storage cleanup

**Цель:** не оставлять мусорные записи и orphaned files при частичных сбоях.

### 5.1 Создание бизнеса

- [x] Переделать `lib/business.ts` на атомарный flow: SQL RPC / transaction.
- [x] Если транзакция недоступна на текущем уровне абстракции, добавить compensating delete бизнеса при провале вставки в `business_user`.
- [x] Проверить, что slug не остаётся занятым после частичного сбоя.

### 5.2 Upload product image

- [x] В `app/admin/product/product-image-actions.ts` удалять uploaded object, если insert в `product_image` не удался.
- [x] Проверить cleanup при ошибке DB insert.
- [x] Проверить cleanup при ошибке получения public URL, если объект уже успел загрузиться.

### 5.3 Дополнительная валидация reorder

- [x] Проверить `reorderProductImages()` и `reorderProducts()` на доверие клиентскому списку id.
- [x] При необходимости добавить серверную валидацию: все id принадлежат текущему продукту/бизнесу, нет дубликатов, список полный.

### 5.4 Проверка после этапа

- [x] После искусственного сбоя при создании бизнеса не остаётся orphan tenant.
- [x] После искусственного сбоя при upload изображения не остаётся мусорный файл в bucket.

---

## Этап 6. Починить favicon и сопутствующие host-based мелочи

**Цель:** убрать сломанное поведение на реальном subdomain routing.

- [x] В `app/favicon.ico/route.ts` перестать определять бизнес по `referer.pathname`.
- [x] Резолвить бизнес по `host/subdomain`, либо удалить route, если `generateMetadata().icons` уже закрывает задачу.
- [x] Проверить favicon на `https://{slug}.catlg.ru/`.

---

## Этап 7. Добавить недостающие тесты

**Цель:** закрыть регрессионные дыры именно по найденным проблемам.

### 7.1 Tenant isolation

- [x] Добавить тесты на host/business mismatch для tenant/business actions.
- [x] Добавить тесты на сценарий "пользователь имеет несколько бизнесов".
- [x] Добавить тесты на то, что owner controls не активируются в чужом tenant context.

### 7.2 Root-vs-tenant routing

- [x] Добавить тесты на root-only contract для `catlg.ru/admin`.
- [x] Добавить тесты на то, что owner flow не зависит от `/admin/business*`.

### 7.3 Auth/session

- [x] Добавить тесты на выставление и удаление доменных cookies.
- [x] Добавить тесты на callback flow с проверкой SSR-сессии после redirect.
- [x] Добавить тесты на logout с root-domain и subdomain host.

### 7.4 UI consistency

- [x] Добавить тест на `ProductCard`, где server action возвращает `{ error }`.
- [x] Проверить, что optimistic hidden/restored state не включается при ошибке.

### 7.5 Storage/data integrity

- [x] Добавить тест на rollback/cleanup при частичном сбое `createBusiness`.
- [x] Добавить тест на cleanup uploaded image при ошибке insert в `product_image`.

### 7.6 Performance guardrails

- [x] Добавить хотя бы один component/integration test на селекторы корзины, чтобы не вернуться к подписке на весь массив.

---

## Этап 8. Финальная верификация

- [x] Прогнать `npm run test:run`.
- [x] Прогнать `npm run typecheck`.
- [ ] Ручной smoke:
- [x] Логин владельца через `{slug}.catlg.ru/login`.
- [x] Возврат владельца на `{slug}.catlg.ru/` после входа.
- [x] Отображение owner/admin controls на своём `{slug}.catlg.ru/`.
- [x] Отсутствие owner/admin controls вне своего tenant context.
- [x] Logout.
- [x] Callback login.
- [x] Root `catlg.ru/admin` остаётся отдельной platform area и не становится tenant flow.
- [x] Hide/restore товара с success/error ответами.
- [x] Добавление в корзину на длинном каталоге.
- [x] Upload изображения и сценарий с искусственной ошибкой после upload.

---

## Быстрый порядок выполнения

- [x] Этап 1: tenant isolation в owner/business flow
- [x] Этап 2: auth/session
- [x] Этап 3: false success в owner UI
- [x] Этап 4: cart/catalog performance
- [x] Этап 5: data integrity + storage cleanup
- [x] Этап 6: favicon
- [x] Этап 7: tests
- [x] Этап 8: final verification
