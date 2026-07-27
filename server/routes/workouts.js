import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { randomInt } from 'node:crypto';
import { and, eq, desc, asc, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { workouts, workoutExercises, workoutSets, personalRecords } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { WorkoutSchema, WorkoutDeleteSchema } from '../validators/schemas.js';

const app = new Hono();
app.use('/workouts', requireAuth);

app.get('/workouts', async (c) => {
  const uid = c.get('uid');
  // Drizzle relational query is the natural way to do nested fetch, but we
  // didn't declare relations(). Hand-stitch instead — one query per level.
  const wRows = await db.select().from(workouts)
    .where(eq(workouts.userId, uid))
    .orderBy(desc(workouts.date));

  if (wRows.length === 0) return c.json([]);

  const wIds = wRows.map(w => w.id);
  const exRows = await db.select().from(workoutExercises)
    .where(inArray(workoutExercises.workoutId, wIds))
    .orderBy(asc(workoutExercises.sortOrder));

  const exIds = exRows.map(e => e.id);
  const setRows = exIds.length
    ? await db.select().from(workoutSets)
        .where(inArray(workoutSets.workoutExerciseId, exIds))
        .orderBy(asc(workoutSets.sortOrder))
    : [];

  const setsByEx = new Map();
  for (const s of setRows) {
    if (!setsByEx.has(s.workoutExerciseId)) setsByEx.set(s.workoutExerciseId, []);
    setsByEx.get(s.workoutExerciseId).push({
      id: s.id, weight: s.weight, reps: s.reps, done: s.done, sort_order: s.sortOrder,
    });
  }

  const exByWorkout = new Map();
  for (const e of exRows) {
    if (!exByWorkout.has(e.workoutId)) exByWorkout.set(e.workoutId, []);
    exByWorkout.get(e.workoutId).push({
      id: e.id, exercise_name: e.exerciseName,
      rest_seconds: e.restSeconds, sort_order: e.sortOrder,
      sets: setsByEx.get(e.id) ?? [],
    });
  }

  return c.json(wRows.map(w => ({
    id: w.id, name: w.name, muscles: w.muscles, date: w.date, duration: w.duration,
    exercises: exByWorkout.get(w.id) ?? [],
  })));
});

app.post('/workouts', zValidator('json', WorkoutSchema), async (c) => {
  const uid = c.get('uid');
  const { id: requestedId, name, muscles, date, duration, exercises } = c.req.valid('json');
  const id = requestedId ?? randomInt(1, 2 ** 48);

  // Atomic: workout + all exercises + all sets in a single transaction.
  await db.transaction(async (tx) => {
    const [existingWorkout] = await tx.select({ id: workouts.id }).from(workouts)
      .where(eq(workouts.id, id));
    if (existingWorkout) {
      throw new HTTPException(409, { message: 'workout already exists' });
    }

    await tx.insert(workouts).values({
      id, userId: uid, name,
      muscles: muscles ?? [], date: new Date(date),
      duration: duration ?? null,
    });

    const exArr = exercises ?? [];
    for (let i = 0; i < exArr.length; i++) {
      const ex = exArr[i];
      const [weRow] = await tx.insert(workoutExercises).values({
        workoutId: id, exerciseName: ex.name,
        restSeconds: ex.restSeconds ?? 90, sortOrder: i,
      }).returning({ id: workoutExercises.id });

      const setsArr = ex.sets ?? [];
      if (setsArr.length) {
        await tx.insert(workoutSets).values(setsArr.map((s, j) => ({
          workoutExerciseId: weRow.id,
          weight: s.weight ?? null,
          reps:   s.reps ?? null,
          done:   s.done ?? false,
          sortOrder: j,
        })));
      }

      const bestSet = setsArr
        .filter(set => set.done)
        .map(set => ({ weight: Number(set.weight), reps: Number(set.reps) || 0 }))
        .filter(set => Number.isFinite(set.weight) && set.weight > 0)
        .sort((first, second) => second.weight - first.weight || second.reps - first.reps)[0];

      if (!bestSet) continue;

      const [existingPr] = await tx.select({
        weight: personalRecords.weight,
        reps: personalRecords.reps,
      }).from(personalRecords).where(and(
        eq(personalRecords.userId, uid),
        eq(personalRecords.exerciseName, ex.name),
      ));

      const existingWeight = Number(existingPr?.weight);
      const existingReps = Number(existingPr?.reps) || 0;
      if (existingPr && (bestSet.weight < existingWeight ||
        (bestSet.weight === existingWeight && bestSet.reps <= existingReps))) {
        continue;
      }

      await tx.insert(personalRecords).values({
        userId: uid,
        exerciseName: ex.name,
        weight: String(bestSet.weight),
        reps: bestSet.reps,
        achievedAt: new Date(date),
      }).onConflictDoUpdate({
        target: [personalRecords.userId, personalRecords.exerciseName],
        set: { weight: String(bestSet.weight), reps: bestSet.reps, achievedAt: new Date(date) },
      });
    }
  });

  return c.json({ ok: true, id });
});

app.delete('/workouts', zValidator('json', WorkoutDeleteSchema), async (c) => {
  const uid = c.get('uid');
  const { id } = c.req.valid('json');
  await db.delete(workouts).where(and(eq(workouts.id, id), eq(workouts.userId, uid)));
  return c.json({ ok: true });
});

export default app;
