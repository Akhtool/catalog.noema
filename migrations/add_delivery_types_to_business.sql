-- Миграция: добавление delivery_types в таблицу business
-- Дата: 2026-03-09
-- Описание: фиксирует в repo-схеме поле, которое уже используется в runtime и Supabase types.

ALTER TABLE business
ADD COLUMN IF NOT EXISTS delivery_types TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_delivery_types_valid'
  ) THEN
    ALTER TABLE business
    ADD CONSTRAINT business_delivery_types_valid
    CHECK (
      delivery_types IS NULL
      OR delivery_types <@ ARRAY['delivery', 'pickup', 'dine-in']::TEXT[]
    );
  END IF;
END $$;

COMMENT ON COLUMN business.delivery_types IS 'Доступные способы получения заказа: delivery, pickup, dine-in. null = использовать дефолтный набор на клиенте.';
