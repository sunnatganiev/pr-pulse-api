# PR Pulse API

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10-ea2845.svg)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org)

> **Status**: Session 1 scaffold — work in progress. Production features
> (auth, PR fetching, AI summaries) are coming in subsequent sessions.

Internal dashboard backend that aggregates GitHub PRs and produces AI-generated
summaries. Built with NestJS (Standard Mode), TypeORM 0.3, and PostgreSQL 16.

This is a learning project built incrementally with Claude Code over multiple
sessions, documenting an iterative approach to constructing a production-shaped
NestJS backend from scratch.

## Tech stack

- **Runtime**: Node.js 20+, TypeScript (strict mode)
- **Framework**: NestJS 10
- **Database**: PostgreSQL 16 (via Docker Compose)
- **ORM**: TypeORM 0.3
- **API docs**: Swagger UI at `/docs`

## Prerequisites

- Node.js 20 or higher
- Docker & Docker Compose
- npm

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Start PostgreSQL
docker compose up -d

# 4. Start the API in watch mode
npm run start:dev
```

API will be available at:

- **Health check**: <http://localhost:3000/health>
- **Swagger docs**: <http://localhost:3000/docs>

## Available scripts

| Script | What it does |
|--------|--------------|
| `npm run start:dev` | Start with file-watch (development) |
| `npm run start:prod` | Start compiled build (production) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run test` | Run unit tests (Jest) |
| `npm run test:cov` | Run unit tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run lint` | Lint and auto-fix |
| `npm run migration:generate -- src/database/migrations/<Name>` | Generate a new migration from entities |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Revert the last migration |

## Environment variables

See `.env.example` for the full list. Required keys:

- `PORT` — API port (default `3000`)
- `CORS_ORIGIN` — Allowed frontend origin (default `http://localhost:5173`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — PostgreSQL connection

## Project structure

```
src/
├── main.ts              # Bootstrap (CORS, ValidationPipe, Swagger)
├── app.module.ts        # Root module
├── database/
│   ├── data-source.ts   # TypeORM DataSource (used by CLI and runtime)
│   ├── database.module.ts
│   └── migrations/      # TypeORM migrations
└── health/
    ├── health.module.ts
    ├── health.controller.ts
    ├── health.service.ts
    └── health.service.spec.ts
```

Each feature lives in `src/<feature>/` with its own module, controller, service,
`entities/`, and `dto/`. Migrations go into `src/database/migrations/`.

## Health check contract

`GET /health`:

- **200 OK** when DB reachable:
  ```json
  { "status": "ok", "db": "connected", "timestamp": "2026-05-30T12:34:56.789Z" }
  ```
- **503 Service Unavailable** when DB unreachable:
  ```json
  { "status": "error", "db": "disconnected", "timestamp": "2026-05-30T12:34:56.789Z" }
  ```

## Roadmap

- [x] **Session 1** — Scaffold: NestJS + TypeORM + `/health` + Swagger
- [ ] **Session 2** — GitHub OAuth, users module, JWT auth
- [ ] **Session 3** — Fetch GitHub PRs from authenticated users' repos
- [ ] **Session 4** — AI summarization via the Anthropic API
- [ ] **Session 6** — GitHub webhooks + background jobs

A separate `pr-pulse-web` repository will host the React + Vite frontend.

## License

This project is released under the [MIT License](LICENSE).
