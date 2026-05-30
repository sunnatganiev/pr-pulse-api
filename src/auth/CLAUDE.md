# CLAUDE.md — Auth Module

> Bu nested CLAUDE.md. Asosiy loyiha qoidalari `../../CLAUDE.md` da.
> Bu yerda faqat auth-spesifik qarorlar va ularning **nima uchun** shunday
> ekani.

## Modul maqsadi

GitHub OAuth → JWT autentifikatsiya va `req.user` ni boshqa modullar (Session 3
PRs) uchun tayyor qilish. Authorization (RBAC) bu modulga tegishli emas.

## Auth flow (qadamlar bo'yicha)

1. Web `${API_URL}/auth/github` ga yo'naltiradi.
2. `GithubAuthGuard` passport-github2'ni ishga tushiradi → GitHub'da `read:user`
   + `user:email` scope so'raydi.
3. GitHub callback `${API_URL}/auth/github/callback` ga `code` bilan qaytadi.
4. `GithubStrategy.validate()` `Profile` ni minimal `GitHubProfile` ga
   normallashtiradi (`githubId` ni `Number()` ga castlash, `emails[0]` va
   `photos[0]` ni xavfsiz olish).
5. `AuthService.findOrCreateUser()` — `githubId` bo'yicha topadi yoki yaratadi,
   `username/email/avatarUrl/lastLoginAt` ni har safar yangilaydi (GitHub
   profilda o'zgarish bo'lishi mumkin).
6. `generateJwt()` minimal payload bilan token chiqaradi (`tokenVersion`
   embed qilinadi).
7. Controller cookie'ga yozadi va web origin'ga 302 qaytaradi — JSON yo'q.

Logout flow:

- `POST /auth/logout` — faqat joriy qurilma cookie'sini tozalaydi.
- `POST /auth/logout/all` — `User.tokenVersion` ni increment qiladi, joriy
  qurilma cookie'sini tozalaydi. Boshqa qurilmalardagi token'lar keyingi
  so'rovda 401 oladi.

## Cookie bayroqlari — nima uchun

`auth.constants.ts`'da `buildCookieOptions` / `buildClearCookieOptions` —
bitta source of truth, qo'lda inline qilish taqiqlanadi.

- `httpOnly: true` — JS'dan o'qib bo'lmaydi, XSS orqali o'g'irlikni to'sadi.
- `sameSite: 'lax'` — top-level GET'larda cookie yuboriladi (OAuth callback
  shunga bog'liq). `strict` bo'lsa callback'da cookie kelmasdi.
- `secure: isProd` — dev'da `http://localhost`, prod'da HTTPS majburiy.
- `path: '/'` — barcha route'larga.
- `maxAge`: faqat `buildCookieOptions`'da. `buildClearCookieOptions`'da
  **YO'Q** — `maxAge` bilan `Expires: 1970` to'g'ri ishlamasligi mumkin, shuning
  uchun clear paytida olib tashlangan.

## JWT payload — nima uchun minimal

```ts
{ sub: user.id, githubId: user.githubId, tokenVersion: user.tokenVersion }
```

`username`, `email`, `avatarUrl` payload'ga **kirmaydi**. Sabablari:

- Token foydalanuvchi GitHub'da `username` ni o'zgartirgandan keyin ham eski
  qiymat bilan qoladi — bu noto'g'ri identifikatsiya manbai bo'ladi.
- Email PII — keraksiz tarqalmasligi kerak. Frontend `username/avatarUrl` ni
  `/auth/me` orqali oladi.
- `sub` — UUID (DB primary key); `githubId` — GitHub bilan qayta sinxronlash
  uchun. Qolgani DB'dan o'qiladi.
- `tokenVersion` — **global session revocation** uchun. Logout-all chaqirilsa
  DB'dagi qiymat increment bo'ladi; barcha eski payload'larda tokenVersion
  mos kelmaydi → 401. `tokenVersion` ni boshqa joydan o'qib bo'lmaydi —
  shu sababli payload'ga embed qilinadi (CLAUDE.md "minimal" qoidasiga
  yagona istisno).

