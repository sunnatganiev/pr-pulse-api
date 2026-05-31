# CLAUDE.md

## Loyiha haqida

**PR Pulse API** — jamoa GitHub PR'larini yig'ib, AI yordamida xulosalaydigan
ichki dashboard backend'i. Frontend alohida repo: `pr-pulse-web` (React + Vite,
`http://localhost:5173`).

**Hozirgi bosqich**: Session 3 yakunlandi — GitHub fetch layer (`src/github/`,
Octokit) + `prs` moduli (PR persistence, upsert sync, JWT bilan himoyalangan
`/prs` endpointlar).

Sessiya yo'l xaritasi:

- **Session 1**: backend skeleti — health check, DB ulanish, Swagger ✅
- **Session 2**: GitHub OAuth + users moduli + JWT auth ✅
- **Session 3**: GitHub PR'larni fetch qilish (`github` fetch layer ✅) + prs moduli ✅
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
- JWT payload: `{ sub: user.id, githubId: user.githubId, tokenVersion }` — minimal + global revocation uchun `tokenVersion`
- JWT cookie'dan o'qiladi (Authorization header EMAS) — `jwt.strategy.ts`'da custom extractor
- GitHub access token database'da saqlanmaydi — faqat `lastLoginAt`
- Unique kalit: `User.githubId` Postgres'da **bigint** + transformer (string ↔ number)
- `synchronize: false` — schema o'zgarishlari faqat migration orqali
- `/auth/me` raw `User` qaytarmaydi — `MeResponseDto.fromUser()` orqali sanitize qilinadi
- Logout `buildClearCookieOptions` ishlatadi (maxAge'siz) — `Expires: 1970` bilan to'g'ri tozalanadi
- **Global session revocation**: `User.tokenVersion` (integer, default 0). Logout-all `Repository.increment('tokenVersion', 1)` chaqiradi — atomik. `JwtStrategy.validate()` har so'rovda `payload.tokenVersion === user.tokenVersion` tekshiradi (mos kelmasa 401). Token blacklist o'rniga — eski JWT'larda `tokenVersion` undefined bo'lsa, `0` deb hisoblanadi (backward compat).

## GitHub integratsiyasi qoidalari

- Octokit (REST API) ishlatamiz — `@octokit/rest` paketi
- **Versiya**: `@octokit/rest@19` — oxirgi CommonJS versiya. v22 ESM-only
  (`"type": "module"`) → CommonJS NestJS/ts-jest bilan `ERR_REQUIRE_ESM` beradi.
  Type'lar paket ichida keladi (alohida `@types/...` kerak emas).
- GitHub API rate limit: 5000 req/hour authenticated
- Rate limit'ga e'tibor: try/catch + warning log (`GithubService.mapGithubError`)
- Octokit DI: `OCTOKIT` injection token + `useFactory(ConfigService)` —
  testda mock qilish va kelajakda per-user token uchun reusable
  (`src/github/github.module.ts`)
- Error mapping: 401→Unauthorized, 403→ServiceUnavailable (+warn), 404→NotFound,
  boshqa→BadGateway. Status duck-typing bilan (`RequestError` import qilmaymiz)
- User'ning GitHub access token DB'da SAQLANMAYDI (Session 2 qarori)
- Hozircha: development'da `GITHUB_TOKEN_DEV` env'dan o'qiymiz (suboptimal)
- Session 5'da: GitHub MCP server bilan yaxshilanadi
- Modul hujjati: `src/github/CLAUDE.md`

## PRs moduli qoidalari

- `PullRequest` entity: `githubId` (bigint, unique) — sync uchun konflikt kaliti
- **Upsert sync**: `Repository.upsert(rows, { conflictPaths: ['githubId'] })` —
  atomik `ON CONFLICT DO UPDATE`, `findOne+save` loop EMAS
- **`state` enum** (`PullRequestState`: open/closed/merged) — loyihadagi birinchi
  Postgres enum (`enumName: 'pull_requests_state_enum'`). `deriveState`:
  `mergedAt != null` → merged (GitHub `state` faqat open/closed beradi)
- `createdAt/updatedAt/mergedAt` — GitHub PR vaqtlari (oddiy `timestamptz`,
  `@CreateDateColumn` EMAS); DB freshness → `lastSyncedAt`
- **Birinchi class-validator request DTO'lari** (`PrFilterDto`, `SyncPrsDto`) —
  global `ValidationPipe` (`transform: true`) bilan
- `JwtAuthGuard` `../auth/guards`'dan import; `PrsModule` `AuthModule` import
  qilmaydi (JwtStrategy global registry'da). `GithubModule` import qilinadi
- `bigintToNumber` transformer auth + prs'da takror (YAGNI — `src/common/` yo'q)
- Modul hujjati: `src/prs/CLAUDE.md`

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

### `POST /auth/logout/all` (JWT guard)
- `User.tokenVersion` ni atomik increment qiladi → boshqa qurilmalardagi mavjud JWT'lar keyingi so'rovda 401 oladi
- Joriy qurilma cookie'sini ham tozalaydi
- **204 No Content** + `Set-Cookie: prpulse_jwt=; Expires=Thu, 01 Jan 1970 ...`
- **401** — cookie yo'q yoki yaroqsiz

### `GET /prs` (JWT guard)
Query: `state?` (open|closed|merged), `repo?` (repoFullName), `author?`
(authorUsername), `limit?` (1–100, default 30), `offset?` (≥0, default 0).
**200 OK** — `PullRequest[]` (`createdAt DESC`). **401** — cookie yo'q/yaroqsiz.

### `POST /prs/sync` (JWT guard)
Body: `{ "repoFullName": "owner/repo" }`. GitHub'dan PR'larni oladi,
`githubId` bo'yicha upsert qiladi.
**200 OK** — sync qilingan `PullRequest[]`. **400** — repoFullName formati noto'g'ri.
**401** — cookie yo'q/yaroqsiz.

### `GET /prs/:id` (JWT guard)
**200 OK** — `PullRequest`. **400** — `id` yaroqsiz uuid. **404** — topilmadi.
**401** — cookie yo'q/yaroqsiz.

## Izohiy komandalar (Team-wide custom slash commands)

`.claude/commands/` bo'limida saqlanadi:

- **`/explore`** — modul yoki fayl arxitekturasini tushun va tushuntir.
  Ishlatish: `@ARGUMENTS` ning qaidi bo'lsa, barcha `.ts` fayllarni o'qiy.
  
- **`/review-changes`** — staging area'dagi o'zgarishlari senior muhandis ko'ziga qarab tekshir.
  Qo'llash: pre-commit yoki PR self-review'dan oldin.
  
- **`/debug-prod`** — production bug'ni qat'iy pattern bilan debug qil.
  Bosqich: bug tushun → kod joylash → failing test yozish → root cause → minimal fix → postmortem.
  Qo'llashsa: QA dan xabar olgan har qanday bug report'i.

Har bir komanda dokumentatsiya + $ARGUMENTS dinamik input + bosqichlar + output format.

## YAGNI ro'yxati (hozir kerak EMAS)

- Refresh tokens (Session 6'da ko'rib chiqamiz)
- RBAC / permissions
- Multi-tenancy
- Boshqa social login providerlar (Google, GitLab) — faqat GitHub
- Rate limiting (Session 8)
- Caching

## Bu sessiya doirasidan TASHQARI

- AI summarization — **Session 4**
- GitHub webhooks + background sync jobs — **Session 6**
- Batch fetch optimization — kerak bo'lganda

Foydalanuvchi shu mavzularni so'rasa, eslatib qo'y:
> "Bu Session [N]'da rejalashtirilgan."

## Stil

- Foydalanuvchi bilan o'zbek tilida gaplash (lotin alifbosi)
- Texnik atamalar inglizcha qoladi (controller, service, migration, ...)
- Kod, identifierlar va commentlar inglizcha
- Birinchi marta uchragan texnik atamani qisqacha tushuntir
