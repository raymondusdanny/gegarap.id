# Deployment & CI/CD

Production deployment for **gegarap.id** is fully automated. Push to `main` and the
app ships — no manual steps.

## Architecture

gegarap.id is a **Next.js 14 monolith**: the UI and the API (route handlers under
`src/app/api/`) compile into a single deployable unit. They cannot be hosted
separately, so the responsibilities are split by concern, not by "frontend/backend":

| Concern | Host | Notes |
| --- | --- | --- |
| Web app (UI **+** API routes + auth) | **Vercel** | Serverless/edge; what Next.js runs best on |
| PostgreSQL database | **Railway** | Managed Postgres 16 + persistent volume |
| Pipeline (lint/build → migrate → deploy) | **GitHub Actions** | `.github/workflows/ci-cd.yml` |

```
 git push main
      │
      ▼
 ┌─────────┐   pass   ┌──────────────────┐   pass   ┌──────────────────────┐
 │   ci    │ ───────► │     migrate      │ ───────► │  deploy-production    │
 │ lint    │          │ prisma migrate   │          │  vercel deploy --prod │
 │ types   │          │ deploy → Railway │          │  (UI + API)           │
 │ build   │          └──────────────────┘          └──────────────────────┘
 └─────────┘
   On PRs: ci ─► deploy-preview (isolated Vercel preview URL, commented on the PR)
```

Deploys run **only after `ci` passes**, so a broken build never reaches production.

---

## One-time setup

### 1. Railway — PostgreSQL

1. Create a project at <https://railway.app> → **New** → **Database** → **Add PostgreSQL**.
2. Open the Postgres service → **Variables / Connect**. You get two URLs:
   - **Public** (`...proxy.rlwy.net:PORT`) — reachable from anywhere. Use this for
     GitHub Actions **and** Vercel.
   - **Private** (`...railway.internal`) — only works between Railway services; the
     app is on Vercel, so it cannot use this.
3. Copy the **public** connection string. Append Prisma-friendly params for
   serverless (keeps Postgres connection count sane on Vercel):
   ```
   postgresql://USER:PASSWORD@HOST.proxy.rlwy.net:PORT/railway?schema=public&connection_limit=5&pool_timeout=20
   ```
   This single value is your `DATABASE_URL` — used in **three** places (Vercel runtime,
   the `vercel build` step, and the GitHub `migrate` job).

> The schema/seed are applied automatically by the pipeline's `migrate` job — you do
> not run anything against Railway by hand. To seed once manually:
> `DATABASE_URL="<railway public url>" npm run db:seed`.

### 2. Vercel — the app

1. Install the CLI and link the project once (creates the Vercel project + IDs):
   ```bash
   npm i -g vercel@latest
   vercel link            # pick/create the project
   ```
2. Add the runtime environment variables in **Vercel → Project → Settings →
   Environment Variables**, for **Production** and **Preview** scopes:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Railway **public** URL (from step 1.3) |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | `https://your-domain.vercel.app` (prod) — leave Preview unset; Vercel injects it |
   | `GOOGLE_CLIENT_ID` | from Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |

   The pipeline pulls these with `vercel pull`, so the app and the `vercel build`
   step both get them automatically.
3. Grab the IDs for GitHub (next section):
   ```bash
   cat .vercel/project.json   # -> { "orgId": "...", "projectId": "..." }
   ```

### 3. GitHub — secrets

**Settings → Secrets and variables → Actions → New repository secret:**

| Secret | Where to get it | Used by |
| --- | --- | --- |
| `VERCEL_TOKEN` | <https://vercel.com/account/tokens> | deploy jobs |
| `VERCEL_ORG_ID` | `.vercel/project.json` → `orgId` | deploy jobs |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `projectId` | deploy jobs |
| `DATABASE_URL` | Railway **public** URL | `migrate` job (and CI build fallback) |

`RAILWAY_TOKEN` is **not required** — migrations run over `DATABASE_URL` directly via
`prisma migrate deploy`. You'd only need it if you also ran the app as a Railway
service (not recommended here; see *Alternative* below).

> Never commit secrets. `.env` is git-ignored; `.env.example` documents the shape only.

---

## How deployment is triggered

