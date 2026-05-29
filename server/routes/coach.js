import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { env } from '../env.js';
import { requireAuth } from '../middleware/auth.js';
import { CoachSchema } from '../validators/schemas.js';

const app = new Hono();

const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

app.post('/coach', requireAuth, zValidator('json', CoachSchema), async (c) => {
  const apiKey = env().GROQ_API_KEY;
  if (!apiKey) throw new HTTPException(503, { message: 'GROQ_API_KEY not configured on server' });

  const { messages, temperature, max_tokens } = c.req.valid('json');

  const groqRes = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL, messages,
      temperature: temperature ?? 0.8,
      max_tokens: max_tokens ?? 1024,
    }),
  });

  const data = await groqRes.json();
  return c.json(data, groqRes.ok ? 200 : groqRes.status);
});

export default app;
