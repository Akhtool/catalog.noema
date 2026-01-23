-- Миграция: включение RLS политик для временной админки (безопасная версия)
-- Дата: 2026-01-24
-- Описание: Разрешает публичный доступ на чтение и запись для временной страницы администрирования
-- ВНИМАНИЕ: Это временное решение для разработки. В продакшене нужны более строгие политики.

-- Включаем RLS для всех таблиц
ALTER TABLE business ENABLE ROW LEVEL SECURITY;
ALTER TABLE category ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики, если они есть (для business)
DROP POLICY IF EXISTS "Allow public read access to business" ON business;
DROP POLICY IF EXISTS "Allow public insert to business" ON business;
DROP POLICY IF EXISTS "Allow public update to business" ON business;
DROP POLICY IF EXISTS "Allow public delete to business" ON business;

-- Политики для таблицы business
CREATE POLICY "Allow public read access to business"
ON business FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to business"
ON business FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to business"
ON business FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete to business"
ON business FOR DELETE
USING (true);

-- Удаляем существующие политики, если они есть (для category)
DROP POLICY IF EXISTS "Allow public read access to category" ON category;
DROP POLICY IF EXISTS "Allow public insert to category" ON category;
DROP POLICY IF EXISTS "Allow public update to category" ON category;
DROP POLICY IF EXISTS "Allow public delete to category" ON category;

-- Политики для таблицы category
CREATE POLICY "Allow public read access to category"
ON category FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to category"
ON category FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to category"
ON category FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete to category"
ON category FOR DELETE
USING (true);

-- Удаляем существующие политики, если они есть (для product)
DROP POLICY IF EXISTS "Allow public read access to product" ON product;
DROP POLICY IF EXISTS "Allow public insert to product" ON product;
DROP POLICY IF EXISTS "Allow public update to product" ON product;
DROP POLICY IF EXISTS "Allow public delete to product" ON product;

-- Политики для таблицы product
CREATE POLICY "Allow public read access to product"
ON product FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to product"
ON product FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to product"
ON product FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete to product"
ON product FOR DELETE
USING (true);
