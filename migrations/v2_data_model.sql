-- Миграция: V2 Data Model
-- Дата: 2026-01-26
-- Описание: Создание новых таблиц и обновление существующих для V2 админки
-- Основано на docs/reference/data-model.md

-- ============================================================================
-- 1. Создание новых таблиц
-- ============================================================================

-- Таблица brand (бренды товаров)
CREATE TABLE IF NOT EXISTS brand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица product_image (изображения товаров)
CREATE TABLE IF NOT EXISTS product_image (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица profile (профили пользователей)
CREATE TABLE IF NOT EXISTS profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица business_user (связь пользователей с бизнесами)
CREATE TABLE IF NOT EXISTS business_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- ============================================================================
-- 2. Обновление таблицы product
-- ============================================================================

-- Добавляем новые поля
ALTER TABLE product
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brand(id) ON DELETE SET NULL;

-- Удаляем устаревшие поля (если они существуют)
ALTER TABLE product
  DROP COLUMN IF EXISTS images,
  DROP COLUMN IF EXISTS brand;

-- ============================================================================
-- 3. Индексы для оптимизации запросов
-- ============================================================================

-- Индексы для brand
CREATE INDEX IF NOT EXISTS idx_brand_business_id ON brand(business_id);
CREATE INDEX IF NOT EXISTS idx_brand_is_active ON brand(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_business_active ON brand(business_id, is_active);

-- Индексы для product_image
CREATE INDEX IF NOT EXISTS idx_product_image_product_id ON product_image(product_id);
CREATE INDEX IF NOT EXISTS idx_product_image_position ON product_image(product_id, position);

-- Индексы для product
CREATE INDEX IF NOT EXISTS idx_product_brand_id ON product(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_business_category ON product(business_id, category_id);
CREATE INDEX IF NOT EXISTS idx_product_is_active ON product(is_active);

-- Индексы для business_user
CREATE INDEX IF NOT EXISTS idx_business_user_business_id ON business_user(business_id);
CREATE INDEX IF NOT EXISTS idx_business_user_user_id ON business_user(user_id);
CREATE INDEX IF NOT EXISTS idx_business_user_role ON business_user(role);

-- ============================================================================
-- 4. Триггеры для автоматического обновления updated_at
-- ============================================================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для brand
DROP TRIGGER IF EXISTS update_brand_updated_at ON brand;
CREATE TRIGGER update_brand_updated_at
  BEFORE UPDATE ON brand
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для product_image
DROP TRIGGER IF EXISTS update_product_image_updated_at ON product_image;
CREATE TRIGGER update_product_image_updated_at
  BEFORE UPDATE ON product_image
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для profile
DROP TRIGGER IF EXISTS update_profile_updated_at ON profile;
CREATE TRIGGER update_profile_updated_at
  BEFORE UPDATE ON profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для business_user
DROP TRIGGER IF EXISTS update_business_user_updated_at ON business_user;
CREATE TRIGGER update_business_user_updated_at
  BEFORE UPDATE ON business_user
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Комментарии к таблицам и полям
-- ============================================================================

COMMENT ON TABLE brand IS 'Бренды товаров, используемые в каталоге бизнеса';
COMMENT ON COLUMN brand.business_id IS 'Связь с бизнесом';
COMMENT ON COLUMN brand.name IS 'Название бренда';
COMMENT ON COLUMN brand.is_active IS 'Мягкое удаление (default true)';

COMMENT ON TABLE product_image IS 'Изображения товаров с поддержкой порядка отображения';
COMMENT ON COLUMN product_image.product_id IS 'Связь с товаром';
COMMENT ON COLUMN product_image.url IS 'URL изображения';
COMMENT ON COLUMN product_image.position IS 'Порядок отображения (0 = главное фото)';

COMMENT ON TABLE profile IS 'Профили пользователей системы (владельцы бизнесов)';
COMMENT ON COLUMN profile.id IS 'Связь с auth.users.id';
COMMENT ON COLUMN profile.email IS 'Email пользователя';
COMMENT ON COLUMN profile.full_name IS 'Полное имя пользователя';

COMMENT ON TABLE business_user IS 'Связь пользователей с бизнесами (права доступа)';
COMMENT ON COLUMN business_user.business_id IS 'Связь с бизнесом';
COMMENT ON COLUMN business_user.user_id IS 'Связь с профилем пользователя';
COMMENT ON COLUMN business_user.role IS 'Роль: owner (владелец) или admin (администратор)';

COMMENT ON COLUMN product.subtitle IS 'Подзаголовок товара (размер, объём, вариант)';
COMMENT ON COLUMN product.brand_id IS 'Связь с брендом (опционально)';



