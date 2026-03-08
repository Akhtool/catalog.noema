# Аудит tenant isolation

Дата: 2026-03-08

## Что проверено в коде

- server actions для:
  - `business`
  - `category`
  - `brand`
  - `product`
  - `business_location`
  - `product_image`
- проверки доступа через `business_user`
- передача `businessId`, `categoryId`, `brandId`, `productId`, `locationId`

## Что найдено

### 1. Риск межтенантной привязки `product -> category/brand`

Файл:

- `app/admin/product/actions.ts`

Проблема:

- `createProduct` и `updateProduct` принимали `categoryId` и `brandId` из клиента
- при этом не проверялось, что эти сущности принадлежат тому же `business_id`
- владелец бизнеса A теоретически мог попытаться сохранить товар бизнеса A с категорией или брендом бизнеса B

Что сделано:

- добавлена server-side проверка `validateProductRelationsBelongToBusiness(...)`
- теперь перед созданием и обновлением товара код проверяет:
  - категория существует
  - категория принадлежит текущему бизнесу
  - бренд, если передан, существует
  - бренд принадлежит текущему бизнесу

Статус:

- исправлено в коде

### 2. Ошибка проверки доступа в `saveImageUrl`

Файл:

- `app/admin/business/actions.ts`

Проблема:

- доступ проверялся через `getBusinessId(...)`, который возвращал только первый бизнес пользователя
- это не давало прямой межтенантной дыры, но ломало корректную работу для пользователя с несколькими бизнесами

Что сделано:

- проверка переведена на `userHasAccessToBusinessId(...)`
- теперь доступ проверяется по конкретному `businessId`, а не по "первому попавшемуся" бизнесу

Статус:

- исправлено в коде

## Что по коду выглядит корректно

- `category`, `brand`, `business_location`, `product_image` сначала читают целевую сущность, потом проверяют доступ через её `business_id`
- список сущностей для бизнеса фильтруется по `business_id`
- server-only ключи и admin client не используются в клиентском коде

## Что ещё нужно проверить вручную в Supabase

Полный tenant isolation закрывается не только приложением, но и логикой в БД.

Были нужны 2 ручные проверки. Обе пройдены.

### 1. Нет ли уже испорченных межтенантных связей в данных

Выполни в SQL Editor:

```sql
select
  p.id as product_id,
  p.business_id as product_business_id,
  p.category_id,
  c.business_id as category_business_id,
  p.brand_id,
  b.business_id as brand_business_id
from public.product p
left join public.category c on c.id = p.category_id
left join public.brand b on b.id = p.brand_id
where
  (p.category_id is not null and c.business_id is distinct from p.business_id)
  or
  (p.brand_id is not null and b.business_id is distinct from p.business_id);
```

Результат:

- `0 rows`
- межтенантных связей `product -> category/brand` в текущих данных не найдено

### 2. Проверить функцию `reorder_products`

В приложении она вызывается с `businessId`, но важно, чтобы сама SQL-функция не могла переставлять чужие товары при подмене массива id.

Выполни:

```sql
select pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'reorder_products';
```

Проверенный результат:

```sql
CREATE OR REPLACE FUNCTION public.reorder_products(p_business_id uuid, p_ordered_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE product p
  SET "order" = ord.idx - 1
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS ord(id, idx)
  WHERE p.id = ord.id
    AND p.business_id = p_business_id;
END;
$function$
```

Вывод:

- функция ограничивает обновление только товарами из переданного `p_business_id`
- явной межтенантной дыры в `reorder_products` не видно

## Вывод

На уровне приложения и проверенной части БД основные tenant isolation риски закрыты:

- межтенантных связей в данных не найдено
- `reorder_products` ограничивает обновление по `business_id`
- server actions дополнительно валидируют принадлежность `category` и `brand` текущему бизнесу

Пункт tenant isolation можно считать закрытым.

