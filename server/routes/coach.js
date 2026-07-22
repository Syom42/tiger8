import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { env } from '../env.js';
import { requireAuth } from '../middleware/auth.js';
import { CoachSchema } from '../validators/schemas.js';
import { rateLimit } from '../middleware/rateLimit.js';

const app = new Hono();

const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const COACH_SYSTEM_PROMPT = 'You are Tiger8, a careful fitness coach. Answer in Hebrew unless the user writes in another language. Give practical training guidance, state uncertainty, and avoid medical diagnosis.';

app.post('/coach', requireAuth, rateLimit({ key: 'coach', max: 10, windowMs: 60_000 }), zValidator('json', CoachSchema), async (c) => {
  const apiKey = env().GROQ_API_KEY;
  if (!apiKey) throw new HTTPException(503, { message: 'GROQ_API_KEY not configured on server' });

  const { messages, temperature, max_tokens } = c.req.valid('json');
  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: COACH_SYSTEM_PROMPT }, ...messages],
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 512,
      }),
    });
    const data = await groqRes.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!groqRes.ok || !content) {
      console.error('[coach] Groq request failed', groqRes.status);
      return c.json({ error: 'coach unavailable' }, 503);
    }
    return c.json({ choices: [{ message: { content } }] });
  } catch (error) {
    console.error('[coach] Groq request failed', error instanceof Error ? error.message : error);
    return c.json({ error: 'coach unavailable' }, 503);
  }
});

export default app;
