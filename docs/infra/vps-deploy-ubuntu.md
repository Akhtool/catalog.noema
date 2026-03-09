# Деплой catalog.noema на VPS (Ubuntu 24.04 LTS) — Next.js + Nginx + SSL

Эта инструкция рассчитана на ситуацию: вы давно не деплоили “на голый сервер”, у вас **Next.js (Node.js)**, и внешние сервисы (**Supabase**) уже хостят базу/хранилище.

> Если вы используете **поддомены вида `[slug].catlg.ru`**, важно не ломать `Host` при проксировании (см. раздел про Nginx и примечание про поддомены в конце).

---

## Предпосылки и принятые решения

### Что будет на VPS
- **Nginx**: принимает HTTP/HTTPS на 80/443.
- **Node.js + Next.js**: приложение стартует на `127.0.0.1:3000`.
- **systemd**: держит процесс `next start`, перезапускает при падении, даёт логи в `journalctl`.

### Что НЕ будет на VPS
- Postgres / Redis / S3 / очереди и т.п. (всё это у вас, судя по проекту, можно держать вне VPS — в Supabase и т.д.).

---

## 0) Ресурсы VPS: 1 CPU / 2GB RAM / 10GB NVMe — что важно сделать

### Почему всё равно важно аккуратно настроить
На 2GB RAM обычно уже комфортнее, но Node + Next.js + Nginx + базовые службы системы всё равно могут упираться в память на пиках (несколько одновременных запросов, тяжёлые SSR-страницы, сборка на сервере).

### Что рекомендуется сделать
1. **Сделать swap** (снижает риск OOM/убийства процесса при пиках).
2. **Не собирать лишнее** (не держать “dev” режим, не ставить тяжёлые сервисы).
3. **Следить за диском** (логи, кеши, артефакты сборки).

---

## 1) Подготовка локально (Windows 10/11, PowerShell)

### 1.1. Подключение по SSH
Обычно достаточно:
- `ssh root@<IP_СЕРВЕРА>`

Если ключей ещё нет:
1. Создайте ключ:
   - `ssh-keygen -t ed25519 -C "catalog-noema-deploy"`
2. Скопируйте публичный ключ на сервер (варианты):
   - Если есть `scp`:
     - `scp $env:USERPROFILE\.ssh\id_ed25519.pub root@<IP_СЕРВЕРА>:/root/pubkey.txt`
     - Потом на сервере руками добавьте содержимое в `~/.ssh/authorized_keys`
   - Или используйте GUI/панель провайдера (часто есть поле “SSH keys”).

> В Windows команды отличаются в зависимости от окружения, но принцип один: на сервере в `~/.ssh/authorized_keys` должен лежать ваш публичный ключ.

---

## 2) Базовая настройка VPS (Ubuntu 24.04)

Все команды ниже выполняйте на VPS. Сначала заходите под `root`, затем создайте пользователя `deploy`.

### 2.1. Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2. Создаём пользователя `deploy`
```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
```

Проверка, что шаг выполнен корректно:
- В выводе `adduser` должны быть строки про создание пользователя `deploy` и домашней директории `/home/deploy`.
- Пароль должен завершиться сообщением `passwd: password updated successfully`.

> Если после `apt upgrade` вы видите `Pending kernel upgrade`, это нормально. Рекомендуется выполнить `sudo reboot`, чтобы VPS загрузился с новым kernel.

### 2.3. Настраиваем SSH доступ для `deploy`
1. Создайте папку и права:
```bash
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy chmod 700 /home/deploy/.ssh
```
2. Скопируйте `authorized_keys` от root к deploy (если вы входили ключом под root):
```bash
sudo cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```
3. Проверьте, что можете зайти:
```bash
exit
ssh deploy@<IP_СЕРВЕРА>
```

### 2.4. Фаервол (UFW)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## 3) Swap (рекомендуется, даже если 2GB RAM)

> На 2GB RAM swap часто не “обязателен”, но сильно помогает переживать кратковременные пики и избегать OOM.

### 3.1. Создаём swap-файл (пример: 2GB)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 3.2. Делаем swap постоянным
```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3.3. Проверяем
```bash
free -h
swapon --show
```

---

## 4) Установка базовых пакетов

### 4.1. Git, build tools, Nginx, Certbot
```bash
sudo apt install -y git nginx
sudo apt install -y certbot python3-certbot-nginx
```

Проверка Nginx:
```bash
sudo systemctl status nginx
```

---

## 5) Установка Node.js (рекомендуемый вариант: nvm)

> nvm проще для обновлений Node и не конфликтует с системными пакетами.

### 5.1. Устанавливаем nvm (под пользователем `deploy`)
Зайдите под `deploy`, затем:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```
Перезайдите в SSH (или выполните `source ~/.bashrc`).

