-- Добавляет поля скидки в product: has_discount, original_price, discount_date_from, discount_date_to
-- Выполнить в Supabase SQL Editor

ALTER TABLE product
  ADD COLUMN IF NOT EXISTS has_discount BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS discount_date_from DATE,
  ADD COLUMN IF NOT EXISTS discount_date_to DATE;

COMMENT ON COLUMN product.has_discount IS 'Есть скидка — показывать оригинальную цену зачёркнутой';
COMMENT ON COLUMN product.original_price IS 'Оригинальная цена до скидки; используется только при has_discount=true';
COMMENT ON COLUMN product.discount_date_from IS 'Начало периода скидки (включительно); null = без ограничения';
COMMENT ON COLUMN product.discount_date_to IS 'Конец периода скидки (включительно); null = без ограничения';
