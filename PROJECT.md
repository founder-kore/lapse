# Lapse

A demo-stage tool for tracking contractor end dates and closing the loop on
offboarding. **The audit trail is the actual product.**

## The problem

Contractor end dates in HR systems go stale because managers don't update them.
Two failure modes:

- **(a) Lockout** — the date passes and a still-working contractor gets locked
  out for ~24hrs.
- **(b) Ghost access** — the date is never shortened, so access stays live
  after they've gone and their laptop never comes back.

The fix: ask the manager one question at **14 / 7 / 2 days** before expiry, log
the answer with a timestamp, and report the exceptions.

## Target user

IT and compliance teams at 200–2,000 person companies. They have Entra ID or
Okta, a real contractor population, and a compliance obligation, but no
dedicated identity team.

## Purpose of this build

A demo to show ~10 IT/compliance people to find out whether this is a real
product. **Demoability beats completeness.**

## Stack

- Next.js 16.2.10 (App Router) — this is a version with breaking changes; read
  `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`).
- TypeScript, Tailwind
- Prisma 6.19 + SQLite (`prisma/dev.db`). Schema is defined and migrated;
  Prisma Client is generated.
- `@faker-js/faker` with `faker.seed(42)` for stable seed data.

## Hard constraints — do not violate

- **No authentication.** Manager response links are authorized by the random
  `CheckIn.token` field alone.
- **No real email sending.** Emails are rendered to screen only (`/emails`).
- **No external integrations** (Workday, Entra, Okta, mail providers).
- **No AI features.**
- **Import the Prisma client from `src/lib/db.ts` only.** Never instantiate
  `PrismaClient` anywhere else.
- **All date math goes through `src/lib/dates.ts`.** Always zero out time before
  comparing dates.
- `status` values: `ACTIVE | EXTENDED | ENDED | EXPIRED_NO_RESPONSE`
- `response` values: `EXTENDING | ENDING | null` (plain strings, not enums —
  SQLite doesn't support Prisma enums).
- Do not add a `"prisma": {"seed": ...}` block to `package.json`; this project
  uses `prisma.config.ts` (`migrations.seed`) instead.
- If a change would add a new dependency, service, or feature not described
  here, **STOP and ask.** Do not add it unprompted.

## Data model

- **Contractor** — identity + `startDate`/`endDate`, `status`, asset
  (`assetType`, `assetSerial`, `assetReturned`), and manager contact.
- **CheckIn** — one nudge sent to a manager: `daysBeforeExpiry` (14/7/2),
  `sentAt`, `respondedAt`, `response`, `newEndDate`, and a unique `token`.

## Build plan (checkpoints marked STOP)

1. **Repair** — docs, `prisma.config.ts` seed hook, lib singletons, seed run.
2. **Seed scenarios** — deliberate stories covering every status.
3. **Dashboard** (`/`) — all contractors, sorted most-urgent-first.
4. **Check-in engine** — "Run daily check" creates check-ins at the 14/7/2
   marks and renders manager emails to `/emails`; expired-unanswered ACTIVE
   contractors flip to `EXPIRED_NO_RESPONSE`.
5. **Response flow** (`/respond/[token]`) — token-authorized extend/end.
6. **Exceptions view** (`/exceptions`) — the screen that sells the product.

## Seed scenarios

`faker.seed(42)`, all dates relative to today:

- 22 healthy: end dates 45–300 days out, no check-ins
- 4 in-window unanswered: ending in 14, 13, 7, 2 days; check-ins at the
  appropriate marks; no responses
- 3 expired, asked 3×, never answered, still `EXPIRED_NO_RESPONSE`: ended 9,
  34, 71 days ago
- 2 ended, asset never returned: 21 and 58 days ago, `ENDED`,
  `assetReturned=false`, response `ENDING`
- 2 lockout cases: ended 3 and 1 days ago, `EXPIRED_NO_RESPONSE`, all check-ins
  unanswered
- 2 extended properly: `EXTENDED`, response `EXTENDING`, `newEndDate` 120 and 95
  days out
- 2 clean exits: ended 12 and 40 days ago, `ENDED`, response `ENDING`,
  `assetReturned=true`

Assets: MacBook Pro 14, Dell Latitude 5450, ThinkPad T14, iPhone 15, with
8-char uppercase alphanumeric serials.
