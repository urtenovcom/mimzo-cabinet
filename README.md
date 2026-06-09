# Mimzo — личный кабинет

Веб-кабинет для пользователей Mimzo VPN: регистрация, подписки, тарифы,
устройства, биллинг.

**Стек:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase
(Auth + Postgres) · Docker

## Локально

```bash
pnpm install
cp .env.example .env.local
# заполни .env.local своими ключами Supabase
pnpm dev
```

Откроется на http://localhost:3000

## Деплой

Прод крутится на `app.mimzo.ru` через Caddy + Docker на core-сервере:

```bash
docker compose up -d --build
```
