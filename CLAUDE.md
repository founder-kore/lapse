@AGENTS.md
@PROJECT.md

# Lapse — working notes

Lapse tracks contractor end dates and closes the offboarding loop. The audit
trail is the product. Full context, data model, and build plan live in
`PROJECT.md`. The hard constraints below are load-bearing — re-read before every
change.

## Hard constraints — do not violate

- **No authentication.** Manager response links are authorized by the random
  `CheckIn.token` alone.
- **No real email sending.** Emails render to screen only (`/emails`).
- **No external integrations** (Workday, Entra, Okta, mail providers).
- **No AI features.**
- **Import the Prisma client from `src/lib/db.ts` only.** Never instantiate
  `PrismaClient` anywhere else — including scripts and seeds.
- **All date math goes through `src/lib/dates.ts`.** Always zero out time before
  comparing dates.
- `status`: `ACTIVE | EXTENDED | ENDED | EXPIRED_NO_RESPONSE`
- `response`: `EXTENDING | ENDING | null` (plain strings — SQLite has no Prisma
  enums).
- Seeding is wired through `prisma.config.ts` (`migrations.seed`), **not** a
  `"prisma"` block in `package.json`.
- Any new dependency, service, or feature not already described here: **STOP and
  ask** first.
