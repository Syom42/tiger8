import { HTTPException } from 'hono/http-exception';
import { env } from '../config/env.js';
import type { CoachInput } from '../validators/coach.js';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 15_000;
const SYSTEM_PROMPT =
  'You are Tiger8, a careful fitness coach. Answer in Hebrew unless the user writes in another language. ' +
  'Give practical training guidance, state uncertainty, and avoid medical diagnosis.';

interface GroqCompletion {
  choices?: { message?: { content?: unknown } }[];
}

/** Returns the assistant reply, or throws a 503 HTTPException. */
export async function askCoach(input: CoachInput): Promise<string> {
  const apiKey = env().GROQ_API_KEY;
  if (!apiKey) {
    throw new HTTPException(503, { message: 'GROQ_API_KEY not configured on server' });
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...input.messages],
        temperature: input.temperature ?? 0.7,
        max_tokens: input.max_tokens ?? 512,
      }),
    });

    const data = (await response.json().catch(() => null)) as GroqCompletion | null;
    const raw = data?.choices?.[0]?.message?.content;
    const content = typeof raw === 'string' ? raw.trim() : '';

    if (!response.ok || !content) {
      console.error('[coach] Groq request failed', response.status);
      throw new HTTPException(503, { message: 'coach unavailable' });
    }
    return content;
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('[coach] Groq request failed', error instanceof Error ? error.message : error);
    throw new HTTPException(503, { message: 'coach unavailable' });
  }
}
