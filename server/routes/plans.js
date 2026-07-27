import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { randomInt } from 'node:crypto';
import { and, eq, asc, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { plans, planExercises, weekPlan } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { PlanSchema, PlanDeleteSchema } from '../validators/schemas.js';

const app = new Hono();
app.use('/plans', requireAuth);

app.get('/plans', async (c) => {
  const uid = c.get('uid');
  const pRows = await db.select().from(plans)
    .where(eq(plans.userId, uid))
    .orderBy(asc(plans.createdAt));

  if (pRows.length === 0) return c.json([]);

  const exRows = await db.select().from(planExercises)
    .where(inArray(planExercises.planId, pRows.map(p => p.id)))
    .orderBy(asc(planExercises.sortOrder));

  const byPlan = new Map();
  for (const e of exRows) {
    if (!byPlan.has(e.planId)) byPlan.set(e.planId, []);
    byPlan.get(e.planId).push({
      id: e.id, exercise_name: e.exerciseName,
      rest_seconds: e.restSeconds, sort_order: e.sortOrder,
    });
  }

  return c.json(pRows.map(p => ({
    id: p.id, name: p.name, description: p.description,
    exercises: byPlan.get(p.id) ?? [],
  })));
});

app.post('/plans', zValidator('json', PlanSchema), async (c) => {
  const uid = c.get('uid');
  const { id: requestedId, name, description, exercises } = c.req.valid('json');
  const id = requestedId ?? randomInt(1, 2 ** 48);

  await db.transaction(async (tx) => {
    const [existing] = await tx.select({ userId: plans.userId }).from(plans)
      .where(eq(plans.id, id));
    if (existing && existing.userId !== uid) {
      throw new HTTPException(404, { message: 'plan not found' });
    }

    if (existing) {
      await tx.update(plans)
        .set({ name, description: description ?? null })
        .where(and(eq(plans.id, id), eq(plans.userId, uid)));
    } else {
      await tx.insert(plans).values({ id, userId: uid, name, description: description ?? null });
    }

    await tx.delete(planExercises).where(eq(planExercises.planId, id));

    const exArr = (exercises ?? []).filter(Boolean);
    const toInsert = [];
    for (let i = 0; i < exArr.length; i++) {
      const ex = exArr[i];
      const exName = typeof ex === 'string' ? ex : (ex.name || ex.exercise_name);
      if (!exName) continue;
      const rest = typeof ex === 'string' ? 90 : (ex.restSeconds || ex.rest_seconds || 90);
      toInsert.push({ planId: id, exerciseName: exName, restSeconds: rest, sortOrder: i });
    }
    if (toInsert.length) await tx.insert(planExercises).values(toInsert);
  });

  return c.json({ ok: true });
});

app.delete('/plans', zValidator('json', PlanDeleteSchema), async (c) => {
  const uid = c.get('uid');
  const { id } = c.req.valid('json');
  await db.transaction(async (tx) => {
    const [plan] = await tx.select({ id: plans.id }).from(plans)
      .where(and(eq(plans.id, id), eq(plans.userId, uid)));
    if (!plan) return;

    const clearPlan = (day) => sql`case when ${day} = ${id} then null else ${day} end`;
    await tx.update(weekPlan).set({
      sun: clearPlan(weekPlan.sun), mon: clearPlan(weekPlan.mon), tue: clearPlan(weekPlan.tue),
      wed: clearPlan(weekPlan.wed), thu: clearPlan(weekPlan.thu), fri: clearPlan(weekPlan.fri), sat: clearPlan(weekPlan.sat),
    }).where(eq(weekPlan.userId, uid));
    await tx.delete(plans).where(eq(plans.id, id));
  });
  return c.json({ ok: true });
});

export default app;
