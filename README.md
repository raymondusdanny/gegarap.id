# gegarap.id

A modern, two-sided marketplace connecting customers with verified local tradespeople (_tukang_) — plumbers, electricians, cleaners, and more — across Yogyakarta, Indonesia.

Built with **Next.js 14 (App Router)**, **PostgreSQL + Prisma 7**, **Tailwind CSS**, and a hand-rolled premium design system.

---

## ✨ Features

- **Premium, responsive UI** — Stripe/Linear-inspired design system, mobile-first, with micro-animations and skeleton loaders.
- **Interactive provider search** — live filter by category, sort by rating/price, instant empty states.
- **Hyper-local map** — Leaflet map of available tradespeople around Yogyakarta.
- **End-to-end booking** — real DP-based booking flow with cost breakdown, validation, toasts, and a success modal. Bookings persist to the database.
- **Provider onboarding** — KYC-style signup with full validation.
- **Provider dashboard** — real-time stats and a searchable, sortable, paginated jobs table.
- **Typed API layer** — `zod`-validated routes with a consistent success/error envelope.

## 🧱 Tech Stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js 14 (App Router, React 18)                  |
| Database   | PostgreSQL 16 (Docker)                             |
| ORM        | Prisma 7 (via `@prisma/adapter-pg` driver adapter) |
| Styling    | Tailwind CSS + CSS-variable design tokens          |
| Validation | zod (shared client + server schemas)              |
| Auth       | NextAuth v4 (Google OAuth)                          |
| Maps       | Leaflet / react-leaflet                            |
| Icons      | lucide-react                                       |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults already match `docker-compose.yml`, so no edits are needed for local development.

### 3. Start the database + apply schema + seed (one command)

```bash
npm run setup
```

This runs `docker compose up -d`, pushes the Prisma schema, and seeds demo data.

> Prefer to run the steps individually?
>
> ```bash
> npm run db:up        # start the Postgres container
> npm run db:push      # sync the Prisma schema to the DB
> npm run db:seed      # load demo providers + jobs
> ```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📜 Scripts

| Script                | Description                                  |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Start the dev server                         |
| `npm run build`       | Production build                             |
| `npm run start`       | Start the production server                  |
| `npm run setup`       | DB up + schema push + seed (first-time)      |
| `npm run db:up`       | Start the PostgreSQL container               |
| `npm run db:down`     | Stop the PostgreSQL container                |
| `npm run db:generate` | Generate the Prisma client                   |
| `npm run db:push`     | Push the Prisma schema to the database       |
| `npm run db:migrate`  | Create & apply a migration (dev)             |
| `npm run db:seed`     | Seed demo data                               |
| `npm run db:studio`   | Open Prisma Studio                           |
| `npm run lint`        | Lint                                         |
| `npm run format`      | Format with Prettier                         |

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── (customer)/         # Customer routes: search, booking
│   ├── (provider)/         # Provider routes: onboarding, dashboard
│   ├── api/                # Route handlers (bookings, providers, auth)
│   ├── layout.tsx          # Root layout (Navbar, Footer, ToastProvider)
│   └── page.tsx            # Landing page
├── components/
│   ├── ui/                 # Design-system primitives (Button, Card, Input, Modal, Toast…)
│   ├── layout/             # Navbar, Footer
│   ├── providers/          # ProviderCard, SearchClient
│   ├── dashboard/          # JobsTable
│   └── map/                # Leaflet map (client-only)
├── lib/
│   ├── prisma.ts           # Prisma client singleton (pg adapter)
│   ├── validations.ts      # zod schemas (shared)
│   ├── api.ts              # API response helpers + error handling
│   ├── calculations.ts     # Booking financials
│   └── utils.ts            # cn(), formatCurrency()
└── prisma/
    ├── schema.prisma       # Postgres data model
    └── seed.ts             # Demo data
```

---

## 🐘 Database

PostgreSQL runs in Docker (`docker-compose.yml`) with a persistent named volume (`gegarap_pgdata`). The connection string lives in `.env` as `DATABASE_URL` and is consumed both by Next.js and by `prisma.config.ts`.

For production, point `DATABASE_URL` at any managed Postgres (Supabase, Neon, RDS, etc.) — no code changes required.
