# CLAUDE.md

## Loyiha haqida

**PR Pulse API** — jamoaning GitHub PR'larini yig'ib, AI yordamida xulosalaydigan
ichki dashboard'ning backend qismi. Frontend alohida repository (`pr-pulse-web`).

Sessiya yo'l xaritasi:

- **Session 1 (joriy)**: backend skeleti — health check, DB ulanish, Swagger
- **Session 2**: GitHub OAuth + users moduli + JWT auth
- **Session 3**: GitHub PR'larni fetch qilish + prs moduli
- **Session 4**: AI summarization moduli (Anthropic API)
- **Session 6**: GitHub webhooks + jobs moduli

## Texnik stek

- **Runtime**: Node.js 20+, TypeScript strict mode (`noUncheckedIndexedAccess`,
  `noImplicitOverride`)
- **Framework**: NestJS 10 Standard Mode
- **ORM**: TypeORM 0.3.x — `synchronize: true` dev'da, `false` prod'da
- **Database**: PostgreSQL 16 (docker-compose)
- **Package manager**: npm
- **Test**: Jest (NestJS default)
- **API docs**: Swagger UI `/docs`

## Papka strukturasi qoidalari

- Har bir feature alohida modul: `src/<feature>/`
- Feature ichida: `<feature>.module.ts`, `<feature>.controller.ts`,
  `<feature>.service.ts`, `entities/`, `dto/`
- Migration fayllari: `src/database/migrations/`
- DataSource bitta source-of-truth: `src/database/data-source.ts` (CLI va
  runtime ikkalasi shu fayldan o'qiydi)
- Hech qanday `src/common/`, `src/shared/`, `src/utils/` — birinchi marta
  umumiy kod kerak bo'lganda yaratamiz (YAGNI)

## Qoidalar

1. **TDD**: testlar avval yoziladi (qizil), keyin minimal implementation
   (yashil). Misol: `health.service.spec.ts` → `health.service.ts`
2. **Testlar o'tmaguncha commit MUMKIN EMAS** — `npm run test` yashil bo'lishi
   shart
3. **Har bir task yakunida shu fayl yangilanadi** — yangi qaror, yangi qoida,
   yangi modul qo'shilsa shu yerga yoziladi
4. **YAGNI** — hozir kerak bo'lmagan abstraktsiyani qo'shma
5. **Strict mode hech qachon `false` qilinmasin** — `tsconfig.json`'da uchala
   strict flag majburiy
6. **Migration generate** — entity qo'shilgach: `npm run migration:generate
   -- src/database/migrations/<Name>`

## Endpoint kontraktlari

### `GET /health`

**200 OK** (DB ulangan):
```json
{ "status": "ok", "db": "connected", "timestamp": "ISO 8601 string" }
```

**503 Service Unavailable** (DB ulanmagan):
```json
{ "status": "error", "db": "disconnected", "timestamp": "ISO 8601 string" }
```

## Stil

- Foydalanuvchi bilan o'zbekcha gaplash
- Kod, identifierlar va commentlar inglizcha
- Comment yozma — agar mantiq nomi orqali aniq bo'lsa
- YAGNI prinsipiga rioya qil
