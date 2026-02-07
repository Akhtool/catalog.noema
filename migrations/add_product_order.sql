-- Порядок отображения товаров в каталоге (настраивается админом).
-- Выполнить в Supabase SQL Editor.

ALTER TABLE product
  ADD COLUMN IF NOT EXISTS "order" integer NOT NULL DEFAULT 0;

-- Backfill: присвоить порядок по created_at в рамках каждого business_id
WITH numbered AS (
  SELECT id, business_id,
         ROW_NUMBER() OVER (PARTITION BY business_id ORDER BY created_at, id) - 1 AS rn
  FROM product
)
UPDATE product p
SET "order" = numbered.rn
FROM numbered
WHERE p.id = numbered.id;
