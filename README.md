# The Boring Newspaper (MVP)

Burmese-first headline aggregator that:
- fetches latest headlines from a list of Burmese news sources
- rewrites titles into neutral Burmese (rules-based MVP)
- deduplicates / clusters same story across sources
- categorizes via keyword rules
- ranks for recency + diversity (anti-echo chamber)
- shows a minimalist headline-first UI

**Non-goals (MVP):** no full-article scraping, no summaries, no accounts, no comments.

---

## Tech

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Render Web Service + Render Cron Job (or any scheduler)
- Tailwind (minimal monochrome)

---

## Environment variables

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` *(required)*
- `FETCH_INTERVAL_MINUTES` *(for cron documentation; the app reads it only for display/docs)*
- `MAX_HEADLINES_PER_SOURCE` *(default 50)*
- `PER_SOURCE_DELAY_MS` *(default 800)*
- `REWRITE_MODE` = `rules` (default) or `llm` (pluggable; stubbed)
- `ADMIN_REFRESH_TOKEN` *(required for POST /api/admin/refresh)*
- `LLM_API_KEY` *(optional; only used if you implement the llm module)*

---

## Local development

```bash
npm install
cp .env.example .env
# set DATABASE_URL to your local Postgres
npx prisma migrate dev
npm run dev
```

Run ingestion manually:

```bash
npm run ingest
```

Or call the admin refresh endpoint:

```bash
curl -X POST http://localhost:3000/api/admin/refresh \
  -H "Authorization: Bearer $ADMIN_REFRESH_TOKEN"
```

Health:

- `GET /health` → shows last fetch time per source + errors.

---

## Production behavior & resilience

- Each source is fetched independently with a per-source delay (`PER_SOURCE_DELAY_MS`).
- If a source breaks (markup change / temporary 5xx), ingestion continues for other sources.
- The UI serves the last known headlines from DB for that source.
- Only headline metadata is stored (title + URL + timestamps).

---

## Render deployment guide

### 1) Create Postgres on Render
- New → PostgreSQL
- Copy the `Internal Database URL` (or External URL depending on setup)

### 2) Deploy the Next.js Web Service
- New → Web Service → connect your repo
- Build command:
  ```bash
  npm install && npm run build
  ```
- Start command:
  ```bash
  npm run start
  ```
- Add environment variables:
  - `DATABASE_URL`
  - `ADMIN_REFRESH_TOKEN`
  - (optionally) `MAX_HEADLINES_PER_SOURCE`, `PER_SOURCE_DELAY_MS`, `REWRITE_MODE`

### 3) Run Prisma migrations on Render
Render can run a one-off command from the dashboard:
```bash
npx prisma migrate deploy
```

(If you prefer, add a deploy hook or a build step—keep it simple for MVP.)

### 4) Add a Render Cron Job (every 15–30 min)
Create a Cron Job that calls your internal endpoint:

- Schedule: `*/20 * * * *` (example: every 20 minutes)
- Command: use curl to hit your web service:

```bash
curl -sS -X POST https://<YOUR-RENDER-URL>/api/admin/refresh \
  -H "Authorization: Bearer $ADMIN_REFRESH_TOKEN"
```

> Tip: Put `ADMIN_REFRESH_TOKEN` into the cron job’s environment variables too.

### 5) Custom domain later
Render dashboard → Settings → Custom Domains, point your domain (e.g. `theboringnewspaper.com`) to Render.

---

## Notes on sources, robots.txt, and ToS

This MVP attempts RSS first; otherwise it scrapes **only** headlines from the homepage using a conservative heuristic.
You should verify each source’s ToS/robots policy and adjust the adapter (or disable a source) if necessary.

---

## Where to edit rules

- Rewrite (neutralization): `lib/rewrite/rules.ts`
- Categorization keywords: `lib/categorize.ts`
- Dedupe threshold & cluster logic: `lib/dedupe.ts`
- Ranking/diversity: `lib/ranking.ts`
- Source list: `lib/ingest/sources/list.ts`

---

## API

- `GET /api/headlines?limit=&category=&source=&sort=&broaden=`
- `GET /api/sources`
- `POST /api/admin/refresh` (Bearer token required)
- `GET /health`

---

## Data model (Headline fields)

Stored per headline:

- `id` (stable sha256 hash of sourceUrl + articleUrl)
- `sourceName`, `sourceUrl`, `articleUrl`
- `originalTitle`, `neutralTitle`
- `publishedAt` (nullable), `fetchedAt`
- `category` (enum)
- `dedupeKey`
- `clusterId` (grouping for cross-source duplicates)
- `language` = "my"
- `rewriteMode` = "rules" | "llm"
- `rewriteFlags` (json array)
- `isActive`

---

## What’s intentionally “MVP”

- Scraping is heuristic and may miss some headlines or break; RSS is preferred when available.
- LLM rewrite is a stub; the interface + safety gate exist so you can plug in later.
- Clustering uses fuzzy similarity on normalized titles within a recent window.



---

## Sprint 2 notes

### Ticker selection
`GET /api/ticker` returns a balanced subset (~20 items). It starts from a recent pool, runs the existing Balanced ranking with diversity pressure (`broaden=true`), then applies caps so one source or one category cannot dominate the ticker.

### Rewrite non-empty guarantee
`rewriteHeadline()` guarantees a non-empty `neutralTitle`. If any rewrite path returns empty/null, the system falls back to a rules-based neutralization and adds a `rewrite_empty_fallback` flag. In ingestion, the saved `neutralTitle` is always a trimmed non-empty string (or ultimately the cleaned original).



---

### Rewrite plumbing verification (Sprint 3 / Activity 1)

1) Run ingestion once
```bash
npm run ingest
```

2) Verify recent items have non-empty neutralTitle and see change/fallback counts
```bash
npm run verify:rewrites
# or a bigger sample
npm run verify:rewrites 50
```

3) Verify API returns displayTitle/usedOriginalFallback
```bash
curl "http://localhost:3000/api/headlines?limit=5&sort=balanced&broaden=0"
```

4) Verify via one-off admin endpoint (requires ADMIN_REFRESH_TOKEN)
```bash
curl "http://localhost:3000/api/admin/rewrite-sample?limit=25" \
  -H "Authorization: Bearer $ADMIN_REFRESH_TOKEN"
```

5) UI check
Reload the homepage: items should render displayTitle (neutral by default). If usedOriginalFallback is true, the UI shows a small “(original)” label.
