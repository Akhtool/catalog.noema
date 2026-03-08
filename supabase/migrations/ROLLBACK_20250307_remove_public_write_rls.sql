-- ОТКАТ миграции 20250307: вернуть публичные INSERT/UPDATE/DELETE (небезопасно).
-- Использовать только если после применения миграции что-то сломалось и нужно срочно откатиться.
-- После отката обязательно заново запланировать удаление этих политик (через ветку или тест).

-- business
CREATE POLICY "Allow public insert to business" ON public.business FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update to business" ON public.business FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete to business" ON public.business FOR DELETE TO public USING (true);

-- category
CREATE POLICY "Allow public insert to category" ON public.category FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update to category" ON public.category FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete to category" ON public.category FOR DELETE TO public USING (true);

-- product
CREATE POLICY "Allow public insert to product" ON public.product FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update to product" ON public.product FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete to product" ON public.product FOR DELETE TO public USING (true);
