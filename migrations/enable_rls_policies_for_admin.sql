-- Миграция: включение RLS политик для временной админки
-- Дата: 2026-01-24
-- Описание: Разрешает публичный доступ на чтение и запись для временной страницы администрирования
-- ВНИМАНИЕ: Это временное решение для разработки. В продакшене нужны более строгие политики.

-- Включаем RLS для всех таблиц
ALTER TABLE business ENABLE ROW LEVEL SECURITY;
ALTER TABLE category ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы business
-- Разрешаем чтение всем
CREATE POLICY "Allow public read access to business"
ON business FOR SELECT
USING (true);

-- Разрешаем вставку всем (для временной админки)
CREATE POLICY "Allow public insert to business"
ON business FOR INSERT
WITH CHECK (true);

-- Разрешаем обновление всем (для временной админки)
CREATE POLICY "Allow public update to business"
ON business FOR UPDATE
USING (true)
WITH CHECK (true);

-- Разрешаем удаление всем (для временной админки)
CREATE POLICY "Allow public delete to business"
ON business FOR DELETE
USING (true);

-- Политики для таблицы category
-- Разрешаем чтение всем
CREATE POLICY "Allow public read access to category"
ON category FOR SELECT
USING (true);

-- Разрешаем вставку всем (для временной админки)
CREATE POLICY "Allow public insert to category"
ON category FOR INSERT
WITH CHECK (true);

-- Разрешаем обновление всем (для временной админки)
CREATE POLICY "Allow public update to category"
ON category FOR UPDATE
USING (true)
WITH CHECK (true);

-- Разрешаем удаление всем (для временной админки)
CREATE POLICY "Allow public delete to category"
ON category FOR DELETE
USING (true);

-- Политики для таблицы product
-- Разрешаем чтение всем
CREATE POLICY "Allow public read access to product"
ON product FOR SELECT
USING (true);

-- Разрешаем вставку всем (для временной админки)
CREATE POLICY "Allow public insert to product"
ON product FOR INSERT
WITH CHECK (true);

-- Разрешаем обновление всем (для временной админки)
CREATE POLICY "Allow public update to product"
ON product FOR UPDATE
USING (true)
WITH CHECK (true);

-- Разрешаем удаление всем (для временной админки)
CREATE POLICY "Allow public delete to product"
ON product FOR DELETE
USING (true);
