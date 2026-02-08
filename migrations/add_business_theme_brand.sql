-- Миграция: акцентный цвет (тема) для публичного каталога
-- Дата: 2026-02-08
-- Описание: Добавляет поля theme_brand_hsl и theme_brand_foreground в business.
--           Используются только для визуального оформления публичной страницы каталога.
--           Если поля null — используется дефолтная тема приложения.

ALTER TABLE business
ADD COLUMN IF NOT EXISTS theme_brand_hsl TEXT;

ALTER TABLE business
ADD COLUMN IF NOT EXISTS theme_brand_foreground TEXT;

COMMENT ON COLUMN business.theme_brand_hsl IS 'Акцентный цвет каталога. Формат: HSL-триплет без hsl(): "48 100% 50%". null = дефолт.';
COMMENT ON COLUMN business.theme_brand_foreground IS 'Цвет текста на акцентном фоне: "black" | "white". null = дефолт/расчёт на фронтенде.';