### 5.2. Ставим Node LTS
Рекомендация: начать с **Node 22 LTS** (или 20 LTS, если у вас есть старые зависимости).
```bash
nvm install 22
nvm use 22
node -v
npm -v
```

---

## 6) Получение проекта на сервер

### 6.1. Создаём каталог проекта
```bash
sudo mkdir -p /var/www/catalog.noema
sudo chown -R deploy:deploy /var/www/catalog.noema
```

### 6.2. Клонируем репозиторий
```bash
cd /var/www/catalog.noema
git clone <REPO_URL> .
```

> Если репозиторий приватный: используйте Deploy Key / PAT / GitHub App. Самый безопасный путь — Deploy Key только на чтение.

### 6.3. Ставим зависимости
```bash
npm ci
```

---

## 7) Переменные окружения (.env.production)

### 7.1. Создаём файл окружения
```bash
cd /var/www/catalog.noema
nano .env.production
```

### 7.2. Минимальный пример (заполните своими значениями)
```env
# Public (может попадать в клиентский бандл)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx

# Server-only (если реально используется на сервере)
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

### 7.3. Ограничиваем доступ к секретам
```bash
chmod 600 .env.production
```

---

## 8) Сборка и тестовый запуск без systemd

### 8.1. Сборка
```bash
cd /var/www/catalog.noema
npm run build
```

### 8.2. Пробный запуск (временно)
```bash
npm run start -- -p 3000
```

Проверьте с сервера (в другом окне SSH или остановив процесс):
```bash
curl -I http://127.0.0.1:3000
```

Остановите пробный запуск (Ctrl+C).

---

## 9) systemd: запуск как сервис

### 9.1. Создаём unit-файл
Создайте файл:
```bash
sudo nano /etc/systemd/system/catalog-noema.service
```

Вставьте (при необходимости поправьте версию Node и путь к npm):
```ini
[Unit]
Description=catalog.noema (Next.js)
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/var/www/catalog.noema
Environment=NODE_ENV=production
EnvironmentFile=/var/www/catalog.noema/.env.production

# Порт только локальный — наружу отдаёт Nginx
Environment=PORT=3000

# Если памяти мало или видите OOM, можно включить ограничение памяти для V8 (опционально):
# Environment=NODE_OPTIONS=--max-old-space-size=512

ExecStart=/usr/bin/env npm run start -- -p 3000
Restart=always
RestartSec=2

