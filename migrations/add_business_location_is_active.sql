-- Добавляет поле is_active в business_location (скрытие филиала: ремонт, временно закрыт и т.д.)
-- Выполнить вручную в Supabase SQL Editor после add_business_location.sql

ALTER TABLE business_location
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN business_location.is_active IS 'Показывать точку в выборе при оформлении заказа (false = скрыта, например на ремонте)';