`JwtStrategy.validate()` har so'rovda `findById(sub)` qiladi va
`payload.tokenVersion ?? 0` ni `user.tokenVersion` bilan solishtiradi:

- User o'chirilgan → 401.
- `tokenVersion` eskirgan (boshqa qurilma logout-all qildi) → 401.
- Eski JWT'larda payload'da `tokenVersion` yo'q → `0` deb hisoblanadi
  (backward compat: deploy paytida amal qilayotgan token'lar sinmaydi).

## `User.githubId` — bigint + transformer

Postgres `bigint` katta qiymatlarni qabul qiladi, lekin TypeORM uni **string**
qilib qaytaradi. `bigintToNumber` transformer runtime `number` ↔ DB `bigint`
mapping qiladi. GitHub ID'lari hozir `Number.isSafeInteger` ichida (~10⁸).

## Error handling

- `GithubStrategy` ichida invalid profile ID → `UnauthorizedException` →
  passport `done(err)` chaqiradi → guard 401 qaytaradi.
- `AuthController.githubCallback` `req.user` bo'sh bo'lsa
  `?error=oauth_failed` query bilan web'ga qaytaradi (JSON 4xx emas — chunki
  bu redirect endpoint, foydalanuvchi sahifa kutadi).
- `JwtStrategy.validate()` user topilmasa `UnauthorizedException` — 401.
- Boshqa joylarda exception filter (global NestJS default) yetarli — qo'lda
  `try/catch` qilma.

## Testing strategiyasi

- **AuthService**: `Repository<User>` va `JwtService` mock — DB'siz unit test.
  `getRepositoryToken(User)` ishlat. Misol: `auth.service.spec.ts`.
- **Strategy/Guard'lar**: passport boilerplate — test yozma. Faqat o'zimiz
  qo'shgan `validate()` mantig'i kerak bo'lsa `Profile` mock bilan chaqir.
- **Controller**: e2e'da `supertest` + cookie agent (Session 6'da qo'shamiz).
- Real GitHub'ga **hech qachon** zarba urma — `nock` yoki Strategy mock.

## Logout-all — qanday ishlaydi

`POST /auth/logout/all` (JwtAuthGuard ostida):

1. `AuthService.invalidateAllSessions(user.id)` →
   `Repository.increment({ id }, 'tokenVersion', 1)` — bitta atomik SQL:
   `UPDATE users SET "tokenVersion" = "tokenVersion" + 1 WHERE id = $1`.
2. Joriy qurilma cookie'sini `buildClearCookieOptions` bilan tozalaydi.
3. **204 No Content** qaytaradi.

Increment'ni `findById + save` o'rniga ishlatishimiz sababi — concurrent
logout-all so'rovlarida read-modify-write race bo'lmasligi (DB'dagi
`tokenVersion` har doim monotonik o'sadi).

Boshqa qurilmalardagi token'lar **darhol** invalidate bo'lmaydi (ular hali
keshda) — lekin **keyingi so'rovda** `JwtStrategy.validate()` versiyani
solishtirib 401 qaytaradi.

## YAGNI (auth uchun)

- Refresh tokens — 7 kunlik JWT yetarli, expire bo'lsa qayta login.
- **Per-device token blacklist** — `tokenVersion` global revocation uchun
  yetarli. Bitta qurilmani aniq invalidate qilish kerak bo'lsa kelajakda
  alohida `sessions` jadval qo'shamiz.
- Multi-provider (Google, GitLab) — `GithubStrategy` to'g'ridan-to'g'ri.
- CSRF token — `sameSite: lax` + redirect-only endpoint'lar yetarli.
- Role/permission tizimi — Session 6+'da kerak bo'lsa qo'shiladi.

## Future-proofing

- Refresh tokens qo'shilsa: `auth.constants.ts`'ga `REFRESH_COOKIE_NAME` +
  alohida `buildRefreshCookieOptions`. JWT payload o'zgarmaydi.
- `role` kerak bo'lsa: entity'ga nullable enum + migration. Payload'ga
  **embed qilma** — har so'rovda DB'dan o'qi (revocation uchun).
- Yangi provider: `strategies/` ichiga qo'sh + `User.provider` column. Avval
  RFC yoz.
