# Миграции базы данных

Этот каталог содержит SQL-миграции для схемы Supabase.

## Применение миграций

### Через Supabase Dashboard

1. Откройте проект в [Supabase Dashboard](https://supabase.com/dashboard)
2. Перейдите в раздел **SQL Editor**
3. Скопируйте содержимое нужного SQL-файла
4. Вставьте в редактор и нажмите **Run**

### Через Supabase CLI

```bash
# Выполнить конкретную миграцию
supabase db execute -f migrations/add_working_hours_to_business.sql

# Применить все миграции по порядку
supabase db push
```

## Классификация миграций

### Обязательные для текущей схемы приложения

1. `v2_data_model.sql`
2. `v2_auth.sql`
3. `v2_create_business_bucket.sql`
4. `v2_storage_policies.sql`
5. `add_delivery_fields_to_business.sql`
6. `add_delivery_types_to_business.sql`
7. `add_business_location.sql`
8. `add_business_location_is_active.sql`
9. `add_product_subtitle.sql`
10. `add_product_order.sql`
11. `add_product_discount.sql`
12. `add_reorder_products_rpc.sql`
13. `add_create_business_with_owner_rpc.sql`
14. `add_whatsapp_per_delivery_type.sql`
15. `add_business_theme_brand.sql`
16. `add_promo_to_business.sql`
17. `add_working_hours_to_business.sql`

### Security hotfixes

- `enable_rls_policies_for_admin.sql`
- `enable_rls_policies_for_admin_safe.sql`
- `product_storage_policies.sql`
- `supabase/migrations/20250307_remove_public_write_rls.sql`
- `supabase/migrations/ROLLBACK_20250307_remove_public_write_rls.sql`

### Legacy / rollback / historical reference

- `rollback_v2_changes.sql`

Примечание:

- `rollback_v2_changes.sql` является устаревшим частичным rollback раннего V2;
- он не покрывает все февральские и мартовские изменения текущей схемы и не должен считаться полным rollback для текущего состояния проекта.

## Важные правила

- всегда делайте backup перед применением миграций;
- миграции должны идти по порядку;
- каждое runtime-изменение схемы должно иметь отдельную миграцию в репозитории;
- после изменения схемы нужно проверить актуальность [docs/reference/data-model.md](../docs/reference/data-model.md);
- правила ведения миграций зафиксированы в [docs/reference/migration-rules.md](../docs/reference/migration-rules.md).
