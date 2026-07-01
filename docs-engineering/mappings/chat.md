# Mapping: src/lib/ai/chat.ts

The Claude call for the assistant. Uses `@anthropic-ai/sdk` with
`claude-sonnet-4-6` and structured outputs (`output_config.format`) so the JSON
contract is guaranteed by the API. Without `ANTHROPIC_API_KEY` — or on any error
— it returns the deterministic grounded fallback from `prompt.ts`.

## Constants

- `MODEL = 'claude-sonnet-4-6'`.
- `isAIConfigured: boolean` — true when `ANTHROPIC_API_KEY` is set. When false, `generateRecommendation` short-circuits to the fallback and reports `mock: true`.

## Types

- `ChatTurn` — `{ role: 'user' | 'assistant', content: string }`.
- `RecommendationResult` — `{ recommendation, mock }`. `mock === true` means the deterministic fallback produced the turn with **no** LLM call. A cache hit or an LLM error both report `mock: false`.

## Function: generateRecommendation

- **Purpose:** Produce one assistant turn from a query + retrieved providers + short history.
- **Input:** `{ query, providers, history? }`.
- **Output:** `Promise<RecommendationResult>`.
- **Flow:**
  - no API key → fallback (`mock: true`);
  - else build messages = last 6 history turns + the `buildUserTurn` message;
  - call Claude (`thinking: disabled`, structured `json_schema`);
  - parse the text block, validate `pesan`/`rekomendasi` shape, log `ai.chat`;
  - any throw → fallback (`mock: false`), log `ai.chat.failed`.
- **Reasoning:** History is capped at 6 turns to bound token cost. Structured output shapes the JSON, so there is no fragile prompt-parsing.

## Consumers

`src/app/api/ai/chat/route.ts`.
