-- РњРёРіСЂР°С†РёСЏ: РџРѕР»РЅС‹Р№ РѕС‚РєР°С‚ РёР·РјРµРЅРµРЅРёР№ V2
-- Р”Р°С‚Р°: 2026-01-26
-- РћРїРёСЃР°РЅРёРµ: РћС‚РєР°С‚ РІСЃРµС… РёР·РјРµРЅРµРЅРёР№ РёР· roadmap_v2 - РІРѕР·РІСЂР°С‚ Рє СЃРѕСЃС‚РѕСЏРЅРёСЋ РґРѕ V2
-- Р’РђР–РќРћ: РџСЂРёРјРµРЅРёС‚СЊ РЅР° production РґР»СЏ РїРѕР»РЅРѕРіРѕ РѕС‚РєР°С‚Р° РІСЃРµС… РёР·РјРµРЅРµРЅРёР№ V2

-- ============================================================================
-- 1. РћС‚РєР»СЋС‡РµРЅРёРµ RLS РґР»СЏ РІСЃРµС… С‚Р°Р±Р»РёС†
-- ============================================================================

ALTER TABLE business DISABLE ROW LEVEL SECURITY;
ALTER TABLE brand DISABLE ROW LEVEL SECURITY;
ALTER TABLE category DISABLE ROW LEVEL SECURITY;
ALTER TABLE product DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_image DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE profile DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. РЈРґР°Р»РµРЅРёРµ РІСЃРµС… РїРѕР»РёС‚РёРє RLS РёР· V2
-- ============================================================================

-- РџСѓР±Р»РёС‡РЅС‹Рµ РїРѕР»РёС‚РёРєРё V2
DROP POLICY IF EXISTS "public_business_select" ON business;
DROP POLICY IF EXISTS "public_category_select" ON category;
DROP POLICY IF EXISTS "public_product_select" ON product;
DROP POLICY IF EXISTS "public_product_image_select" ON product_image;

-- РџРѕР»РёС‚РёРєРё РґР»СЏ РІР»Р°РґРµР»СЊС†РµРІ/Р°РґРјРёРЅРѕРІ V2
DROP POLICY IF EXISTS "owner_business_all" ON business;
DROP POLICY IF EXISTS "owner_brand_all" ON brand;
DROP POLICY IF EXISTS "owner_category_all" ON category;
DROP POLICY IF EXISTS "owner_product_all" ON product;
DROP POLICY IF EXISTS "owner_product_image_all" ON product_image;
DROP POLICY IF EXISTS "owner_profile_insert" ON profile;
DROP POLICY IF EXISTS "owner_profile_select" ON profile;
DROP POLICY IF EXISTS "owner_profile_update" ON profile;
DROP POLICY IF EXISTS "owner_business_user_select" ON business_user;
DROP POLICY IF EXISTS "owner_business_user_insert" ON business_user;
DROP POLICY IF EXISTS "owner_business_user_update" ON business_user;
DROP POLICY IF EXISTS "owner_business_user_delete" ON business_user;

-- ============================================================================
-- 3. Р’РѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ СЃС‚СЂСѓРєС‚СѓСЂС‹ С‚Р°Р±Р»РёС†С‹ product
-- ============================================================================

-- РЈРґР°Р»СЏРµРј РЅРѕРІС‹Рµ РїРѕР»СЏ V2
ALTER TABLE product
  DROP COLUMN IF EXISTS subtitle,
  DROP COLUMN IF EXISTS brand_id;

-- Р’РѕР·РІСЂР°С‰Р°РµРј СЃС‚Р°СЂС‹Рµ РїРѕР»СЏ (РµСЃР»Рё РѕРЅРё Р±С‹Р»Рё СѓРґР°Р»РµРЅС‹)
ALTER TABLE product
  ADD COLUMN IF NOT EXISTS images TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT;

-- ============================================================================
-- 4. РЈРґР°Р»РµРЅРёРµ РёРЅРґРµРєСЃРѕРІ V2
-- ============================================================================

DROP INDEX IF EXISTS idx_brand_business_id;
DROP INDEX IF EXISTS idx_brand_is_active;
DROP INDEX IF EXISTS idx_brand_business_active;
DROP INDEX IF EXISTS idx_product_image_product_id;
DROP INDEX IF EXISTS idx_product_image_position;
DROP INDEX IF EXISTS idx_product_brand_id;
DROP INDEX IF EXISTS idx_business_user_business_id;
DROP INDEX IF EXISTS idx_business_user_user_id;
DROP INDEX IF EXISTS idx_business_user_role;

-- ============================================================================
-- 5. РЈРґР°Р»РµРЅРёРµ С‚СЂРёРіРіРµСЂРѕРІ V2
-- ============================================================================

DROP TRIGGER IF EXISTS update_brand_updated_at ON brand;
DROP TRIGGER IF EXISTS update_product_image_updated_at ON product_image;
DROP TRIGGER IF EXISTS update_profile_updated_at ON profile;
DROP TRIGGER IF EXISTS update_business_user_updated_at ON business_user;

-- ============================================================================
-- Р Р•Р—РЈР›Р¬РўРђРў:
-- - RLS РѕС‚РєР»СЋС‡РµРЅ РґР»СЏ РІСЃРµС… С‚Р°Р±Р»РёС†
-- - Р’СЃРµ РїРѕР»РёС‚РёРєРё V2 СѓРґР°Р»РµРЅС‹
-- - РЎС‚СЂСѓРєС‚СѓСЂР° product РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅР° (images, brand РІРѕР·РІСЂР°С‰РµРЅС‹)
-- - РќРѕРІС‹Рµ С‚Р°Р±Р»РёС†С‹ (brand, product_image, profile, business_user) РѕСЃС‚Р°СЋС‚СЃСЏ, РЅРѕ РЅРµ РёСЃРїРѕР»СЊР·СѓСЋС‚СЃСЏ
-- ============================================================================