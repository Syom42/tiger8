import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { supplements, supplementTaken } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import {
  SupplementUpsertSchema, SupplementTakenSchema, SupplementDeleteSchema,
} from '../validators/schemas.js';

const app = new Hono();
app.use('/supplements', requireAuth);

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

app.get('/supplements', async (c) => {
  const uid = c.get('uid');
  // Join taken dates as an aggregated array.
  const rows = await db.execute(sql`
    select s.id, s.name, s.dose, s.time, s.enabled,
           coalesce(json_agg(st.taken_date) filter (where st.taken_date is not null), '[]') as taken_dates
    from supplements s
    left join supplement_taken st on st.supplement_id = s.id
    where s.user_id = ${uid}
    group by s.id
    order by s.name`);
  return c.json(rows.rows ?? rows);
});

app.post('/supplements', zValidator('json', SupplementUpsertSchema), async (c) => {
  const uid = c.get('uid');
  const { id, name, dose, time, enabled } = c.req.valid('json');
  await db.insert(supplements)
    .values({ id, userId: uid, name, dose: dose ?? null, time: time ?? null, enabled: enabled ?? true })
    .onConflictDoUpdate({
      target: supplements.id,
      set: { name, dose: dose ?? null, time: time ?? null, enabled: enabled ?? true },
    });
  return c.json({ ok: true });
});

app.put('/supplements', zValidator('json', SupplementTakenSchema), async (c) => {
  const { id, date, taken } = c.req.valid('json');
  if (taken) {
    await db.insert(supplementTaken).values({ supplementId: id, takenDate: date }).onConflictDoNothing();
  } else {
    await db.delete(supplementTaken)
      .where(and(eq(supplementTaken.supplementId, id), eq(supplementTaken.takenDate, date)));
  }
  // Prune entries older than 30 days.
  await db.delete(supplementTaken)
    .where(and(eq(supplementTaken.supplementId, id), lt(supplementTaken.takenDate, thirtyDaysAgo())));
  return c.json({ ok: true });
});

app.delete('/supplements', zValidator('json', SupplementDeleteSchema), async (c) => {
  const uid = c.get('uid');
  const { id } = c.req.valid('json');
  await db.delete(supplements).where(and(eq(supplements.id, id), eq(supplements.userId, uid)));
  return c.json({ ok: true });
});

export default app;
