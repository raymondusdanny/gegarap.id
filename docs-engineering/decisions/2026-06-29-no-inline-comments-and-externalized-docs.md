# Externalize documentation; restrict (not ban) inline comments

- **Date:** 2026-06-29
- **Status:** Superseded by [2026-07-01-full-comment-strip-scope](2026-07-01-full-comment-strip-scope.md) — the deferred scope decision was made: full strip of existing code, with the rationale migrated into the mapping docs.
- **Area:** Whole codebase, documentation strategy

## Decision

Adopt a `docs-engineering/` documentation tree (system overview, modules,
per-file mappings, API contracts, decision logs, onboarding) as the home for all
explanatory prose. Enforce "no prose comments in code" on **new and changed
code**. Migrate existing comments **incrementally, module by module**, not in a
single codebase-wide strip.

Keep a narrow allow-list of non-prose annotations in code (license headers,
`eslint-disable`, `@ts-expect-error`, codegen markers, and a single-line contract
on a non-obvious exported API).

## Why

- The documentation tree is pure upside: it scales for collaboration and gives
  rationale a durable, reviewable home.
- A blanket "delete every comment, including rationale and docstrings" is an
  anti-pattern for this specific codebase. The payment state machine, webhook
  idempotency, escrow lifecycle, and authz/PII gating carry "why" comments that
  encode decisions not recoverable from the code itself. Deleting them removes
  institutional knowledge; renaming cannot express "we do X because Midtrans
  retries webhooks out of order."
- The brief cites "Google-level discipline." Google's own style guides do **not**
  ban comments — they require comments that explain intent and non-obvious
  reasoning. This decision aligns with that, rather than the stricter literal
  reading of the brief.

## Trade-offs

- **Pro:** No loss of hard-won rationale; documentation becomes a first-class,
  searchable asset; change stays reviewable and reversible.
- **Con:** Two places can drift (code and docs). Mitigation: the file-to-doc
  mapping rule and "update the mapping in the same commit as the file."
- **Con:** Slower than a big-bang strip. Accepted: a one-shot strip across a live
  payment system is high-risk for low marginal benefit.

## Alternatives considered

1. **Literal big-bang strip of all comments + full external docs.** Rejected as
   default: high effort, destroys rationale, maximal doc-drift surface, and the
   re-documentation is hard to verify for completeness. Available on request as an
   explicit, scoped choice.
2. **Status quo (inline comments only).** Rejected: no externalized, navigable
   documentation system for onboarding/collaboration.
3. **Docs-only, no comment policy.** Rejected: code and prose would keep
   duplicating rationale with no rule on where it belongs.

## Consequences

- New folder `docs-engineering/` with the structure in its `README.md`.
- The comment policy applies going forward immediately; existing files are
  migrated when touched or in scheduled module passes.