# Логи будут в journalctl
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 9.2. Запускаем и включаем автозапуск
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now catalog-noema
sudo systemctl status catalog-noema --no-pager
```

### 9.3. Смотрим логи
```bash
sudo journalctl -u catalog-noema -f
```

---

## 10) Nginx: reverse proxy на Next.js

### 10.1. Проверяем, что порт 3000 доступен только локально
```bash
ss -lntp | grep 3000 || true
```
Ожидаемо: `127.0.0.1:3000` (а не `0.0.0.0:3000`).

### 10.2. Конфиг Nginx (HTTP, до SSL)
Создайте файл:
```bash
sudo nano /etc/nginx/sites-available/catalog-noema
```

Вариант A — только `catlg.ru` и `www.catlg.ru`:
```nginx
server {
  listen 80;
  server_name catlg.ru www.catlg.ru;

  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Вариант B — если нужен wildcard поддомена (и вы готовы к wildcard SSL):
```nginx
server {
  listen 80;
  server_name catlg.ru www.catlg.ru *.catlg.ru;

  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    # Важно для логики поддоменов: приложение получает оригинальный Host
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### 10.3. Включаем сайт и проверяем конфиг
```bash
sudo ln -s /etc/nginx/sites-available/catalog-noema /etc/nginx/sites-enabled/catalog-noema
sudo nginx -t
sudo systemctl reload nginx
```

Проверка:
```bash
curl -I http://<IP_СЕРВЕРА>
```

---

## 11) DNS: домен указывает на VPS

Настройка DNS выполняется у регистратора домена (например, SpaceWeb). Подробная схема записей и чек-лист — в `docs/infra/subdomain-and-domain-setup.md` (Часть 1).

Минимально:
- `A` запись: `@` → `<IP_СЕРВЕРА>`
- (опционально) `A` запись: `www` → `<IP_СЕРВЕРА>`

Если нужны поддомены вида `[client].catlg.ru`:
- `A` запись: `*` → `<IP_СЕРВЕРА>`

Проверка (с вашей машины или с любого онлайн-DNS чекера):
- `nslookup catlg.ru`
- `nslookup test.catlg.ru` (если wildcard)

---

## 12) HTTPS: Let's Encrypt

### 12.1. Обычный сертификат (catlg.ru + www)
Убедитесь, что DNS уже указывает на VPS, и Nginx отдаёт сайт по HTTP.

Запуск:
```bash
sudo certbot --nginx -d catlg.ru -d www.catlg.ru
```

После успешного выпуска certbot сам обновит Nginx конфиг и включит редирект на HTTPS (если согласитесь).

Проверка:
```bash
curl -I https://catlg.ru
```

Автообновление:
```bash
sudo certbot renew --dry-run
```

### 12.2. Wildcard сертификат (*.catlg.ru)
Для HTTPS на поддоменах (например `acme.catlg.ru`) нужен сертификат, покрывающий `*.catlg.ru`. Let's Encrypt выдаёт такой только через **DNS-01 challenge**.

Ниже — пошаговая инструкция для **ручного** DNS-01 при DNS в SpaceWeb (без плагина). Минус: продление раз в ~90 дней нужно будет повторять вручную или перейти на провайдера с API (например Cloudflare).

#### 12.2.1. Запуск Certbot в режиме ручного DNS

На VPS выполните:

```bash
sudo certbot certonly --manual --preferred-challenges dns -d catlg.ru -d "*.catlg.ru"
```

- Подтвердите email и согласие с условиями, если спросит.
- Certbot остановится и выведет инструкцию: добавить **TXT-запись** в DNS.

Пример вывода:
```
Please deploy a DNS TXT record under the name _acme-challenge.catlg.ru with the following value:
  xYz123AbC456...
```

Запись **не добавляйте** сразу — оставьте терминал открытым и перейдите к шагу 12.2.2.

#### 12.2.2. Добавление TXT-записи в SpaceWeb

1. Откройте панель SpaceWeb → **Хостинг** → **Домены** → домен **catlg.ru** → **DNS** (Управление DNS).
2. Нажмите **«Добавить запись»**.
3. Заполните:
   - **Поддомен:** `_acme-challenge` (только имя; суффикс `.catlg.ru` подставится сам).
   - **Тип:** `TXT`.
   - **Значения:** скопируйте значение из терминала Certbot (одна длинная строка без кавычек).
4. Сохраните запись.

#### 12.2.3. Проверка TXT и продолжение Certbot

1. Подождите 1–3 минуты (распространение DNS).
2. Проверка с вашей машины (опционально):
   ```bash
   nslookup -type=TXT _acme-challenge.catlg.ru 8.8.8.8
   ```
   Должно вернуться добавленное значение.
3. В терминале на VPS, где запущен Certbot, нажмите **Enter**. Certbot проверит запись и выдаст сертификат.
4. В конце Certbot выведет путь к сертификату, например:
   ```
   /etc/letsencrypt/live/catlg.ru/fullchain.pem
   /etc/letsencrypt/live/catlg.ru/privkey.pem
   ```
   Если у вас уже был сертификат из раздела 12.1, новый может оказаться в каталоге с суффиксом, например: `/etc/letsencrypt/live/catlg.ru-0001/`. Запомните этот путь.

#### 12.2.4. Подключение wildcard-сертификата в Nginx

1. Откройте конфиг сайта:
   ```bash
   sudo nano /etc/nginx/sites-available/catalog-noema
   ```
2. Найдите блок `server { ... listen 443 ssl; ... }` (его мог создать Certbot в разделе 12.1). В нём должны быть строки:
   - `ssl_certificate ...`
   - `ssl_certificate_key ...`
3. Замените пути на каталог **wildcard**-сертификата (тот, что выписал Certbot на предыдущем шаге), например:
   ```nginx
   ssl_certificate     /etc/letsencrypt/live/catlg.ru/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/catlg.ru/privkey.pem;
   ```
   Если Certbot показал каталог `catlg.ru-0001`, подставьте его:
   ```nginx
   ssl_certificate     /etc/letsencrypt/live/catlg.ru-0001/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/catlg.ru-0001/privkey.pem;
   ```
4. Убедитесь, что в этом же блоке указаны все нужные имена:
   ```nginx
   server_name catlg.ru www.catlg.ru *.catlg.ru;
   ```
5. Проверка и перезагрузка Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

#### 12.2.5. Проверка HTTPS для поддомена

```bash
curl -I https://catlg.ru
curl -I https://www.catlg.ru
# Если есть тестовый поддомен, например test.catlg.ru:
curl -I https://test.catlg.ru
```

Ожидаемо: `HTTP/1.1 200` (или 301/302) без ошибок сертификата.

#### 12.2.6. Удаление TXT-записи (по желанию)

После успешного выпуска сертификата запись `_acme-challenge` можно удалить в панели SpaceWeb, чтобы не засорять зону. При следующем продлении её нужно будет добавить снова.

#### 12.2.7. Продление wildcard-сертификата (раз в ~90 дней)

Автопродление `certbot renew` для ручного DNS **не сработает**: Certbot снова попросит вручную добавить TXT.

Варианты:

1. **Вручную:** когда сертификат близок к истечению (или после истечения), повторить шаги 12.2.1–12.2.5: запустить `sudo certbot certonly --manual ...`, добавить новую TXT в SpaceWeb, нажать Enter, при необходимости обновить пути в Nginx, если Certbot создаст новый каталог (например `catlg.ru-0002`).
2. **Напоминание:** поставить напоминание раз в 2,5 месяца (сертификат Let's Encrypt действует 90 дней).
3. **В будущем:** для полной автоматизации можно перевести DNS на провайдера с API (например Cloudflare) и использовать плагин Certbot для DNS.

---

## 13) Деплой-рутина (обновление версии)

Базовый сценарий:
```bash
cd /var/www/catalog.noema
git pull
npm ci
npm run build
sudo systemctl restart catalog-noema
sudo systemctl status catalog-noema --no-pager
```

---

## 14) Быстрый чек-лист диагностики

### 14.1. Приложение не стартует
- `sudo systemctl status catalog-noema --no-pager`
- `sudo journalctl -u catalog-noema -n 200 --no-pager`
- Частые причины:
  - не хватает переменных окружения
  - Node/зависимости не установлены
  - ошибка сборки (нужно `npm run build`)
  - нехватка RAM (помогает swap / поднять RAM)

### 14.2. Nginx не отдаёт сайт
- `sudo nginx -t`
- `sudo systemctl status nginx --no-pager`
- `curl -I http://127.0.0.1:3000` (проверка приложения)
- `curl -I http://127.0.0.1` (проверка Nginx на сервере)

### 14.3. SSL не выпускается
- DNS ещё не обновился на IP VPS
- 80 порт не доступен снаружи
- для wildcard нужен DNS-01

---

## 15) Минимальная безопасность и обслуживание

- Держите открытыми наружу только **22/80/443**.
- Порт `3000` — только localhost.
- Секреты в `.env.production`, права `600`.
- Обновления:
  - периодически: `sudo apt update && sudo apt upgrade -y`
- Логи приложения:
  - `sudo journalctl -u catalog-noema -f`

---

## 16) Автодеплой при push (GitHub Actions)

При push в ветку `main` workflow из `.github/workflows/deploy.yml` подключается по SSH к VPS и выполняет рутину из раздела 13.

### 16.1. Секреты репозитория (Settings → Secrets and variables → Actions)

- `VPS_HOST` — IP или hostname сервера
- `VPS_USER` — пользователь SSH (например `deploy`)
- `VPS_SSH_KEY` — содержимое приватного SSH-ключа (целиком, с заголовками `-----BEGIN ... KEY-----` и `-----END ... KEY-----`)
- `VPS_SSH_PORT` — (опционально) порт SSH, по умолчанию 22

Рекомендуется отдельный ключ только для деплоя: `ssh-keygen -t ed25519 -C "github-deploy" -f deploy_key -N ""`; публичный ключ добавить в `~/.ssh/authorized_keys` пользователя `deploy` на VPS.

### 16.2. Sudo без пароля для deploy

Пользователь `deploy` должен иметь право без пароля выполнять `systemctl restart` и `systemctl status` для сервиса. На VPS:

```bash
sudo visudo
```

Добавьте строки (после существующих правил):

```
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart catalog-noema
deploy ALL=(ALL) NOPASSWD: /bin/systemctl status catalog-noema
```

### 16.3. Ручной запуск

В GitHub: **Actions** → **Deploy to VPS** → **Run workflow**.

---

## Примечание про поддомены `[slug].catlg.ru`

Полная схема: DNS в SpaceWeb → VPS, логика поддоменов в коде — в `docs/infra/subdomain-and-domain-setup.md`.

На VPS важно:
- Nginx принимает wildcard host (`*.catlg.ru`) и проксирует дальше, **сохраняя `Host`**:
  - `proxy_set_header Host $host;`
- Приложение (middleware/layout) парсит `Host` → `slug` (см. infra/subdomain-and-domain-setup.md, Часть 2).



