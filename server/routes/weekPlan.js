import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { weekPlan } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { WeekPlanSchema } from '../validators/schemas.js';

const app = new Hono();
app.use('/week-plan', requireAuth);

const EMPTY = { sun: '', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '' };

app.get('/week-plan', async (c) => {
  const [row] = await db.select({
    sun: weekPlan.sun, mon: weekPlan.mon, tue: weekPlan.tue,
    wed: weekPlan.wed, thu: weekPlan.thu, fri: weekPlan.fri, sat: weekPlan.sat,
  }).from(weekPlan).where(eq(weekPlan.userId, c.get('uid')));
  return c.json(row ?? EMPTY);
});

app.put('/week-plan', zValidator('json', WeekPlanSchema), async (c) => {
  const uid = c.get('uid');
  const b = c.req.valid('json');
  const vals = {
    userId: uid,
    sun: b.sun ?? '', mon: b.mon ?? '', tue: b.tue ?? '',
    wed: b.wed ?? '', thu: b.thu ?? '', fri: b.fri ?? '', sat: b.sat ?? '',
  };
  await db.insert(weekPlan).values(vals)
    .onConflictDoUpdate({ target: weekPlan.userId, set: vals });
  return c.json({ ok: true });
});

export default app;
