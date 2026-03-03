-- Добавляет колонку subtitle в product, если её нет (часть V2 Data Model).
-- Выполнить в Supabase SQL Editor, если getProduct падает с "column product.subtitle does not exist".

ALTER TABLE product
  ADD COLUMN IF NOT EXISTS subtitle TEXT;
