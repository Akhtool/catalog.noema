-- Миграция: добавление полей промокода в таблицу business
-- Дата: 2026-02-11
-- Описание: Один активный промокод на бизнес (процент или фикс), период и мин. сумма
-- Откат: см. комментарии в конце файла

ALTER TABLE business
  ADD COLUMN IF NOT EXISTS promo_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS promo_type TEXT CHECK (promo_type IS NULL OR promo_type IN ('percent', 'fixed')),
  ADD COLUMN IF NOT EXISTS promo_value NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS promo_min_order NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS promo_date_from DATE,
  ADD COLUMN IF NOT EXISTS promo_date_to DATE,
  ADD COLUMN IF NOT EXISTS promo_max_discount NUMERIC(12,2);

COMMENT ON COLUMN business.promo_enabled IS 'Включён ли промокод для этого бизнеса';
COMMENT ON COLUMN business.promo_code IS 'Код промокода (сравнение без учёта регистра)';
COMMENT ON COLUMN business.promo_type IS 'Тип скидки: percent или fixed';
COMMENT ON COLUMN business.promo_value IS 'Процент (1-100) или сумма в рублях';
COMMENT ON COLUMN business.promo_min_order IS 'Минимальная сумма заказа для применения (руб)';
COMMENT ON COLUMN business.promo_date_from IS 'Начало периода действия; null = без ограничения';
COMMENT ON COLUMN business.promo_date_to IS 'Конец периода действия; null = без ограничения';
COMMENT ON COLUMN business.promo_max_discount IS 'Макс. сумма скидки для percent (руб); null = без лимита';

-- Откат (выполнять только при необходимости, в dev):
-- ALTER TABLE business DROP COLUMN IF EXISTS promo_enabled, DROP COLUMN IF EXISTS promo_code,
--   DROP COLUMN IF EXISTS promo_type, DROP COLUMN IF EXISTS promo_value, DROP COLUMN IF EXISTS promo_min_order,
--   DROP COLUMN IF EXISTS promo_date_from, DROP COLUMN IF EXISTS promo_date_to, DROP COLUMN IF EXISTS promo_max_discount;
