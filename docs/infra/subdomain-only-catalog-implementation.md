# Реализация каталогов **только на поддоменах** (`{slug}.catlg.ru`) без редиректа

Цель: каталог каждого клиента открывается **только** по адресу вида `https://{slug}.catlg.ru`, при этом URL в браузере **не меняется** (без redirect). Доступ к `https://catlg.ru/{slug}` должен быть **закрыт** (например, 404), чтобы не было дублей и «лишнего» пути.

---

## 1) Принцип работы (как это устроено профессионально)

- **Поддомен** определяет клиента (tenant): `crusty.catlg.ru` → `slug = "crusty"`.
- На уровне Next.js делаем **rewrite** (внутреннее переписывание маршрута):
  - запрос: `https://crusty.catlg.ru/` (Host = `crusty.catlg.ru`)
  - внутри приложения: маршрут становится `/${slug}/` → `/crusty/`
  - браузер продолжает показывать `crusty.catlg.ru` (это именно rewrite, не redirect).
- Путь `catlg.ru/{slug}` **не используем**: если Host = `catlg.ru` или `www.catlg.ru` и запрошен `/{slug}`, возвращаем 404.

---

## 2) Подготовка (инфра)

Убедитесь, что сделано:

- **DNS**:
  - `A @` → IP VPS
  - `A *` → IP VPS (wildcard)
- **Nginx**:
  - `server_name catlg.ru www.catlg.ru *.catlg.ru;`
  - проксирование на Next.js c сохранением Host:
    - `proxy_set_header Host $host;`
- **Wildcard SSL**:
  - сертификат покрывает `catlg.ru` и `*.catlg.ru`
  - проверка: `curl -I https://test.catlg.ru` возвращает 200/301 без ошибок TLS

---

## 3) Шаг 1 — Middleware: поддомен → rewrite на `/${slug}`

### 3.1. Создать `middleware.ts` в корне проекта

Логика:

- берём hostname из запроса
- если hostname оканчивается на `.catlg.ru` и это не `catlg.ru`/`www.catlg.ru`:
  - `slug = первая часть до первой точки`
  - делаем rewrite на `/${slug}${pathname}`

### 3.2. Исключить системные пути (обязательно)

Middleware не должен трогать:

- `/_next/*` (ассеты Next.js)
- `/api/*` (API routes)
- `/favicon.ico`, `/robots.txt`, `/sitemap.xml` (статика)

Иначе легко «сломать» загрузку ассетов/апи.

### 3.3. Поведение для разных Host

| Host | Ожидаемо |
|------|----------|
| `catlg.ru` | middleware ничего не меняет |
| `www.catlg.ru` | middleware ничего не меняет |
| `crusty.catlg.ru` | rewrite на `/crusty` |
| `crusty.catlg.ru/products` | rewrite на `/crusty/products` |

---

## 4) Шаг 2 — Запретить `catlg.ru/{slug}` (без редиректа)

### 4.1. Вариант (рекомендуемый): 404 на уровне страницы каталога

В `app/[slug]/page.tsx` в начале `Page()`:

- читаем `Host` через `headers()`
- если `host` равен `catlg.ru` или `www.catlg.ru` → вызываем `notFound()`

Почему это работает:

- при заходе на `crusty.catlg.ru` Host остаётся `crusty.catlg.ru`, даже после rewrite
- значит каталог откроется
- а `catlg.ru/crusty` будет заблокирован

> Примечание: `generateMetadata()` может всё равно отработать для `catlg.ru/[slug]` до `notFound()`. Если это критично (лишние запросы к БД), можно добавить такую же проверку Host и возвращать дефолтные метаданные, не ходя в БД.

---

## 5) Шаг 3 — Проверка в dev и prod

### 5.1. Быстрые проверки

- `https://catlg.ru` → лендинг (`app/page.tsx`)
- `https://catlg.ru/crusty` → **404**
- `https://crusty.catlg.ru` → каталог crusty (200)
- `https://unknown.catlg.ru` → 404 (если slug не найден в БД)

### 5.2. Команды на VPS

```bash
curl -I https://catlg.ru
curl -I https://crusty.catlg.ru
curl -I https://catlg.ru/crusty
```

Ожидаемо:

- `catlg.ru` → 200
- `crusty.catlg.ru` → 200
- `catlg.ru/crusty` → 404

---

## 6) Шаг 4 — Обновление ссылок в админке/интерфейсе

Если где-то в UI генерируется ссылка на каталог, используем только:

- `https://{slug}.catlg.ru`

И не показываем/не сохраняем ссылки вида `https://catlg.ru/{slug}`.

---

## 7) Частые ошибки

- **Нет wildcard DNS** (`* A → IP VPS`) → поддомены не резолвятся.
- **Нет wildcard SSL** → браузер ругается на сертификат на `*.catlg.ru`.
- **Nginx не сохраняет Host** → приложение не увидит поддомен (`Host` станет `catlg.ru`), и slug не извлечётся.
- **Middleware трогает `/_next`** → ломаются стили/скрипты.


