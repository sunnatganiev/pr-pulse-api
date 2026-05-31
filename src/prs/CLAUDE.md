# CLAUDE.md — PRs Module

> Bu nested CLAUDE.md. Asosiy loyiha qoidalari `../../CLAUDE.md` da.
> Bu yerda faqat prs-spesifik qarorlar va ularning **nima uchun** shunday ekani.

## Modul maqsadi

GitHub PR'larini (`GithubService` orqali) Postgres'ga sync qiladi va JWT bilan
himoyalangan REST endpointlar orqali ro'yxat/filter/bitta PR'ni beradi. AI
summarization (Session 4) va webhooks/cron sync (Session 6) bu modulga tegishli
emas.

## Sync flow (qadamlar bo'yicha)

1. `POST /prs/sync { repoFullName: "owner/repo" }` (JWT guard).
2. `PrsService.syncFromGithub` `repoFullName`'ni `owner/repo`'ga ajratadi
   (DTO regex + servisda guard).
3. `githubService.listPullRequests(owner, repo)` → `GithubPrDto[]`.
4. Har bir DTO entity'ga map qilinadi, `state` `deriveState` orqali aniqlanadi,
   `lastSyncedAt = now`.
5. `prRepo.upsert(rows, { conflictPaths: ['githubId'] })` — atomik
   `INSERT ... ON CONFLICT ("githubId") DO UPDATE`.
6. Sync qilingan PR'lar (`githubId In(...)`, `createdAt DESC`) qaytariladi.

## Upsert — nima uchun `githubId` conflict

`githubId` (GitHub'ning global PR id'si) `unique` kalit. `upsert` bitta SQL'da
yangi PR'larni qo'shadi va mavjudlarini yangilaydi — `findOne + save` loop
o'rniga (N+1 va race'siz). `id` (bizning uuid) yangi qatorlarda
`uuid_generate_v4()` default orqali to'ldiriladi, mavjudlarida o'zgarmaydi.

## `deriveState` — nima uchun `mergedAt` ustun

GitHub REST `state` faqat `'open' | 'closed'` qaytaradi — merged PR ham
`'closed'` bo'ladi. Shuning uchun `merged` haqiqat manbai `mergedAt`:

```
mergedAt != null      → Merged
state === 'open'      → Open
aks holda             → Closed
```

Enum (`PullRequestState`) — loyihadagi **birinchi Postgres enum**. Migration
`pull_requests_state_enum` tipini yaratadi (`enumName` entity'da aniq belgilangan).

## Timestamp'lar — GitHub vs DB

`createdAt`, `updatedAt`, `mergedAt` — **GitHub PR'ning** vaqtlari (oddiy
`timestamptz` ustun, `@CreateDateColumn` EMAS). DB'dagi freshness alohida
`lastSyncedAt` bilan kuzatiladi. Shu sababli auth'dagi `@CreateDateColumn`
patterni bu yerda **qo'llanilmaydi**.

`bigintToNumber` transformer auth modulida module-local — `src/common/`
yaratmaslik uchun (YAGNI) bu yerda ham takrorlangan. Uchinchi marta kerak
bo'lsa, umumiy util'ga chiqaramiz.

## Filter qoidalari (`PrFilterDto`)

- `state`, `repo` (repoFullName), `author` (authorUsername) — ixtiyoriy `where`.
  Berilmaganlari `where`'ga qo'shilmaydi.
- `limit` (1–100, default 30), `offset` (≥0, default 0) — offset-based paging.
- Bu loyihadagi **birinchi class-validator request DTO'lari**. Global
  `ValidationPipe` (`transform: true`) query string'larni `@Type(() => Number)`
  bilan number'ga kastlaydi.
- `GET /prs/:id` — `ParseUUIDPipe` yaroqsiz uuid'ni DB'ga yetkazmasdan 400 beradi.

## Auth integratsiyasi

`JwtAuthGuard` to'g'ridan-to'g'ri `../auth/guards/jwt-auth.guard`'dan import
qilinadi. `PrsModule` `AuthModule`'ni import qilmaydi — `JwtStrategy` AppModule →
AuthModule orqali global passport registry'da ro'yxatdan o'tgan. `GithubModule`
import qilinadi (u `GithubService`'ni export qiladi).

## Testing strategiyasi

- `getRepositoryToken(PullRequest)` + mock `GithubService`. DB/GitHub'ga zarba yo'q.
- `prs.service.spec.ts`: `findAll` filter/paging/order, `syncFromGithub`
  `deriveState` + upsert conflictPaths, bo'sh ro'yxat, `findOne` 404.

## YAGNI (prs uchun)

- WebSocket real-time, full-text search — keyin.
- Multi-repo/bulk sync — har repo alohida `POST /prs/sync`.
- Background cron sync — Session 6.
- Cursor-based pagination — offset hozir yetadi.
- Response DTO (sanitize) — PR maydonlari maxfiy emas, entity to'g'ridan qaytadi.

## Future-proofing

- Webhook sync (Session 6): `syncFromGithub`'ni qayta ishlatamiz yoki bitta PR
  upsert metodini qo'shamiz — `upsert(conflictPaths: ['githubId'])` o'zgarmaydi.
- AI summary (Session 4): entity'ga nullable `summary` + migration; sync mantig'i
  tegmaydi.
- Yangi filter (label, branch): `PrFilterDto`'ga ixtiyoriy maydon + `where` spread.
