import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, asc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { weightLog } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { WeightCreateSchema, WeightDeleteSchema } from '../validators/schemas.js';

const app = new Hono();
app.use('/weight', requireAuth);

app.get('/weight', async (c) => {
  const rows = await db.select({
    id: weightLog.id, weight: weightLog.weight, date: weightLog.date, note: weightLog.note,
  }).from(weightLog)
    .where(eq(weightLog.userId, c.get('uid')))
    .orderBy(asc(weightLog.date));
  return c.json(rows);
});

app.post('/weight', zValidator('json', WeightCreateSchema), async (c) => {
  const uid = c.get('uid');
  const { weight, date, note } = c.req.valid('json');
  const [row] = await db.insert(weightLog)
    .values({ userId: uid, weight: String(weight), date, note: note ?? null })
    .returning({ id: weightLog.id });
  return c.json({ ok: true, id: row.id });
});

app.delete('/weight', zValidator('json', WeightDeleteSchema), async (c) => {
  const uid = c.get('uid');
  const { id } = c.req.valid('json');
  await db.delete(weightLog).where(and(eq(weightLog.id, id), eq(weightLog.userId, uid)));
  return c.json({ ok: true });
});

export default app;
