# CLAUDE.md

## Loyiha haqida

**PR Pulse API** — jamoa GitHub PR'larini yig'ib, AI yordamida xulosalaydigan
ichki dashboard backend'i. Frontend alohida repo: `pr-pulse-web` (React + Vite,
`http://localhost:5173`).

**Hozirgi bosqich**: Session 2 yakunlandi — GitHub OAuth + JWT auth qo'shildi.

Sessiya yo'l xaritasi:

- **Session 1**: backend skeleti — health check, DB ulanish, Swagger ✅
- **Session 2**: GitHub OAuth + users moduli + JWT auth ✅
- **Session 3 (keyingi)**: GitHub PR'larni fetch qilish + prs moduli
- **Session 4**: AI summarization (Anthropic API)
- **Session 6**: GitHub webhooks + jobs moduli

## Texnik stek

- **Runtime**: Node.js 20+, TypeScript 5.x strict mode
  (`noUncheckedIndexedAccess`, `noImplicitOverride`)
- **Framework**: NestJS 10 Standard Mode (`src/` structure)
- **ORM**: TypeORM 0.3.x — DataSource pattern (eski decorator API EMAS)
- **Database**: PostgreSQL 16 (docker-compose)
- **Config**: `@nestjs/config` 3.x
- **API docs**: `@nestjs/swagger` 7.x → Swagger UI `/docs`
- **Auth** (Session 2): `passport-github2`, `passport-jwt`
- **Test**: Jest (NestJS default)
- **Package manager**: npm

## Arxitektura qoidalari

1. Feature-based modullar: `src/<feature>/`
2. Feature ichida: `<feature>.module.ts`, `<feature>.controller.ts`,
   `<feature>.service.ts`
3. Entities feature ichida: `src/<feature>/entities/<name>.entity.ts`
4. DTO'lar: `src/<feature>/dto/` + `class-validator` decorators
5. Migrations: `src/database/migrations/<timestamp>-<name>.ts`
6. DataSource bitta source-of-truth: `src/database/data-source.ts` (CLI va
   runtime shu fayldan o'qiydi)
7. Test fayllari: `*.spec.ts` (unit), `test/*.e2e-spec.ts` (e2e)
8. Hech qanday `src/common/`, `src/shared/`, `src/utils/` — birinchi marta
   umumiy kod kerak bo'lganda yaratamiz (YAGNI)

## Kod yozish qoidalari

- `async/await` ishlat — `Promise.then()` EMAS
- NestJS `Logger` ishlat (`this.logger`) — `console.log` EMAS
- DTO'lar `class-validator` decorators bilan
- TypeORM `synchronize: false` — schema o'zgarishi faqat migration orqali
- Conventional Commits + `Co-authored-by: Claude`
- Comment yozma — agar mantiq nomi orqali aniq bo'lsa

## Qoidalar

1. **TDD**: testlar avval yoziladi (qizil), keyin minimal implementation
   (yashil)
2. **Testlar o'tmaguncha commit MUMKIN EMAS** — `npm run test` yashil bo'lishi
   shart
3. **Har bir task yakunida shu fayl yangilanadi** — yangi qaror, qoida yoki
   modul qo'shilsa shu yerga yoziladi
4. **YAGNI** — hozir kerak bo'lmagan abstraktsiyani qo'shma
5. **Strict mode hech qachon `false` qilinmasin** — uchala strict flag majburiy
6. **Migration generate** — entity qo'shilgach:
   `npm run migration:generate -- src/database/migrations/<Name>`

## Auth qoidalari (security-sensitive)

- Flow: GitHub OAuth → JWT
- JWT **httpOnly cookie**'da saqlanadi (localStorage'da EMAS!)
- Cookie nomi: `prpulse_jwt` (env: `COOKIE_NAME`, fallback `auth.constants.ts`)
- Cookie: `httpOnly: true`, `sameSite: 'lax'`, `secure: true` (production), `path: '/'`
- JWT expire: **7 kun** (env: `JWT_EXPIRES_IN`)
- JWT payload: `{ sub: user.id, githubId: user.githubId }` (minimal — username/avatar embed qilinmaydi)
- JWT cookie'dan o'qiladi (Authorization header EMAS) — `jwt.strategy.ts`'da custom extractor
- GitHub access token database'da saqlanmaydi — faqat `lastLoginAt`
- Unique kalit: `User.githubId` Postgres'da **bigint** + transformer (string ↔ number)
- `synchronize: false` — schema o'zgarishlari faqat migration orqali
- `/auth/me` raw `User` qaytarmaydi — `MeResponseDto.fromUser()` orqali sanitize qilinadi
- Logout `buildClearCookieOptions` ishlatadi (maxAge'siz) — `Expires: 1970` bilan to'g'ri tozalanadi

## Frontend bilan integratsiya

- API origin: `http://localhost:3000`
- Web origin: `http://localhost:5173`
- CORS: `origin: WEB_URL`, `credentials: true`

Login flow:

1. Web: "Login with GitHub" → `window.location = ${API_URL}/auth/github`
2. API: GitHub'ga redirect
3. GitHub callback → API
4. API: User yaratadi/topadi → JWT chiqaradi → httpOnly cookie'ga yozadi
5. API: Web'ga redirect (`${WEB_URL}/`)
6. Web: keyingi so'rovlarda cookie avtomatik yuboriladi

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

### `GET /auth/github`
**302** → `https://github.com/login/oauth/authorize?...` (passport-github2 redirect)

### `GET /auth/github/callback?code=...`
- User'ni topadi/yaratadi (`User.githubId` bo'yicha), `lastLoginAt` yangilaydi
- JWT chiqaradi, `prpulse_jwt` cookie'ga yozadi
- **302** → `${WEB_URL}/`

### `GET /auth/me` (JWT guard)
**200 OK** — `MeResponseDto`:
```json
{ "id": "uuid", "githubId": 12345, "username": "...", "email": "...|null",
  "avatarUrl": "...", "lastLoginAt": "ISO|null", "createdAt": "ISO" }
```
**401** — cookie yo'q yoki yaroqsiz

### `POST /auth/logout`
**204 No Content** + `Set-Cookie: prpulse_jwt=; Expires=Thu, 01 Jan 1970 ...`

## YAGNI ro'yxati (hozir kerak EMAS)

- Refresh tokens (Session 6'da ko'rib chiqamiz)
- RBAC / permissions
- Multi-tenancy
- Boshqa social login providerlar (Google, GitLab) — faqat GitHub
- Rate limiting (Session 8)
- Caching

## Bu sessiya doirasidan TASHQARI

- GitHub'dan PR fetching — **Session 3**
- AI summarization — **Session 4**
- Webhooks — **Session 6**

Foydalanuvchi shu mavzularni so'rasa, eslatib qo'y:
> "Bu Session [N]'da rejalashtirilgan."

## Stil

- Foydalanuvchi bilan o'zbek tilida gaplash (lotin alifbosi)
- Texnik atamalar inglizcha qoladi (controller, service, migration, ...)
- Kod, identifierlar va commentlar inglizcha
- Birinchi marta uchragan texnik atamani qisqacha tushuntir
