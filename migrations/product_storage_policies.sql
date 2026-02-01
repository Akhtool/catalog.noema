-- Миграция: Политики Storage для bucket 'product'
-- Описание: Публичное чтение изображений товаров; загрузка/удаление — только owner/admin
-- Выполнить в Supabase SQL Editor после создания bucket 'product'

-- ============================================================================
-- 1. Публичное чтение (картинки видны в каталоге без авторизации)
-- ============================================================================

DROP POLICY IF EXISTS "public_product_storage_read" ON storage.objects;

CREATE POLICY "public_product_storage_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product');

-- ============================================================================
-- 2. Загрузка — только авторизованные owner/admin
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_product_storage_upload" ON storage.objects;

CREATE POLICY "authenticated_product_storage_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product' AND
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- 3. Обновление / удаление — только owner/admin
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_product_storage_update" ON storage.objects;

CREATE POLICY "authenticated_product_storage_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product' AND
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'product' AND
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "authenticated_product_storage_delete" ON storage.objects;

CREATE POLICY "authenticated_product_storage_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product' AND
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);
