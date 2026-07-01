# Mapping: src/app/api/ai/chat/route.ts

HTTP entry for the assistant. POST-only, `nodejs` runtime, `force-dynamic`.

> Naming note: the App Router has many `route.ts` files, so a basename mapping
> (`route.md`) would collide. Route/page/layout files use a qualified slug
> (`ai-chat-route.md`) instead. See `docs-engineering/README.md`.

## Constants

- `MAX_MESSAGE_LEN = 500`, `CACHE_TTL_SECONDS = 300`.

## Function: sanitize

- **Purpose:** Clean an untrusted message string.
- **Input:** `unknown`. **Output:** `string | null`.
- **Logic:** Replace control chars with spaces, collapse whitespace, trim, cap at `MAX_MESSAGE_LEN`; empty → `null`.

## Function: asHistory

- **Purpose:** Validate and trim client-sent conversation history.
- **Input:** `unknown`. **Output:** `ChatTurn[]`.
- **Logic:** Keep only well-formed `{ role, content ≤ 2000 }` turns; keep the last 6.

## Function: POST

- **Purpose:** The chat request handler.
- **Input:** JSON body `{ message, history?, sessionId? }`.
- **Output:** `ok({ ...recommendation, providers, sessionId, mock })` or `fail`.
- **Flow:**
  - parse + `sanitize` message (400 on bad input);
  - resolve Firebase session → `userId`;
  - rate limit `ai:chat:{sessionId|ip}` at 20/min (429 on exceed);
  - `extractFilters` + `asHistory`;
  - cache lookup by `sha256(message | filters | history)`;
  - miss → `searchProviders` + `generateRecommendation` → cache 300s;
  - persist `ChatSession` (anonymous allowed; never append to another user's session);
  - respond.

### Design note — the cache key MUST include history

The assistant is multi-turn, so a short follow-up like "iya" or "udah lama"
means different things in different conversations. Keying on the message alone
would serve one user's contextual reply to another. Empty-history first turns
(the suggested chips) still dedupe across users — that is where caching pays off.
Fixed 2026-07-01 alongside the diagnose-first prompt.

### Design note — the mock flag

`mock` comes from `generateRecommendation` and is only `true` on the no-API-key
fallback. A cache hit leaves `mock = false` because `ChatPayload` does not store
it. This is why a live `mock: true` response is proof that `ANTHROPIC_API_KEY` is
unset in the running environment.

### Errors

Bad body/message → 400; rate limit → 429; unexpected → 500 (logged
`ai.chat.error`). Persistence failures are swallowed (logged
`ai.chat.persist_failed`) — a write hiccup must not fail the chat.

## Consumers

`src/components/ai/AiChat.tsx` (client).
