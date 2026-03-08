# Аудит server-only ключей и `service_role`

Дата: 2026-03-08

## Что проверено

- использование `SUPABASE_SERVICE_ROLE_KEY`
- использование `createAdminClient`
- использование `process.env` в коде приложения
- разделение между:
  - `lib/supabase.ts` для публичного клиента
  - `lib/supabase-server.ts` для server-side клиента
  - `lib/supabase-admin.ts` для admin/service-role клиента

## Итог

Критичной утечки `service_role` в клиентский код не найдено.

## Что найдено

### 1. `service_role` используется только через server-only модуль

Файл:

- `lib/supabase-admin.ts`

Наблюдение:

- модуль помечен `import 'server-only'`
- `SUPABASE_SERVICE_ROLE_KEY` читается только там
- в браузерный клиент этот ключ не попадает

### 2. Вызовы `createAdminClient` находятся только в серверном коде

Файлы:

- `lib/business.ts`
- `app/admin/product/actions.ts`
- `app/api/cron/expire-discounts/route.ts`

Наблюдение:

- `lib/business.ts` помечен `'use server'`
- `app/admin/product/actions.ts` помечен `'use server'`
- cron route выполняется только на сервере

### 3. Публичный клиент использует только anon key

Файл:

- `lib/supabase.ts`

Наблюдение:

- клиентский Supabase создаётся только из:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Это ожидаемое поведение.

## Что важно помнить

Безопасность `service_role` сейчас держится на архитектурной дисциплине:

- нельзя импортировать `lib/supabase-admin.ts` в client component
- нельзя прокидывать `process.env.SUPABASE_SERVICE_ROLE_KEY` в response / props / public config

С текущим кодом явной ошибки такого типа не видно.

## Остаточные риски

- client-side загрузки в Storage всё ещё остаются отдельным риском, но это не утечка `service_role`
- tenant isolation ещё не проверена полностью

## Вывод

Пункт "проверено использование server-only ключей" можно считать закрытым:

- `service_role` не используется в клиентском коде
- публичный клиент отделён от admin-клиента

