# 🧪 Проверка загрузки изображений (Этап 3.2)

## 📋 Предварительная проверка

### 1. Создание и проверка Supabase Storage

**Вариант А: Через SQL (рекомендуется)**

Выполните в SQL Editor Supabase миграцию:
```sql
-- Файл: migrations/v2_create_business_bucket.sql
-- Создаёт публичный bucket 'business' с ограничениями
```

Или выполните вручную:
```sql
-- Создание bucket 'business'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business',
  'business',
  true, -- Публичный bucket
  5242880, -- 5MB лимит на файл
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Проверка создания
SELECT * FROM storage.buckets WHERE name = 'business';
```

**Вариант Б: Через Dashboard**

1. Откройте Supabase Dashboard → Storage
2. Нажмите "New bucket"
3. Заполните:
   - Name: `business`
   - Public bucket: ✅ включить
   - File size limit: 5MB (опционально)
4. Нажмите "Create bucket"

### 2. Настройка RLS политик для Storage

**Важно:** Если bucket публичный, политики чтения не обязательны, но политики записи/удаления рекомендуется настроить.

Выполните в SQL Editor Supabase:

```sql
-- Сначала проверьте, что bucket создан
SELECT * FROM storage.buckets WHERE name = 'business';

-- Проверка политик Storage (через системное представление)
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%business%';

-- Альтернативный способ: проверка через Supabase Dashboard
-- Storage → Policies → выберите bucket 'business'

-- Если политик нет, выполните готовую миграцию:
-- Файл: migrations/v2_storage_policies.sql

-- Или создайте политики вручную:
-- Политика для чтения (публичный доступ - опционально, если bucket публичный)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business');

-- Политика для записи (только авторизованные владельцы бизнеса)
CREATE POLICY "Authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business' AND
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);

-- Политика для удаления (только авторизованные владельцы бизнеса)
CREATE POLICY "Authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business' AND
  EXISTS (
    SELECT 1
    FROM business_user
    WHERE business_user.user_id = auth.uid()
      AND business_user.role IN ('owner', 'admin')
  )
);
```

### 3. Проверка окружения

Убедитесь, что в `.env.local` есть:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🧪 Пошаговая проверка функциональности

### Шаг 1: Запуск приложения

```bash
npm run dev
```

### Шаг 2: Авторизация

1. Откройте `http://localhost:3000/login`
2. Войдите с учётными данными пользователя, у которого есть доступ к бизнесу
3. Должен произойти редирект на `/admin`

### Шаг 3: Переход на страницу редактирования бизнеса

1. Откройте `http://localhost:3000/admin/business`
2. Должна отобразиться форма редактирования бизнеса
3. Проверьте, что видны поля:
   - Логотип (1:1)
   - Обложка (4:1)
   - Название бизнеса
   - Описание
   - Контакты
   - Яндекс.Метрика

### Шаг 4: Проверка загрузки логотипа

1. **Подготовьте изображение:**
   - Формат: JPG, PNG, WebP
   - Рекомендуемый размер: квадратное (1:1), например 512x512px

2. **Загрузите логотип:**
   - Нажмите на поле "Логотип (1:1)"
   - Выберите изображение
   - Должно появиться сообщение "Логотип успешно загружен" (зелёное)
   - Должен появиться preview изображения слева от поля

3. **Проверьте в браузере:**
   - Откройте DevTools (F12) → Network
   - Найдите запрос к `/storage/v1/object/public/business/...`
   - Проверьте, что статус 200

4. **Проверьте в Supabase:**
   - Откройте Storage → business bucket
   - Должен появиться файл в папке `{business_id}/logo-{timestamp}.{ext}`

### Шаг 5: Проверка загрузки обложки

1. **Подготовьте изображение:**
   - Формат: JPG, PNG, WebP
   - Рекомендуемый размер: 4:1, например 1920x480px

2. **Загрузите обложку:**
   - Нажмите на поле "Обложка (4:1)"
   - Выберите изображение
   - Должно появиться сообщение "Обложка успешно загружена" (зелёное)
   - Должен появиться preview изображения слева от поля

3. **Проверьте в Supabase:**
   - Откройте Storage → business bucket
   - Должен появиться файл в папке `{business_id}/cover-{timestamp}.{ext}`

### Шаг 6: Сохранение формы

1. **Заполните остальные поля** (если нужно)
2. **Нажмите "Сохранить"**
3. Должно появиться сообщение "Данные успешно сохранены"

### Шаг 7: Проверка сохранения URL в базу данных

