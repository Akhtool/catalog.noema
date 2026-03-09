-- Миграция: таблица business_location (филиалы/точки для самовывоза и «В зале»)
-- Дата: 2026-02-03
-- Основано на docs/reference/data-model.md
-- Выполнить вручную в Supabase SQL Editor после применения v2_data_model.sql и v2_auth.sql

-- ============================================================================
-- 1. Таблица business_location
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_location (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  telegram TEXT,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_location_business_id ON business_location(business_id);
CREATE INDEX IF NOT EXISTS idx_business_location_order ON business_location(business_id, order_position);

-- Триггер updated_at (функция update_updated_at_column уже есть из v2_data_model.sql)
DROP TRIGGER IF EXISTS update_business_location_updated_at ON business_location;
CREATE TRIGGER update_business_location_updated_at
  BEFORE UPDATE ON business_location
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE business_location IS 'Филиалы/точки бизнеса для самовывоза и «В зале»';
COMMENT ON COLUMN business_location.business_id IS 'Связь с бизнесом';
COMMENT ON COLUMN business_location.title IS 'Название точки (например, ТЦ Афимолл)';
COMMENT ON COLUMN business_location.address IS 'Адрес для самовывоза/в зале';
COMMENT ON COLUMN business_location.order_position IS 'Порядок отображения в списке';

-- ============================================================================
-- 2. RLS и политики
-- ============================================================================

ALTER TABLE business_location ENABLE ROW LEVEL SECURITY;

-- Публичное чтение (каталог и checkout показывают точки)
DROP POLICY IF EXISTS "public_business_location_select" ON business_location;
CREATE POLICY "public_business_location_select"
ON business_location
FOR SELECT
TO public
USING (true);

-- Владелец/админ бизнеса: полный доступ к своим точкам
DROP POLICY IF EXISTS "owner_business_location_all" ON business_location;
CREATE POLICY "owner_business_location_all"
ON business_location
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.business_id = business_location.business_id
      AND business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.business_id = business_location.business_id
      AND business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);



