# catalog-noema

SaaS-каталог для бизнеса. Контекст продукта и архитектура — [docs/README.md](docs/README.md).

## Разработка

### Перед первым запуском

Поддомены каталога (например `crusty.catlg.ru`) работают только если имена резолвятся в localhost. **Добавьте в файл hosts** (редактировать от имени администратора):

- **Windows:** `C:\Windows\System32\drivers\etc\hosts`
- **macOS / Linux:** `/etc/hosts`

Строки:

```
127.0.0.1 catlg.ru
127.0.0.1 crusty.catlg.ru
```

Без этих записей `http://crusty.catlg.ru:3000` не откроется. Подробнее: [docs/infra/subdomain-and-domain-setup.md](docs/infra/subdomain-and-domain-setup.md) (Часть 3).

### Запуск

```bash
npm install
npm run dev
```

- Главная: `http://catlg.ru:3000`
- Каталог (пример): `http://crusty.catlg.ru:3000`
- Вход владельца бизнеса: `http://crusty.catlg.ru:3000/login`

Переменные окружения — см. `.env.local` (Supabase).

**Онбординг:** открывать только по ссылке с ключом: `/onboarding?key=<ONBOARDING_ACCESS_KEY>`. Подробнее: [docs/plans/business-onboarding-plan.md](docs/plans/business-onboarding-plan.md).
Правила маршрутов: [docs/reference/routing-rules.md](docs/reference/routing-rules.md).




