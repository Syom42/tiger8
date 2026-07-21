import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { plans, weekPlan } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { WeekPlanSchema } from '../validators/schemas.js';

const app = new Hono();
app.use('/week-plan', requireAuth);

const EMPTY = { sun: null, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null };

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
  const planIds = Object.values(b).filter(id => id !== null && id !== undefined);

  if (planIds.length) {
    const ownedPlans = await db.select({ id: plans.id }).from(plans)
      .where(and(eq(plans.userId, uid), inArray(plans.id, planIds)));
    if (ownedPlans.length !== new Set(planIds).size) {
      return c.json({ error: 'One or more assigned plans do not exist' }, 400);
    }
  }

  const vals = {
    userId: uid,
    sun: b.sun ?? null, mon: b.mon ?? null, tue: b.tue ?? null,
    wed: b.wed ?? null, thu: b.thu ?? null, fri: b.fri ?? null, sat: b.sat ?? null,
  };
  await db.insert(weekPlan).values(vals)
    .onConflictDoUpdate({ target: weekPlan.userId, set: vals });
  return c.json({ ok: true });
});

export default app;
