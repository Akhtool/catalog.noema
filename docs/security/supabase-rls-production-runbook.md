# Supabase RLS Production Runbook

Дата: 2026-03-07

Цель:

- безопасно убрать публичные `INSERT / UPDATE / DELETE` политики для `business`, `category`, `product`
- не трогать остальные политики и не делать лишних изменений в проде

Связанные файлы:

- `supabase/migrations/20250307_remove_public_write_rls.sql`
- `supabase/migrations/ROLLBACK_20250307_remove_public_write_rls.sql`

## Что меняем

Меняем только одно:

- удаляем 9 policy, которые разрешают `public` / `anon` запись в:
  - `business`
  - `category`
  - `product`

Не меняем:

- public `SELECT` policy для каталога
- policy для `profile`
- storage policy
- функции, триггеры, schema

## Почему это должно быть безопасно

Ожидаемая рабочая модель уже есть:

- публичный каталог читает данные через `SELECT`
- админские действия идут от `authenticated`
- доступ владельца/админа контролируется policy вроде `owner_*_all` и `business_user`

То есть после удаления public write:

- каталог должен продолжить открываться
- владелец должен продолжить работать в админке
- закрывается именно анонимная запись в БД

## Когда выполнять

Лучшее окно:

- низкая активность
- у тебя есть 15-20 минут на ручную проверку после применения

Не выполнять, если:

- нет возможности сразу проверить публичный каталог и админку
- нет доступа к SQL Editor и быстрому откату

## Подготовка перед применением

1. Открой Supabase Dashboard → SQL Editor.
2. Подготовь в отдельной вкладке rollback SQL из `ROLLBACK_20250307_remove_public_write_rls.sql`.
3. Убедись, что знаешь один рабочий:
   - публичный URL каталога
   - логин владельца / админа
   - бизнес, где можно создать или отредактировать категорию / товар

## Безопасный способ применения

Если у тебя только `main` и нет веток Supabase, используй транзакцию в SQL Editor.

Вставь и выполни:

```sql
BEGIN;

DROP POLICY IF EXISTS "Allow public insert to business" ON public.business;
DROP POLICY IF EXISTS "Allow public update to business" ON public.business;
DROP POLICY IF EXISTS "Allow public delete to business" ON public.business;

DROP POLICY IF EXISTS "Allow public insert to category" ON public.category;
DROP POLICY IF EXISTS "Allow public update to category" ON public.category;
DROP POLICY IF EXISTS "Allow public delete to category" ON public.category;

DROP POLICY IF EXISTS "Allow public insert to product" ON public.product;
DROP POLICY IF EXISTS "Allow public update to product" ON public.product;
DROP POLICY IF EXISTS "Allow public delete to product" ON public.product;
```

После этого не закрывай вкладку и не делай `COMMIT` сразу.

## Проверка до COMMIT

Проверь по шагам:

1. Публичный каталог открывается.
2. Категории и товары в каталоге видны как раньше.
3. Логин в админку работает.
4. Открывается страница редактирования бизнеса.
5. Создаётся или редактируется категория.
6. Создаётся или редактируется товар.
7. Сохранение бизнеса работает.

Если всё работает:

```sql
COMMIT;
```

Если что-то ломается:

```sql
ROLLBACK;
```

Это лучший вариант, потому что ты не фиксируешь изменение до ручной проверки.

## Что считать признаком проблемы

Сразу откатывайся, если после удаления policy:

- админка перестала сохранять `business`
- админка перестала создавать или редактировать `category`
- админка перестала создавать или редактировать `product`
- появились ошибки `new row violates row-level security policy`
- владельцу перестал быть доступен свой бизнес

## Если уже сделал COMMIT и заметил проблему позже

Выполни rollback SQL:

```sql
CREATE POLICY "Allow public insert to business" ON public.business FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update to business" ON public.business FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete to business" ON public.business FOR DELETE TO public USING (true);

CREATE POLICY "Allow public insert to category" ON public.category FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update to category" ON public.category FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete to category" ON public.category FOR DELETE TO public USING (true);

CREATE POLICY "Allow public insert to product" ON public.product FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update to product" ON public.product FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete to product" ON public.product FOR DELETE TO public USING (true);
```

Важно:

- rollback возвращает небезопасное состояние
- его цель только быстро поднять прод, если штатный поток внезапно зависел от этих дырявых policy

## Минимальный план после успешного COMMIT

После применения зафиксируй:

1. Время изменения.
2. Что именно было удалено.
3. Что прошло smoke-check.
4. Что ещё осталось:
   - storage policy для bucket `business`
   - client-side запись в `profile`
   - tenant isolation audit

---

## Статус: применено (2026-03-07)

Миграция применена, проверка пройдена. Дальнейшие шаги см. раздел «Что дальше» ниже.

## Рекомендация

На текущем этапе менять стоит именно это и только это.

Не объединяй в один заход:

- удаление public write policy
- переделку storage
- рефактор auth/profile
- исправление `search_path`

Один риск за раз легче проверить и безопаснее катить в прод.

---

## Что дальше после успешного применения

1. **Закоммитить в репозиторий**
   - `supabase/migrations/20250307_remove_public_write_rls.sql`
   - `supabase/migrations/ROLLBACK_20250307_remove_public_write_rls.sql` (хранить для экстренного отката)
   - при необходимости обновления в `docs/security/supabase-rls-production-runbook.md`
   - Пример: `fix: remove public RLS write policies for business, category, product`

2. **Осталось по безопасности (по желанию, не срочно)**
   - **Storage:** в Dashboard проверить RLS бакета `business` — не должен разрешать anon или «любому authenticated» писать в чужие пути.
   - **Auth:** включить Leaked password protection в Dashboard → Auth → Settings.
   - **Функции:** поправить `search_path` у `update_updated_at_column` и `reorder_products` (см. [Database Linter 0011](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)).

3. **Rollback-файл** оставить в репозитории как документацию на случай экстренного отката; в обычной работе не выполнять.


