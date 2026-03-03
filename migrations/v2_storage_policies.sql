-- Миграция: V2 Storage Policies (ПРОДАКШЕН)
-- Дата: 2026-01-27
-- Описание: Настройка RLS политик для Supabase Storage bucket 'business'
-- Используется для загрузки логотипов и обложек бизнесов

-- ============================================================================
-- 1. Проверка существования bucket
-- ============================================================================

-- Если bucket не существует, создайте его через migrations/v2_create_business_bucket.sql

-- ============================================================================
-- 2. Политики Storage используют прямой запрос к business_user
-- ============================================================================
-- Политика business_user разрешает SELECT для user_id = auth.uid(),
-- поэтому прямой запрос в политике Storage будет работать корректно

-- ============================================================================
-- 3. Политики для публичного чтения
-- ============================================================================

DROP POLICY IF EXISTS "public_business_storage_read" ON storage.objects;

CREATE POLICY "public_business_storage_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business');

-- ============================================================================
-- 4. Политики для авторизованных пользователей (загрузка)
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_business_storage_upload" ON storage.objects;

CREATE POLICY "authenticated_business_storage_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business' AND
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- 5. Политики для авторизованных пользователей (обновление)
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_business_storage_update" ON storage.objects;

CREATE POLICY "authenticated_business_storage_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business' AND
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'business' AND
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- 6. Политики для авторизованных пользователей (удаление)
-- ============================================================================

DROP POLICY IF EXISTS "authenticated_business_storage_delete" ON storage.objects;

CREATE POLICY "authenticated_business_storage_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business' AND
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- Примечания
-- ============================================================================

-- 1. Политики Storage используют прямой запрос к business_user
-- 2. Политика business_user разрешает SELECT для user_id = auth.uid(),
--    поэтому запрос в политике Storage работает корректно
-- 3. Проверка доступа выполняется через EXISTS с проверкой роли
-- 4. Bucket должен быть создан через migrations/v2_create_business_bucket.sql
-- 5. Файлы хранятся в структуре: {business_id}/{type}-{timestamp}.{ext}
