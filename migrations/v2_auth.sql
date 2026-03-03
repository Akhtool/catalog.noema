-- Миграция: V2 Auth & RLS
-- Дата: 2026-01-26
-- Описание: Включение Row Level Security и политик доступа для Admin V2
-- ВАЖНО: Не изменяет структуру таблиц, только RLS и policies

-- ============================================================================
-- 1. Включение Row Level Security (RLS)
-- ============================================================================

ALTER TABLE business ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand ENABLE ROW LEVEL SECURITY;
ALTER TABLE category ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_image ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Helper: Проверка владельца/админа бизнеса
-- ============================================================================

-- Пользователь считается владельцем/админом бизнеса, если:
-- существует запись в business_user с user_id = auth.uid() и role IN ('owner', 'admin')

-- ============================================================================
-- 3. Политики для публичного доступа (неавторизованные пользователи)
-- ============================================================================

-- Business: SELECT разрешён для всех (публичные каталоги)
DROP POLICY IF EXISTS "public_business_select" ON business;
CREATE POLICY "public_business_select"
ON business
FOR SELECT
TO public
USING (true);

-- Category: SELECT только для активных категорий
DROP POLICY IF EXISTS "public_category_select" ON category;
CREATE POLICY "public_category_select"
ON category
FOR SELECT
TO public
USING (is_active = true);

-- Product: SELECT только для активных товаров
DROP POLICY IF EXISTS "public_product_select" ON product;
CREATE POLICY "public_product_select"
ON product
FOR SELECT
TO public
USING (is_active = true);

-- ProductImage: SELECT только для изображений активных товаров
DROP POLICY IF EXISTS "public_product_image_select" ON product_image;
CREATE POLICY "public_product_image_select"
ON product_image
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM product
    WHERE product.id = product_image.product_id
      AND product.is_active = true
  )
);

-- Brand: SELECT запрещён для публики (не используется в публичном каталоге напрямую)
-- Доступ к брендам только через товары

-- Profile: SELECT запрещён для публики
-- BusinessUser: SELECT запрещён для публики

-- ============================================================================
-- 4. Политики для авторизованных владельцев/админов
-- ============================================================================

-- Business: полный доступ к своим бизнесам
DROP POLICY IF EXISTS "owner_business_all" ON business;
CREATE POLICY "owner_business_all"
ON business
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.business_id = business.id
      AND business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.business_id = business.id
      AND business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);

-- Brand: полный доступ к брендам своих бизнесов
DROP POLICY IF EXISTS "owner_brand_all" ON brand;
CREATE POLICY "owner_brand_all"
ON brand
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.business_id = brand.business_id
      AND business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.business_id = brand.business_id
      AND business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);

-- Category: полный доступ к категориям своих бизнесов
DROP POLICY IF EXISTS "owner_category_all" ON category;
CREATE POLICY "owner_category_all"
ON category
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.business_id = category.business_id
      AND business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.business_id = category.business_id
      AND business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);

-- Product: полный доступ к товарам своих бизнесов
DROP POLICY IF EXISTS "owner_product_all" ON product;
CREATE POLICY "owner_product_all"
ON product
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.business_id = product.business_id
      AND business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.business_id = product.business_id
      AND business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);

-- ProductImage: полный доступ через product → business
DROP POLICY IF EXISTS "owner_product_image_all" ON product_image;
CREATE POLICY "owner_product_image_all"
ON product_image
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM product
    WHERE product.id = product_image.product_id
      AND EXISTS (
        SELECT 1
        FROM business_user
        WHERE business_user.business_id = product.business_id
          AND business_user.user_id = auth.uid()
          AND business_user.role IN ('owner', 'admin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM product
    WHERE product.id = product_image.product_id
      AND EXISTS (
        SELECT 1
        FROM business_user
        WHERE business_user.business_id = product.business_id
          AND business_user.user_id = auth.uid()
          AND business_user.role IN ('owner', 'admin')
      )
  )
);

-- Profile: пользователь может создавать, читать и обновлять ТОЛЬКО свой профиль
DROP POLICY IF EXISTS "owner_profile_insert" ON profile;
CREATE POLICY "owner_profile_insert"
ON profile
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "owner_profile_select" ON profile;
CREATE POLICY "owner_profile_select"
ON profile
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "owner_profile_update" ON profile;
CREATE POLICY "owner_profile_update"
ON profile
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- BusinessUser: пользователь может читать ТОЛЬКО свои связи
DROP POLICY IF EXISTS "owner_business_user_select" ON business_user;
CREATE POLICY "owner_business_user_select"
ON business_user
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- BusinessUser: изменения (INSERT/UPDATE/DELETE) — ТОЛЬКО owner
-- Для INSERT проверяем, что текущий пользователь является owner бизнеса
-- Примечание: создание первой записи business_user должно происходить через
-- серверную логику или Supabase Admin API (который обходит RLS)
DROP POLICY IF EXISTS "owner_business_user_insert" ON business_user;
CREATE POLICY "owner_business_user_insert"
ON business_user
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM business_user AS bu
    WHERE bu.business_id = business_user.business_id
      AND bu.user_id = auth.uid()
      AND bu.role = 'owner'
  )
);

DROP POLICY IF EXISTS "owner_business_user_update" ON business_user;
CREATE POLICY "owner_business_user_update"
ON business_user
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM business_user AS bu
    WHERE bu.business_id = business_user.business_id
      AND bu.user_id = auth.uid()
      AND bu.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM business_user AS bu
    WHERE bu.business_id = business_user.business_id
      AND bu.user_id = auth.uid()
      AND bu.role = 'owner'
  )
);

DROP POLICY IF EXISTS "owner_business_user_delete" ON business_user;
CREATE POLICY "owner_business_user_delete"
ON business_user
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM business_user AS bu
    WHERE bu.business_id = business_user.business_id
      AND bu.user_id = auth.uid()
      AND bu.role = 'owner'
  )
);
