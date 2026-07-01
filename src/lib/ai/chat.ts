import Anthropic from '@anthropic-ai/sdk';
import { logEvent } from '@/lib/logger';
import {
  SYSTEM_PROMPT,
  RECOMMENDATION_SCHEMA,
  buildUserTurn,
  fallbackRecommendation,
  type ChatRecommendation,
} from './prompt';
import type { SearchedProvider } from './search';

const MODEL = 'claude-sonnet-4-6';
const apiKey = process.env.ANTHROPIC_API_KEY;

export const isAIConfigured = Boolean(apiKey);

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface RecommendationResult {
  recommendation: ChatRecommendation;
  mock: boolean;
}

export async function generateRecommendation(input: {
  query: string;
  providers: SearchedProvider[];
  history?: ChatTurn[];
}): Promise<RecommendationResult> {
  const { query, providers, history = [] } = input;

  if (!isAIConfigured) {
    return { recommendation: fallbackRecommendation(query, providers), mock: true };
  }

  try {
    const client = new Anthropic({ apiKey: apiKey! });
    const messages: Anthropic.MessageParam[] = [
      ...history.slice(-6).map((t) => ({ role: t.role, content: t.content })),
      { role: 'user', content: buildUserTurn(query, providers) },
    ];

    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1536,
      thinking: { type: 'disabled' },
      system: SYSTEM_PROMPT,
      messages,
      output_config: { format: { type: 'json_schema', schema: RECOMMENDATION_SCHEMA } },
    });

    const block = res.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new Error('no text content');
    const parsed = JSON.parse(block.text) as ChatRecommendation;
    if (typeof parsed.pesan !== 'string' || !Array.isArray(parsed.rekomendasi)) {
      throw new Error('unexpected shape');
    }
    logEvent('ai.chat', { providers: providers.length, recos: parsed.rekomendasi.length });
    return { recommendation: parsed, mock: false };
  } catch (err) {
    logEvent('ai.chat.failed', { error: String(err) }, 'warn');
    return { recommendation: fallbackRecommendation(query, providers), mock: false };
  }
}
