# OPS — The Boring Newspaper (MVP)

This file is the operational runbook for deploying and maintaining the MVP.

## Production
- App URL: https://the-boring-newspaper.onrender.com
- Health endpoint: https://the-boring-newspaper.onrender.com/health

## Render setup (current)
Web Service:
- Build Command: npm install && npm run build
- Start Command: npm run start
Environment variables (Web Service):
- DATABASE_URL (Render Postgres Internal URL)
- ADMIN_REFRESH_TOKEN (secret)
- REWRITE_MODE=rules (optional)
- MAX_HEADLINES_PER_SOURCE=50 (optional)
- PER_SOURCE_DELAY_MS=800–1200 (optional)

Cron Job:
- Schedule: 0 * * * *  (hourly)
- Env vars (Cron Job):
  - ADMIN_REFRESH_TOKEN (same value as Web Service)
- Command (single line):
  curl --fail --show-error --silent -X POST https://the-boring-newspaper.onrender.com/api/admin/refresh -H "Authorization: Bearer $ADMIN_REFRESH_TOKEN"

## Manual refresh (operator action)
From a local terminal:

curl -sS -X POST https://the-boring-newspaper.onrender.com/api/admin/refresh \
  -H "Authorization: Bearer <ADMIN_REFRESH_TOKEN>"

Expected: JSON response containing bySource fetched/stored/errors.

## Database schema provisioning (production)
If migrations exist:
- npx prisma migrate deploy

If “No migrations found”:
- npx prisma db push
- npx prisma generate

## Local development (quickstart)
- npm install
- cp .env.example .env
- set DATABASE_URL to local Postgres
- npx prisma migrate dev
- npm run dev

Ingestion:
- npm run ingest

## Common failures & fixes
Cron job fails with "fg: no job control":
- Cron command must be a single line (no backslashes, no line breaks).

Prisma errors "table does not exist":
- Run: npx prisma db push (or migrate deploy if migrations are present).

Auth fails (401) on refresh endpoint:
- Ensure Authorization header is:
  Authorization: Bearer <ADMIN_REFRESH_TOKEN>
- Ensure Cron Job has ADMIN_REFRESH_TOKEN set (cron does not inherit from web service).
