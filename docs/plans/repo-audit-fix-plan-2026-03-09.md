# План фикса проблем после аудита репозитория

План разбит по приоритету и зависимостям. Выполнять сверху вниз: сначала tenant isolation и auth/session, потом UI-consistency, затем performance и добивка тестами.

---

## Этап 0. Подготовка

- [ ] Создать отдельную ветку под исправления аудита.
- [ ] Зафиксировать текущие findings как baseline для PR/issue tracker.
- [ ] Не смешивать tenant/auth fixes с косметическими правками UI.
- [ ] После каждого этапа прогонять `npm run test:run` и ручной smoke по ключевому сценарию.

---

## Этап 1. Закрыть tenant isolation в admin-зоне

**Цель:** админка и business actions должны работать только в контексте текущего subdomain, без fallback на "первый доступный бизнес".

### 1.1 Admin layout

- [ ] В `app/admin/layout.tsx` определить текущий `slug` из host.
- [ ] До рендера layout проверять, что пользователь имеет `owner/admin` доступ именно к бизнесу текущего `slug`.
- [ ] Если host не business-subdomain, редиректить как сейчас.
- [ ] Если пользователь залогинен, но не имеет доступа к бизнесу текущего host, возвращать redirect/not-found/forbidden сценарий без рендера админки.

### 1.2 Server actions бизнеса

- [ ] Убрать в `app/admin/business/actions.ts` логику "первый бизнес пользователя" для admin flow.
- [ ] Переделать `getBusiness()` так, чтобы он загружал бизнес по текущему host slug, а не по первому membership.
- [ ] Переделать `updateBusiness()` так, чтобы business id резолвился из текущего host slug, а не из `business_id` формы с fallback.
- [ ] Проверить `createLocation`, `updateLocation`, `deleteLocation` на соответствие тому же host-scoped контракту.

### 1.3 Общие helper'ы

- [ ] Вынести helper уровня `resolveCurrentBusinessFromHost(headers, supabase)`.
- [ ] Вынести helper уровня `assertCurrentBusinessAccess(userId, hostSlug)`.
- [ ] Удалить или жёстко ограничить helper'ы вида `getFirstBusinessIdForUser` в code path админки.

### 1.4 Проверка после этапа

- [ ] Пользователь бизнеса `A` не может открыть `/admin/*` на subdomain бизнеса `B`.
- [ ] Пользователь с доступом к нескольким бизнесам видит и редактирует именно тот бизнес, на чьём subdomain находится.
- [ ] Сохранение профиля и локаций не может обновить "первый попавшийся" бизнес.

---

## Этап 2. Нормализовать auth/session lifecycle

**Цель:** login, callback и logout должны работать с одной и той же cookie-моделью.

### 2.1 Единый cookie helper

- [ ] Вынести общие cookie options для auth cookies в один helper.
- [ ] Использовать один и тот же `domain/path/secure/sameSite` набор в `setServerSession()` и `logout()`.
- [ ] Убедиться, что logout удаляет именно доменные cookies `.catlg.ru`, а не только host-only.

### 2.2 Callback flow

- [ ] В `app/auth/callback/route.ts` после успешного `exchangeCodeForSession()` явно установить серверные auth cookies.
- [ ] Не полагаться на неявную cookie-персистенцию внутри текущего `createServerClient()`.
- [ ] Проверить redirect после callback на root-domain и business-subdomain сценариях.

### 2.3 Server client

- [ ] Пересмотреть `lib/supabase-server.ts`: либо оставить текущий подход, но сделать контракт явным, либо перейти на SSR helper с cookie adapter.
- [ ] Убедиться, что `createServerClient()` не зависит от случайно оставшихся client-side session артефактов.

### 2.4 Logout

- [ ] Починить `logout()` в `app/login/actions.ts` с удалением cookies по тому же domain/path.
- [ ] Ручно проверить logout на root host и на business subdomain.
- [ ] Проверить, что после logout серверный `supabase.auth.getUser()` возвращает `null`.

### 2.5 Проверка после этапа

- [ ] Логин по email/password создаёт рабочую SSR-сессию.
- [ ] Magic link / OAuth callback создаёт рабочую SSR-сессию.
- [ ] Logout гарантированно завершает серверную сессию на всех subdomains.

---

## Этап 3. Починить ложный optimistic success в admin UI

**Цель:** UI не должен показывать успешное скрытие/восстановление товара, если server action вернул ошибку.

### 3.1 Wrapper

- [ ] В `components/business/business-profile-editor-wrapper.tsx` проверять результат `deleteProductAction()` и `restoreProductAction()`.
- [ ] Если action вернул `{ error }`, пробрасывать исключение или возвращать ошибку наверх.
- [ ] Не делать `router.refresh()` для failed action.

### 3.2 ProductCard

- [ ] В `components/catalog/product-card.tsx` обновлять optimistic state только после подтверждённого success.
- [ ] Показывать `toast.error` на реальную ошибку от server action.
- [ ] Проверить оба сценария: hide и restore.

### 3.3 Смежные места

- [ ] Просмотреть остальные client-side вызовы server actions на тот же анти-паттерн "resolved promise = success".
- [ ] Исправить аналогичные места, если найдутся.

### 3.4 Проверка после этапа

