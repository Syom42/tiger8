import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { askCoach } from '../services/coach.js';
import type { AppEnv } from '../types.js';
import { CoachSchema } from '../validators/coach.js';

const app = new Hono<AppEnv>();

app.post(
  '/coach',
  requireAuth,
  rateLimit({ key: 'coach', max: 10, windowMs: 60_000 }),
  zValidator('json', CoachSchema),
  async (c) => {
    const content = await askCoach(c.req.valid('json'));
    return c.json({ choices: [{ message: { content } }] });
  },
);

export default app;