| Action | Result |
| --- | --- |
| Open / update a **Pull Request** | `ci` runs; on success a **Vercel preview** is built and the URL is commented on the PR |
| **Merge / push to `main`** | `ci` → `migrate` (Railway) → **production deploy** to Vercel |
| Manual | `git commit --allow-empty -m "redeploy" && git push` |

Nothing else is manual. Vercel's own Git auto-deploy on `main` is disabled
(`vercel.json` → `git.deploymentEnabled.main: false`) so Actions is the single
deploy authority and the CI gate is never bypassed.

---

## Database migrations

The project ships a baseline migration at `prisma/migrations/0_init/`. The pipeline
applies migrations with `prisma migrate deploy` (safe, forward-only — never resets data).

**Workflow for schema changes:**
```bash
# 1. edit prisma/schema.prisma, then create a migration locally
npm run db:up                       # start local Postgres (Docker)
npm run db:migrate -- --name add_x  # prisma migrate dev — creates the SQL + applies locally
git add prisma/migrations && git commit && git push
# 2. CI runs `prisma migrate deploy` against Railway automatically
```

**Local dev is unchanged** for everyday work — `npm run db:push` still works. The first
time you switch a *pre-existing* local DB to migrations, baseline it so Prisma doesn't
try to recreate existing tables:
```bash
npx prisma migrate resolve --applied 0_init
```
A brand-new Railway database needs no baseline — `migrate deploy` applies `0_init` cleanly.

---

## Required environment variables (summary)

| Variable | Local (`.env`) | Vercel (runtime) | GitHub (secret) |
| --- | :---: | :---: | :---: |
| `DATABASE_URL` | ✅ Docker URL | ✅ Railway public | ✅ Railway public |
| `NEXTAUTH_SECRET` | ✅ | ✅ | — |
| `NEXTAUTH_URL` | ✅ `localhost:3000` | ✅ prod domain | — |
| `GOOGLE_CLIENT_ID` | ✅ | ✅ | — |
| `GOOGLE_CLIENT_SECRET` | ✅ | ✅ | — |
| `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | — | — | ✅ |

---

## Troubleshooting

**`migrate` job fails: `Can't reach database server`**
You used Railway's *private* (`*.railway.internal`) URL. GitHub runners are outside
Railway's network — use the **public** `*.proxy.rlwy.net` URL.

**App on Vercel returns 500 / `Can't reach database server`**
Same cause: Vercel cannot use Railway's private URL. Set `DATABASE_URL` in Vercel to
the **public** URL. Also confirm `connection_limit` is set so serverless functions
don't exhaust Postgres connections.

**`prisma migrate deploy` → `relation "User" already exists` (P3009 / P3005)**
The target DB already has tables (e.g. from an earlier `db push`). Baseline it once:
`prisma migrate resolve --applied 0_init` against that database, then re-run.

**Build fails in CI on a DB-backed page**
The build does not need the DB today (all data routes are dynamic). If you add a page
that fetches data at build time, force it dynamic:
`export const dynamic = 'force-dynamic';` at the top of that page.

**`PrismaClientInitializationError` / "client password must be a string"**
`DATABASE_URL` is unset or malformed in that environment. The pg adapter needs a full
`postgresql://user:pass@host:port/db` string. Check the scope (Production vs Preview)
in Vercel.

**NextAuth redirect/callback errors in production**
`NEXTAUTH_URL` must equal the deployed origin, and that exact origin's
`/api/auth/callback/google` must be in the Google OAuth **Authorized redirect URIs**.

**Vercel CLI: "Project not found" / wrong project**
`VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` don't match the token's account. Re-run
`vercel link` and copy fresh IDs from `.vercel/project.json`.

**Preview deploys but PR comment is missing**
Expected on PRs from forks (the `GITHUB_TOKEN` is read-only there). The deploy still
succeeds; the URL is in the job log under the *"Deploy preview"* step. The comment
step is `continue-on-error`, so it never fails the run.

---

## Alternative: run the whole app on Railway too

Not recommended (you'd pay for and maintain two app hosts), but if you ever want the
Next.js app on Railway instead of Vercel: add a service from the repo, set Build =
`npm run build`, Start = `npm run start`, add the same env vars + `RAILWAY_TOKEN`, and
replace the Vercel deploy jobs with `railway up`. Keep **one** app host, not both.
