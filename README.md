# Júlia Lashes – API de Agendamentos

API REST para estúdio de extensão de cílios, pensada para ser usada com front-end (por exemplo, o site em Vercel) e também hospedada na própria Vercel como Serverless Function.

## Tecnologias

- Node.js + Express
- Prisma ORM
- PostgreSQL (recomendado para produção)
- JWT (autenticação da dona)
- Zod (validação)
- Rate limiting, CORS, Helmet

## Rotas principais

- `POST /api/auth/login`
- `POST /api/auth/register` (opcional, para criar a dona)
- `GET /api/services` (público)
- `GET /api/services/:id` (público)
- `POST /api/services` (protegido)
- `PUT /api/services/:id` (protegido)
- `PATCH /api/services/:id/activate` (protegido)
- `GET /api/clients` (protegido)
- `GET /api/clients/:id` (protegido)
- `POST /api/clients` (protegido)
- `PUT /api/clients/:id` (protegido)
- `GET /api/appointments/availability?serviceId=...&date=YYYY-MM-DD` (público)
- `POST /api/appointments` (público)
- `GET /api/appointments` (protegido)
- `GET /api/appointments/:id` (protegido)
- `PATCH /api/appointments/:id/status` (protegido)
- `POST /api/appointments/manual` (protegido)
- `GET /api/settings/public` (público)
- `GET /api/settings` (protegido)
- `PUT /api/settings` (protegido)

## Como usar localmente

1. Instalar dependências:

```bash
npm install
```

2. Copiar `.env.example` para `.env` e ajustar:

```bash
cp .env.example .env
```

Configure `DATABASE_URL` e `JWT_SECRET`.

3. Rodar migrações do Prisma:

```bash
npx prisma migrate dev --name init
```

4. Rodar o servidor local:

```bash
npm run dev
```

A API ficará em `http://localhost:4000`.

## Deploy na Vercel

- Fazer deploy deste projeto no GitHub e conectar na Vercel.
- Configurar as variáveis de ambiente na Vercel:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CORS_ORIGIN` (URL do front)
- A função serverless está em `api/index.js`. Todas as rotas estarão sob `/api/...`.

