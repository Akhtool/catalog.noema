-- Один запрос для обновления порядка товаров (избегаем N round-trips и ECONNRESET).
-- Выполнить в Supabase SQL Editor.

CREATE OR REPLACE FUNCTION reorder_products(p_business_id uuid, p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE product p
  SET "order" = ord.idx - 1
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS ord(id, idx)
  WHERE p.id = ord.id
    AND p.business_id = p_business_id;
END;
$$;

COMMENT ON FUNCTION reorder_products(uuid, uuid[]) IS 'Обновляет поле order у товаров по списку id (индекс = порядок).';
