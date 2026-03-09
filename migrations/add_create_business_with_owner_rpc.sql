-- Миграция: atomic create_business_with_owner RPC
-- Дата: 2026-03-09
-- Что меняется: добавляет SQL-функцию для атомарного создания business и owner-link в business_user.
-- Зачем: убрать частичные сбои create-flow и выполнять оба шага внутри одной транзакции БД.
-- Обязательна для fresh environments: да, если приложение использует createBusiness через RPC.
-- Rollback / manual recovery notes: при удалении функции приложение нужно вернуть на старый non-atomic flow.

CREATE OR REPLACE FUNCTION create_business_with_owner(
  p_name text,
  p_slug text,
  p_user_id uuid
)
RETURNS TABLE (business_id uuid, business_slug text)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_business_id uuid;
  v_business_slug text;
BEGIN
  INSERT INTO business (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id, slug INTO v_business_id, v_business_slug;

  INSERT INTO business_user (business_id, user_id, role)
  VALUES (v_business_id, p_user_id, 'owner');

  RETURN QUERY
  SELECT v_business_id, v_business_slug;
END;
$$;

COMMENT ON FUNCTION create_business_with_owner(text, text, uuid)
IS 'Атомарно создаёт business и привязывает owner в business_user.';
