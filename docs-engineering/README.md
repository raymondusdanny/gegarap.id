# docs-engineering

Externalized engineering documentation for gegarap.id. Reasoning, rationale, and
guidance live here so the code can stay lean and self-describing.

## Layout

| Path | Holds |
|------|-------|
| `system-overview.md` | Architecture, stack decisions, system boundaries, design principles |
| `modules/{module}.md` | Purpose, responsibilities, data flow, dependencies of a module |
| `mappings/{file}.md` | Per-file function map: name → purpose, input/output contract, business-logic reasoning |
| `contracts/api.md` | Endpoint definitions, request/response schema, error handling rules |
| `decisions/{date}-{slug}.md` | Decision logs: what, why, trade-offs, alternatives |
| `onboarding.md` | How to understand the system fast: key flows, entry points |

## File-to-doc mapping rule

A source file at `src/<path>/<name>.<ext>` maps to `docs-engineering/mappings/<name>.md`.
When the file's exported surface changes, its mapping doc changes in the same commit.

App Router files share basenames (`route.ts`, `page.tsx`, `layout.tsx`), so those
use a qualified slug that encodes enough of the path to be unique — e.g.
`src/app/api/ai/chat/route.ts` → `mappings/ai-chat-route.md`.

## Comment policy

The target is self-explanatory code with externalized prose. The deliberate
exception — kept on purpose, see
[`decisions/2026-06-29-no-inline-comments-and-externalized-docs.md`](decisions/2026-06-29-no-inline-comments-and-externalized-docs.md):

- **Allowed in code:** machine-read annotations that are not prose — license
  headers, `eslint-disable`, `@ts-expect-error`, codegen markers, and the
  one-line contract on a non-obvious public API where a reader would otherwise
  open this folder mid-read.
- **Externalized to this folder:** every multi-line explanation, the "why" behind
  a non-obvious decision, gotchas, and flow descriptions.

The rule is "no prose comments that belong in a doc," not "delete every character
after `//`." The distinction matters most in the payment and auth code, where the
"why" is institutional knowledge, not noise.
