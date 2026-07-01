# Scope decision: full comment strip across the codebase

- **Date:** 2026-07-01
- **Status:** Accepted
- **Supersedes:** [2026-06-29-no-inline-comments-and-externalized-docs](2026-06-29-no-inline-comments-and-externalized-docs.md) (which was "Proposed — awaiting scope decision")

## Decision

The 2026-06-29 record set up the `docs-engineering/` tree and proposed a
**nuanced** policy ("restrict, not ban" inline comments) while explicitly
deferring the scope of any strip of existing code. That scope decision has now
been made: **strip all explanatory comments from the entire codebase** and
externalize the rationale into this documentation tree.

This is the "literal big-bang strip" that the prior record listed as
*"available on request as an explicit, scoped choice."* It was chosen with the
trade-offs surfaced in advance.

## What "strip" means here

- Remove every prose comment: `//`, `/* */`, and docstrings used as explanation.
- **Preserve functional, non-prose annotations** — these are tooling directives,
  not documentation, and removing them changes behavior or breaks the build:
  - `eslint-disable` / `eslint-disable-next-line` (6 occurrences in `src/`),
  - `@ts-expect-error` / `@ts-ignore` (none present today),
  - build/codegen markers such as webpack magic comments (none present today).
- Migrate the "why" of each stripped file into its `mappings/{file}.md` so no
  institutional knowledge is lost.

## Why (per the user's brief)

Self-explanatory code with a single, externalized home for rationale; documentation
becomes a first-class, reviewable asset instead of prose scattered across sources.

## Trade-offs (acknowledged, accepted)

- **Con:** A large, mechanical change across ~174 comment-bearing files; the "why"
  must be faithfully transcribed or knowledge is lost. Mitigation: each file is
  stripped **with** its mapping doc in the same pass, and the build is validated
  after each module.
- **Con:** Code and docs can drift. Mitigation: the file-to-doc rule + "update the
  mapping in the same commit as the file."
- **Con:** Higher risk than the incremental default on a live payment system.
  Mitigation: done on branch `chore/no-inline-comments-docs`, module by module,
  each pass typecheck/build-verified, reviewed via PR — never a blind regex sweep.

## Rollout (module by module, validated each pass)

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | AI assistant backend: `lib/ai/prompt.ts`, `lib/ai/chat.ts`, `app/api/ai/chat/route.ts` | ✅ done (typecheck clean) |
| 2 | AI assistant remainder: `lib/ai/extract.ts`, `search.ts`, `fraud.ts`, `lib/cache.ts`, `components/ai/AiChat.tsx` | ⬜ pending |
| 3 | Payments & escrow | ⬜ pending |
| 4 | Auth & identity | ⬜ pending |
| 5 | Marketplace & providers, KYC/admin, marketing/UI, remaining `lib`/hooks | ⬜ pending |

Each phase: strip prose comments (keep directives) → write/refresh the mapping
docs → `tsc --noEmit` + `next build` → commit.
