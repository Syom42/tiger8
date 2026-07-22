import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { randomUUID } from 'node:crypto';
import { and, eq, isNull, or, asc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { exercises } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { ExerciseSchema, ExerciseDeleteSchema } from '../validators/schemas.js';

const app = new Hono();
app.use('/exercises', requireAuth);

app.get('/exercises', async (c) => {
  const uid = c.get('uid');
  const rows = await db.select({
    id: exercises.id, user_id: exercises.userId, name: exercises.name,
    muscle: exercises.muscle, description: exercises.description, is_custom: exercises.isCustom,
  }).from(exercises)
    .where(or(eq(exercises.userId, uid), isNull(exercises.userId)))
    .orderBy(asc(exercises.isCustom), asc(exercises.name));
  return c.json(rows);
});

app.post('/exercises', zValidator('json', ExerciseSchema), async (c) => {
  const uid = c.get('uid');
  const { id: requestedId, name, muscle, description } = c.req.valid('json');
  const id = requestedId ?? `custom_${randomUUID()}`;
  const [existing] = await db.select({ userId: exercises.userId }).from(exercises)
    .where(eq(exercises.id, id));
  if (existing && existing.userId !== uid) {
    throw new HTTPException(404, { message: 'exercise not found' });
  }

  if (existing) {
    await db.update(exercises)
      .set({ name, muscle, description: description ?? null })
      .where(and(eq(exercises.id, id), eq(exercises.userId, uid)));
  } else {
    await db.insert(exercises).values({
      id, userId: uid, name, muscle, description: description ?? null, isCustom: true,
    });
  }
  return c.json({ ok: true, id });
});

app.delete('/exercises', zValidator('json', ExerciseDeleteSchema), async (c) => {
  const uid = c.get('uid');
  const { id } = c.req.valid('json');
  await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.userId, uid)));
  return c.json({ ok: true });
});

export default app;
