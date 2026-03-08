-- Удаление небезопасных RLS-политик: anon (public) не должен иметь INSERT/UPDATE/DELETE
-- на business, category, product. Публичное чтение остаётся (Allow public read / public_*_select).
--
-- КАК ПРИМЕНЯТЬ БЕЗ РИСКА ДЛЯ ПРОДАКШЕНА:
-- 1) Ветка Supabase (если есть Pro): Dashboard → Branches → Create branch →
--    применить эту миграцию на ветке, проверить приложение → Merge to production.
-- 2) Без веток: в SQL Editor выполнить в одной транзакции (см. ниже), проверить каталог/админку,
--    затем COMMIT. Откат: выполнить ROLLBACK_20250307_remove_public_write_rls.sql.
--
-- Вариант 2 — одной транзакцией (скопировать в SQL Editor):
--   BEGIN;
--   <содержимое этого файла без комментариев>
--   -- проверить приложение, затем: COMMIT;  или  ROLLBACK;

-- business
DROP POLICY IF EXISTS "Allow public insert to business" ON public.business;
DROP POLICY IF EXISTS "Allow public update to business" ON public.business;
DROP POLICY IF EXISTS "Allow public delete to business" ON public.business;

-- category
DROP POLICY IF EXISTS "Allow public insert to category" ON public.category;
DROP POLICY IF EXISTS "Allow public update to category" ON public.category;
DROP POLICY IF EXISTS "Allow public delete to category" ON public.category;

-- product
DROP POLICY IF EXISTS "Allow public insert to product" ON public.product;
DROP POLICY IF EXISTS "Allow public update to product" ON public.product;
DROP POLICY IF EXISTS "Allow public delete to product" ON public.product;
