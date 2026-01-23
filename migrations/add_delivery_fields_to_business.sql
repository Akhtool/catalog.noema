-- Миграция: добавление полей доставки в таблицу business
-- Дата: 2026-01-23
-- Описание: Добавляет поля delivery_regions и city_delivery для хранения информации о доставке

-- Добавляем поле delivery_regions (регионы доставки)
ALTER TABLE business
ADD COLUMN IF NOT EXISTS delivery_regions TEXT;

-- Добавляем поле city_delivery (доставка по городу)
ALTER TABLE business
ADD COLUMN IF NOT EXISTS city_delivery TEXT;

-- Комментарии к полям
COMMENT ON COLUMN business.delivery_regions IS 'Регионы доставки (например, "Россия / СНГ / Европа")';
COMMENT ON COLUMN business.city_delivery IS 'Информация о доставке по городу (например, "По городу бесплатно")';
