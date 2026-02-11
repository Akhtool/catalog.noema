-- Миграция: добавление поля working_hours в таблицу business
-- Дата: 2026-02-11
-- Описание: Добавляет поле working_hours для отображения часов работы на странице каталога

-- Добавляем поле working_hours (часы работы)
ALTER TABLE business
ADD COLUMN IF NOT EXISTS working_hours TEXT;

-- Комментарий к полю
COMMENT ON COLUMN business.working_hours IS 'Часы работы бизнеса (например, "Пн-Вс: с 10:00 до 22:00")';
