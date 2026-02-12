# Миграции базы данных

Этот каталог содержит SQL-миграции для обновления схемы базы данных Supabase.

## Применение миграций

### Через Supabase Dashboard

1. Откройте проект в [Supabase Dashboard](https://supabase.com/dashboard)
2. Перейдите в раздел **SQL Editor**
3. Скопируйте содержимое нужного SQL-файла
4. Вставьте в редактор и нажмите **Run**

### Через Supabase CLI (рекомендуется для продакшена)

```bash
# Применить конкретную миграцию
supabase db execute -f migrations/add_working_hours_to_business.sql

# Применить все миграции по порядку
supabase db push
```

## Текущие миграции

### Обязательные миграции для V2

1. `v2_data_model.sql` - базовая модель данных V2
2. `v2_auth.sql` - настройки аутентификации
3. `v2_create_business_bucket.sql` - хранилище для изображений бизнеса
4. `v2_storage_policies.sql` - политики доступа к хранилищу
5. `add_delivery_fields_to_business.sql` - поля доставки (delivery_regions, city_delivery)
6. `add_working_hours_to_business.sql` - поле для часов работы

### Опциональные миграции

- `add_business_location.sql` - таблица филиалов/точек
- `add_business_theme_brand.sql` - кастомные цвета темы
- `add_product_discount.sql` - система скидок
- `add_whatsapp_per_delivery_type.sql` - отдельные WhatsApp для способов доставки
- `add_promo_to_business.sql` - поля промокода (один активный на бизнес)

## Важные замечания

- **Всегда делайте бэкап** перед применением миграций
- Миграции используют `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` для безопасности
- Применяйте миграции по порядку (сначала базовые, затем дополнительные)
- После применения миграции проверьте работу приложения

## Откат изменений

Для отката V2-миграций используйте:
```bash
supabase db execute -f migrations/rollback_v2_changes.sql
```

⚠️ **Внимание:** Откат удаляет данные! Используйте только в dev-окружении.
