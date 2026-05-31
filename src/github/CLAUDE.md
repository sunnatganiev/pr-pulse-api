# CLAUDE.md — GitHub Module

> Bu nested CLAUDE.md. Asosiy loyiha qoidalari `../../CLAUDE.md` da.
> Bu yerda faqat github-spesifik qarorlar va ularning **nima uchun** shunday
> ekani.

## Modul maqsadi

GitHub REST API (Octokit) bilan ishlaydigan toza fetch layer. Repos va pull
request'larni olib, ularni ichki DTO shakliga map qiladi. Hozircha HTTP
endpoint chiqarmaydi — `GithubService` export qilinadi, keyinchalik `prs`
moduli (Session 3 davomi) uni ishlatadi.

Persistence (PR/Repo entity, migration), AI summarization, webhooks bu modulga
tegishli **emas**.

## Flow (qadamlar bo'yicha)

1. `GithubModule` `OCTOKIT` providerini `useFactory(ConfigService)` orqali
   quradi — `GITHUB_TOKEN_DEV` env'dan token o'qiladi, bo'lmasa darhol throw.
2. `GithubService` `@Inject(OCTOKIT)` orqali tayyor Octokit instance oladi.
3. Service metodlari Octokit'ni chaqiradi, javobni `*.fromOctokit()` orqali
   DTO'ga map qiladi (faqat kerakli maydonlar olinadi).
4. Octokit xato tashlasa — `mapGithubError()` uni NestJS exception'iga map
   qiladi.

## Octokit DI — nima uchun custom provider token

`OCTOKIT` = `Symbol('OCTOKIT')` injection token (`github.constants.ts`).
Auth moduli `JwtModule.registerAsync` patterniga mos.

- **Testability**: spec'da `{ provide: OCTOKIT, useValue: mockOctokit }` —
  service'ni real network'siz, `jest.mock` modul-darajali stub'siz test
  qilamiz. Constructor ichida `new Octokit()` qilinsa, mock qilish qiyin bo'lardi.
- **Reusable**: kelajakda per-user token kerak bo'lsa, faqat factory
  o'zgaradi — service'ga tegmaymiz.
- **Single source of truth**: token o'qish mantig'i bitta joyda (factory).

## `@octokit/rest@19` — nima uchun v22 EMAS

`@octokit/rest@22` **ESM-only** (`"type": "module"`). Loyiha CommonJS
(`tsconfig` `module: commonjs`, ts-jest CJS). v22 import qilinsa `nest build`
va Jest'da `ERR_REQUIRE_ESM` beradi. **v19** — oxirgi CommonJS versiyasi,
type'lar ichida keladi (alohida `@types/...` kerak emas). ESM'ga o'tilsa
(`module: nodenext` + dynamic import) Session 5+ da ko'rib chiqamiz.

## DTO — response shape, nima uchun Octokit tipiga bog'langan

DTO'lar input emas — Octokit javobini map qiladi (auth `MeResponseDto`
patterni: `@ApiProperty` + static `fromOctokit()`, class-validator YO'Q).

`fromOctokit(repo)` parametri Octokit element tipiga bog'langan
(`RestEndpointMethodTypes[...]['data'][number]`). Sabab: GitHub maydon nomi
o'zgarsa yoki nullability farq qilsa — kompilyatsiya xatosi olamiz, runtime'da
emas. Strict mode (`noUncheckedIndexedAccess`) ostida xavfsiz.

Nullable maydonlar: `body`, `mergedAt`, `user` (login). `user` —
`pr.user?.login ?? null` (GitHub user'i o'chirilgan bo'lishi mumkin).

## Error handling

`mapGithubError(err): never` — har bir metod try/catch ichida chaqiradi.
Status duck-typing bilan olinadi (`extractStatus`) — `RequestError` klassini
import qilmaymiz, test'da oddiy `{ status }` obyekt tashlash yetadi.

| GitHub status | NestJS exception | Log |
|---|---|---|
| 401 | `UnauthorizedException` | — |
| 403 | `ServiceUnavailableException` | `logger.warn` (rate limit) |
| 404 | `NotFoundException` | — |
| boshqa | `BadGatewayException` | `logger.error` |

403'ni rate limit deb hisoblaymiz — authenticated so'rovlarda 403'ning eng
keng tarqalgan sababi rate limit. CLAUDE.md "rate limit → try/catch + warning
log" qoidasiga mos.

## Testing strategiyasi

- `Test.createTestingModule` + `{ provide: OCTOKIT, useValue: mock }`.
- `mapGithubError` log'ini `jest.spyOn(Logger.prototype, 'warn')` bilan tekshir
  (private logger'ga cast qilma).
- Real GitHub'ga **hech qachon** zarba urma.
- Bu bosqichda 2 test yetarli: (1) `listRepos` DTO mapping, (2) 403 → 503.
  Qolgan metodlar bir xil pattern — `prs` moduli qo'shilganda kengaytiramiz.

## YAGNI (github uchun)

- Controller / HTTP endpoint — `prs` moduli bilan keladi.
- PR/Repo entity + migration + persistence — keyingi qism.
- Pagination/scroll — hozir `per_page: 30` yetadi.
- Caching (Redis), GraphQL, retry/backoff — kerak bo'lganda.
- Webhooks, background sync — Session 6.
- Per-user GitHub token — hozir bitta dev token (`GITHUB_TOKEN_DEV`).

## Future-proofing

- Per-user token: `OCTOKIT` factory'ni request-scoped provider yoki
  `getOctokitFor(user)` factory metodiga aylantir — service interfeysi o'zgarmaydi.
- ESM migratsiyasi: `@octokit/rest`'ni v22+ ga ko'tarib, dynamic `import()` +
  `module: nodenext`. Avval RFC yoz.
- Yangi endpoint (issues, commits): shu pattern — Octokit chaqir → yangi DTO
  `fromOctokit()` → `mapGithubError` qayta ishlat.