- [ ] При ошибке доступа/валидации товар визуально не пропадает из каталога.
- [ ] Success toast показывается только после реального успешного ответа сервера.

---

## Этап 4. Уменьшить лишние ререндеры каталога из-за корзины

**Цель:** изменение одной позиции в корзине не должно ререндерить весь каталог.

### 4.1 ProductCard

- [ ] Убрать подписку на весь `items` массив бизнеса в `components/catalog/product-card.tsx`.
- [ ] Подписывать карточку только на quantity конкретного `productId`.
- [ ] Проверить, что unrelated карточки не получают обновление при изменении чужого quantity.

### 4.2 ProductDetailCard

- [ ] Аналогично сузить подписку в `components/catalog/product-detail-card.tsx`.
- [ ] Убедиться, что drawer/detail-card не тянут лишние данные из store.

### 4.3 Store API

- [ ] При необходимости добавить в `store/cart.ts` селектор/хелпер `getItemQuantity(businessId, productId)`.
- [ ] Если потребуется, подготовить quantity map без лишней денормализации логики.

### 4.4 Проверка после этапа

- [ ] При изменении количества товара не перерисовывается весь грид каталога.
- [ ] На мобильном устройстве tap latency и scroll не деградируют при наполненной корзине.

---

## Этап 5. Закрыть проблемы целостности данных и storage cleanup

**Цель:** не оставлять мусорные записи и orphaned files при частичных сбоях.

### 5.1 Создание бизнеса

- [ ] Переделать `lib/business.ts` на атомарный flow: SQL RPC / transaction.
- [ ] Если транзакция недоступна на текущем уровне абстракции, добавить compensating delete бизнеса при провале вставки в `business_user`.
- [ ] Проверить, что slug не остаётся занятым после частичного сбоя.

### 5.2 Upload product image

- [ ] В `app/admin/product/product-image-actions.ts` удалять uploaded object, если insert в `product_image` не удался.
- [ ] Проверить cleanup при ошибке DB insert.
- [ ] Проверить cleanup при ошибке получения public URL, если объект уже успел загрузиться.

### 5.3 Дополнительная валидация reorder

- [ ] Проверить `reorderProductImages()` и `reorderProducts()` на доверие клиентскому списку id.
- [ ] При необходимости добавить серверную валидацию: все id принадлежат текущему продукту/бизнесу, нет дубликатов, список полный.

### 5.4 Проверка после этапа

- [ ] После искусственного сбоя при создании бизнеса не остаётся orphan tenant.
- [ ] После искусственного сбоя при upload изображения не остаётся мусорный файл в bucket.

---

## Этап 6. Починить favicon и сопутствующие host-based мелочи

**Цель:** убрать сломанное поведение на реальном subdomain routing.

- [ ] В `app/favicon.ico/route.ts` перестать определять бизнес по `referer.pathname`.
- [ ] Резолвить бизнес по `host/subdomain`, либо удалить route, если `generateMetadata().icons` уже закрывает задачу.
- [ ] Проверить favicon на `https://{slug}.catlg.ru/`.

---

## Этап 7. Добавить недостающие тесты

**Цель:** закрыть регрессионные дыры именно по найденным проблемам.

### 7.1 Tenant isolation

- [ ] Добавить тесты на host/business mismatch для admin flow.
- [ ] Добавить тесты на сценарий "пользователь имеет несколько бизнесов".
- [ ] Добавить тесты на запрет доступа к `/admin/*` на чужом subdomain.

### 7.2 Auth/session

- [ ] Добавить тесты на выставление и удаление доменных cookies.
- [ ] Добавить тесты на callback flow с проверкой SSR-сессии после redirect.
- [ ] Добавить тесты на logout с root-domain и subdomain host.

### 7.3 UI consistency

- [ ] Добавить тест на `ProductCard`, где server action возвращает `{ error }`.
- [ ] Проверить, что optimistic hidden/restored state не включается при ошибке.

### 7.4 Storage/data integrity

- [ ] Добавить тест на rollback/cleanup при частичном сбое `createBusiness`.
- [ ] Добавить тест на cleanup uploaded image при ошибке insert в `product_image`.

### 7.5 Performance guardrails

- [ ] Добавить хотя бы один component/integration test на селекторы корзины, чтобы не вернуться к подписке на весь массив.

---

## Этап 8. Финальная верификация

- [ ] Прогнать `npm run test:run`.
- [ ] Прогнать `npm run typecheck`.
- [ ] Ручной smoke:
- [ ] Логин по паролю.
- [ ] Logout.
- [ ] Callback login.
- [ ] Admin на своём subdomain.
- [ ] Попытка admin на чужом subdomain.
- [ ] Hide/restore товара с success/error ответами.
- [ ] Добавление в корзину на длинном каталоге.
- [ ] Upload изображения и сценарий с искусственной ошибкой после upload.

---

## Быстрый порядок выполнения

- [ ] Этап 1: tenant isolation
- [ ] Этап 2: auth/session
- [ ] Этап 3: false success в admin UI
- [ ] Этап 4: cart/catalog performance
- [ ] Этап 5: data integrity + storage cleanup
- [ ] Этап 6: favicon
- [ ] Этап 7: tests
- [ ] Этап 8: final verification
