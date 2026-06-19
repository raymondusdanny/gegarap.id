# Track B — Phased Architecture Plan (Gegarap.id)

> Companion to the **Architecture, Security & Marketplace Trust** brief. Track A
> (PII gate, ownership policy, contact gating, anti-scraping, business metrics)
> is **done and shipped**. This document is the deliberate plan for the heavy,
> higher-risk pieces — to be executed in order, each behind its own PR + review,
> **not** as a single big-bang rewrite of a live, money-handling system.

## Guiding constraints

- The app is **deployed and processing real transactions**. Every phase must be
  shippable incrementally, reversible, and must not require a flag-day cutover.
- Prisma migrations are **applied deliberately** (never auto on deploy). New code
  must tolerate "migration not yet applied" where feasible (see Track A's
  `DeviceEvent` guard for the pattern).
- Don't regress the payment lifecycle that already exists (`lib/payment-state`,
  `lib/payout`, webhook idempotency). Track B *wraps/relocates* it, never rewrites
  its guarantees from scratch.

---

## Phase B1 — DDD module skeleton + enforced boundaries (Brief §2, §12.1)

**Goal:** `src/modules/{auth,provider,booking,payment,admin,shared}` with
`service / repository / policy / dto`, and a lint rule that fails the build if an
API route imports Prisma or a repository directly.

**Approach (strangler, not rewrite):**
1. Create the folders + `shared/` (move `errors.ts`, `logger.ts`, `authz.ts`
   here as `shared/`). Re-export from old paths to avoid churn.
2. Introduce a **repository layer per module** that wraps the existing `lib`
   queries — start with `payment` and `booking` (highest-value to isolate).
   Services call repositories; routes call services. Migrate routes one at a time.
3. Add the lint rule **last**, once the worst offenders are migrated, as
   `no-restricted-imports` (ban `@/lib/prisma` outside `**/repository/*`) +
   a custom rule banning `repository` imports outside same-module `service`.

**Risk:** medium. Churn across many files. **Mitigation:** re-export shims; migrate
per-module; keep tests green at each step. **Effort:** large (the bulk of Track B).

---

## Phase B2 — Booking state machine as data + guards (Brief §4)

**Goal:** replace the free-form `Job.status` string with an explicit
`BookingStatus` + a `TRANSITION_MAP` and pure guard functions (mirrors the
existing `lib/payment-state` design, which is the proven template).

**Notes / divergence to resolve first:**
- The brief's names (`CREATED → DP_PENDING → DP_PAID → CONFIRMED → IN_PROGRESS →
  COMPLETED`) differ from the live ones (`PENDING/CONFIRMED/IN_PROGRESS/
  COMPLETED/CANCELLED` + the free-form `AWAITING_CONFIRMATION`). **Decide one
  canonical naming** before coding (recommend keeping live names + adding the
  missing `AWAITING_CONFIRMATION` formally) and align with the Payment status
  doc so frontend has a single mapping.
- In the live flow the **webhook** auto-confirms the job on payment (there's no
  separate provider "Terima Job" accept step). If §4's "provider accepts" guard
  is wanted, that's a **product change**, not just a refactor — confirm with PO.

**Effort:** medium. Builds directly on the payment-state pattern. Ship as: add
`booking-state.ts` + guards + tests → route `Job.status` writes through it.

---

## Phase B3 — Outbox for booking↔payment transitions (Brief §4)

**Goal:** a `BookingTransitionOutbox` table so a webhook that updates payment but
fails before updating booking doesn't leave a half-state. Worker drains + retries.

**Approach:** write the intent in the same DB transaction as the payment change;
a cron/worker (we already have the Vercel cron pattern) processes pending outbox
rows idempotently. Depends on B2 (needs the booking state machine).

**Risk:** medium — touches the money path. Must be idempotent + ordered.
**Effort:** medium.

---

## Phase B4 — Double-entry ledger (Brief §5) ⚠️ highest-risk

**Goal:** every financial event produces ≥2 balanced `LedgerEntry` rows
(`SUM(DEBIT)==SUM(CREDIT)` per `transactionGroupId`), with the reconciliation
invariant `ledger escrow balance == gateway HELD total`.

**Coexistence strategy (critical):** the ledger is **additive bookkeeping on top
of** the existing `Payment`/`Payout` records — it does **not** replace them at
first. Phases:
1. Add `LedgerEntry` model + `shared/ledger-primitives` (post a balanced group in
   one tx; unique constraint `(bookingId, type)` to stop double-posting; row lock
   `SELECT … FOR UPDATE` on booking — note Prisma raw is needed for the lock).
2. **Shadow-write**: emit ledger entries alongside the current PAID/RELEASED/
   payout/refund flows, without anyone reading them yet.
3. Add the **reconciliation cron** + invariant tests; run in shadow for a while
   and compare ledger-derived balances to the existing `Payment` truth.
4. Only once shadow numbers match for real traffic, switch reports/GMV to read
   from the ledger.

**Risk:** high (real money, concurrency). **Mitigation:** shadow-write + reconcile
before any read-switch; never delete the existing records. **Effort:** large.

---

## Phase B5 — Queue + dead-letter + business-key idempotency (Brief §7)

**Goal:** notifications/KYC/audit run through a real queue with business-key
idempotency (e.g. `notif:booking-confirmed:{bookingId}`), exponential backoff,
max retries → dead-letter + ops alert.

**Reality check:** the app is **serverless (Vercel)** — there's no always-on
worker. Options: (a) a managed queue (Upstash QStash / Inngest) — least infra;
(b) a DB-backed `JobQueue` table drained by cron (consistent with current cron
pattern, weaker latency). Recommend **(a) QStash/Inngest**. This also resolves
the standing "cross-instance rate limit" limitation (in-memory today).

**Effort:** medium. Largely additive; migrate the current best-effort WA sends
behind the queue interface.

---

## Phase B6 — PostGIS geo search + grid cache (Brief §9)

**Goal:** `geography`/`geometry` column + GIST index for radius queries; cache
search results per rounded bounding-box grid + category (short TTL).

**Approach:** enable PostGIS extension (managed Postgres on Railway supports it),
add a generated geo column from lat/lng, GIST index, switch the search query to a
radius operator. Cache via the queue provider's KV or Upstash Redis. Keep the
**fuzzed-coordinate output gate** (Track A) unchanged — only the *query* changes.

**Risk:** low-medium (DB extension + migration). **Effort:** medium.

---

## Suggested sequence & dependencies

```
B1 (modules) ──► B2 (booking SM) ──► B3 (outbox)
                       │
                       └──► B4 (ledger, shadow→reconcile→switch)   ⚠️ gate on PO + finance
B5 (queue+DLQ)  — independent, can run in parallel after B1
B6 (PostGIS)    — independent, can run any time after B1
```

**Recommended first PR:** B1 skeleton for the `payment` + `booking` modules only
(re-export shims, no behaviour change) — it unlocks everything else with the
lowest risk. **Do not start B4 (ledger) without explicit product/finance sign-off**
and the shadow-write safety net above.