1. Откройте Supabase Dashboard → Table Editor → business
2. Найдите ваш бизнес
3. Проверьте поля:
   - `logo_url` — должен содержать публичный URL
   - `cover_url` — должен содержать публичный URL
4. URL должен быть в формате:
   ```
   https://{project}.supabase.co/storage/v1/object/public/business/{business_id}/logo-{timestamp}.{ext}
   ```

### Шаг 8: Проверка удаления старых изображений

1. Загрузите новое изображение логотипа
2. Проверьте в Storage:
   - Старое изображение должно быть удалено
   - Осталось только новое изображение

### Шаг 9: Проверка публичного доступа к изображениям

1. Скопируйте URL из `logo_url` или `cover_url`
2. Откройте URL в новой вкладке браузера (без авторизации)
3. Изображение должно отображаться

---

## ❌ Возможные проблемы и решения

### Проблема 1: "Ошибка загрузки изображения"

**Причины:**
- Bucket не существует
- Нет прав на запись в Storage
- Неправильные RLS политики

**Решение:**
1. Проверьте существование bucket `business`
2. Сделайте bucket публичным или настройте RLS политики (см. выше)
3. Проверьте, что пользователь авторизован и имеет роль owner/admin

### Проблема 2: "Бизнес не найден"

**Причины:**
- Пользователь не привязан к бизнесу
- Нет записи в таблице `business_user`

**Решение:**
1. Проверьте таблицу `business_user`:
   ```sql
   SELECT * FROM business_user WHERE user_id = 'your_user_id';
   ```
2. Если записи нет, создайте её:
   ```sql
   INSERT INTO business_user (business_id, user_id, role)
   VALUES ('your_business_id', 'your_user_id', 'owner');
   ```

### Проблема 3: Изображение не отображается после загрузки

**Причины:**
- URL не сохранился в базу данных
- Проблемы с CORS
- Bucket не публичный

**Решение:**
1. Проверьте, что URL сохранился в `business.logo_url` или `business.cover_url`
2. Проверьте настройки CORS в Supabase Storage
3. Убедитесь, что bucket публичный или RLS политики настроены правильно

### Проблема 4: "Файл должен быть изображением"

**Причины:**
- Загружен файл не изображение
- Неправильный MIME type

**Решение:**
- Используйте только файлы изображений (JPG, PNG, WebP, GIF)

### Проблема 5: Preview не обновляется

**Причины:**
- Проблемы с состоянием React
- URL не обновился

**Решение:**
1. Проверьте консоль браузера на ошибки
2. Обновите страницу
3. Проверьте, что `logoUrl` и `coverUrl` обновляются в состоянии

---

## ✅ Чек-лист проверки

- [ ] Bucket `business` существует в Supabase Storage
- [ ] Bucket публичный или настроены RLS политики
- [ ] Пользователь авторизован и имеет доступ к бизнесу
- [ ] Загрузка логотипа работает
- [ ] Preview логотипа отображается
- [ ] Загрузка обложки работает
- [ ] Preview обложки отображается
- [ ] URL сохраняется в `business.logo_url`
- [ ] URL сохраняется в `business.cover_url`
- [ ] Старые изображения удаляются при загрузке новых
- [ ] Изображения доступны публично по URL
- [ ] Сохранение формы работает корректно
- [ ] Обработка ошибок работает (попробуйте загрузить не-изображение)

---

## 🔍 Дополнительная проверка в коде

### Проверка server action

Откройте `app/admin/business/actions.ts`:
- Функция `uploadBusinessImage` должна быть экспортирована
- Проверка авторизации работает
- Проверка типа файла работает
- Генерация уникального имени файла работает

### Проверка формы

Откройте `app/admin/business/business-form.tsx`:
- Состояния `logoUrl` и `coverUrl` инициализируются из `business`
- Обработчики `handleLogoUpload` и `handleCoverUpload` работают
- Preview отображается при наличии URL
- URL передаётся в `formData` при сохранении

---

## 📝 Логи для отладки

Если что-то не работает, проверьте:

1. **Консоль браузера (F12):**
   - Ошибки JavaScript
   - Сетевые запросы к Storage API

2. **Логи Supabase:**
   - Dashboard → Logs → API Logs
   - Проверьте запросы к Storage

3. **Логи сервера:**
   - В терминале, где запущен `npm run dev`
   - Ошибки server actions

---

## 🎯 Ожидаемый результат

После успешной проверки:
- ✅ Можно загружать логотип и обложку
- ✅ Preview отображается сразу после загрузки
- ✅ URL сохраняется в базу данных
- ✅ Изображения доступны публично
- ✅ Старые изображения удаляются автоматически
- ✅ Форма сохраняет все данные корректно

