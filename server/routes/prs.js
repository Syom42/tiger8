import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { personalRecords } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { PrsSchema } from '../validators/schemas.js';

const app = new Hono();
app.use('/prs', requireAuth);

app.get('/prs', async (c) => {
  const rows = await db.select({
    exercise_name: personalRecords.exerciseName,
    weight:        personalRecords.weight,
    reps:          personalRecords.reps,
    achieved_at:   personalRecords.achievedAt,
  }).from(personalRecords).where(eq(personalRecords.userId, c.get('uid')));

  const out = {};
  for (const r of rows) {
    out[r.exercise_name] = { weight: r.weight, reps: r.reps, date: r.achieved_at };
  }
  return c.json(out);
});

app.put('/prs', zValidator('json', PrsSchema), async (c) => {
  const uid = c.get('uid');
  const body = c.req.valid('json');
  // Same-tx batch: one transaction for all PR upserts (atomic + faster).
  await db.transaction(async (tx) => {
    for (const [exerciseName, pr] of Object.entries(body)) {
      const [existing] = await tx.select({
        weight: personalRecords.weight,
        reps: personalRecords.reps,
      }).from(personalRecords).where(and(
        eq(personalRecords.userId, uid),
        eq(personalRecords.exerciseName, exerciseName),
      ));

      const vals = {
        userId: uid,
        exerciseName,
        weight: pr.weight ?? null,
        reps:   pr.reps ?? null,
        achievedAt: pr.date ? new Date(pr.date) : null,
      };
      const incomingWeight = Number(vals.weight);
      const existingWeight = Number(existing?.weight);
      const incomingReps = Number(vals.reps) || 0;
      const existingReps = Number(existing?.reps) || 0;

      if (!Number.isFinite(incomingWeight) || incomingWeight <= 0) continue;
      if (existing && (incomingWeight < existingWeight ||
        (incomingWeight === existingWeight && incomingReps <= existingReps))) {
        continue;
      }

      await tx.insert(personalRecords).values(vals)
        .onConflictDoUpdate({
          target: [personalRecords.userId, personalRecords.exerciseName],
          set: { weight: vals.weight, reps: vals.reps, achievedAt: vals.achievedAt },
        });
    }
  });
  return c.json({ ok: true });
});

export default app;
