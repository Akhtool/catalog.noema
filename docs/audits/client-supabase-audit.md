# Аудит client-side обращений к Supabase

Дата: 2026-03-07

## Что проверено

- client components и client forms в `app/` и `components/`
- прямые вызовы `supabase.from(...)`
- прямые вызовы `supabase.storage`
- использование публичного клиента из `lib/supabase.ts`

## Что найдено

### 1. Client-side запись в `profile`

Файлы:

- `app/onboarding/onboarding-form.tsx`
- `app/signup/signup-form.tsx`
- `app/login/login-form.tsx`

Что происходит:

- после `auth.signUp` или `auth.signInWithPassword` клиентский код делает `insert` / `upsert` в таблицу `profile`

Статус риска:

- умеренный
- это не `service_role`, но запись зависит от RLS и дублирует уже существующую server-side логику в `app/login/actions.ts`

Что делать дальше:

- перенести создание / upsert профиля на server action или в auth callback / trigger
- убрать client-side запись в `profile`, оставив на клиенте только auth flow

### 2. Client-side загрузка файлов в bucket `business`

Файлы:

- `app/admin/business/business-form.tsx`
- `components/business/business-profile-editor-sheet.tsx`
- `components/business/image-upload-button.tsx`

Что происходит:

- клиент напрямую загружает файлы через `supabase.storage.from('business').upload(...)`
- затем отдельно вызывает server action для сохранения публичного URL в `business`

Статус риска:

- умеренный/высокий
- безопасность здесь держится на storage policy
- если policy слишком широкая, клиент сможет загружать чужие файлы или писать в чужие пути

Что делать дальше:

- проверить storage policies для bucket `business`
- по возможности перевести загрузку на серверный endpoint / server action / signed upload flow
- привязать путь загрузки и право доступа к business membership на сервере

## Что не найдено

- прямые client-side `insert` / `update` / `delete` в таблицы `business`, `category`, `product`
- использование `service_role` в клиентском коде

## Вывод

Шаг аудита завершён: прямые client-side записи есть, но они сейчас ограничены `profile` и `business` storage.

Следующие приоритеты:

1. убрать client-side запись в `profile`
2. проверить и затем ужесточить загрузку изображений в `business` storage

