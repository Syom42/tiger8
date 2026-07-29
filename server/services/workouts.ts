import { randomInt } from 'node:crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db, type Transaction } from '../db/client.js';
import {
  personalRecords, workoutExercises, workoutSets, workouts,
  type WorkoutExerciseRow, type WorkoutRow, type WorkoutSetRow,
} from '../db/schema.js';
import type { WorkoutInput, WorkoutSetInput } from '../validators/workouts.js';

// The API speaks snake_case; the DB layer speaks camelCase. These DTOs are the
// contract the client depends on — keep the key names stable.
export interface WorkoutSetDto {
  id: number;
  weight: string | null;
  reps: string | null;
  done: boolean;
  rpe: number | null;
  rir: number | null;
  is_warmup: boolean;
  sort_order: number;
}

export interface WorkoutExerciseDto {
  id: number;
  exercise_name: string;
  rest_seconds: number | null;
  superset_group: string | null;
  sort_order: number;
  sets: WorkoutSetDto[];
}

export interface WorkoutDto {
  id: number;
  name: string;
  muscles: string[] | null;
  date: Date;
  duration: number | null;
  exercises: WorkoutExerciseDto[];
}

// ---- mappers ---------------------------------------------------------------

export function groupSetsByExercise(rows: WorkoutSetRow[]): Map<number, WorkoutSetDto[]> {
  const byExercise = new Map<number, WorkoutSetDto[]>();
  for (const set of rows) {
    const list = byExercise.get(set.workoutExerciseId) ?? [];
    list.push({
      id: set.id,
      weight: set.weight,
      reps: set.reps,
      done: set.done,
      rpe: set.rpe,
      rir: set.rir,
      is_warmup: set.isWarmup,
      sort_order: set.sortOrder,
    });
    byExercise.set(set.workoutExerciseId, list);
  }
  return byExercise;
}

export function groupExercisesByWorkout(
  rows: WorkoutExerciseRow[],
  setsByExercise: Map<number, WorkoutSetDto[]>,
): Map<number, WorkoutExerciseDto[]> {
  const byWorkout = new Map<number, WorkoutExerciseDto[]>();
  for (const exercise of rows) {
    const list = byWorkout.get(exercise.workoutId) ?? [];
    list.push({
      id: exercise.id,
      exercise_name: exercise.exerciseName,
      rest_seconds: exercise.restSeconds,
      superset_group: exercise.supersetGroup,
      sort_order: exercise.sortOrder,
      sets: setsByExercise.get(exercise.id) ?? [],
    });
    byWorkout.set(exercise.workoutId, list);
  }
  return byWorkout;
}

export function toWorkoutDto(row: WorkoutRow, exercises: WorkoutExerciseDto[]): WorkoutDto {
  return {
    id: row.id,
    name: row.name,
    muscles: row.muscles,
    date: row.date,
    duration: row.duration,
    exercises,
  };
}

// ---- queries ---------------------------------------------------------------

/** Drizzle relational queries would be the natural fit, but we never declared
 *  `relations()` — so we hand-stitch with one query per level. */
export async function listWorkouts(uid: number): Promise<WorkoutDto[]> {
  const workoutRows = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, uid))
    .orderBy(desc(workouts.date));
  if (workoutRows.length === 0) return [];

  const exerciseRows = await db
    .select()
    .from(workoutExercises)
    .where(inArray(workoutExercises.workoutId, workoutRows.map((w) => w.id)))
    .orderBy(asc(workoutExercises.sortOrder));

  const exerciseIds = exerciseRows.map((e) => e.id);
  const setRows = exerciseIds.length
    ? await db
        .select()
        .from(workoutSets)
        .where(inArray(workoutSets.workoutExerciseId, exerciseIds))
        .orderBy(asc(workoutSets.sortOrder))
    : [];

  const exercisesByWorkout = groupExercisesByWorkout(exerciseRows, groupSetsByExercise(setRows));
  return workoutRows.map((w) => toWorkoutDto(w, exercisesByWorkout.get(w.id) ?? []));
}

/** Heaviest completed working set, ignoring warmups. */
function bestSetOf(sets: WorkoutSetInput[]): { weight: number; reps: number } | undefined {
  return sets
    .filter((set) => set.done && !set.isWarmup)
    .map((set) => ({ weight: Number(set.weight), reps: Number(set.reps) || 0 }))
    .filter((set) => Number.isFinite(set.weight) && set.weight > 0)
    .sort((first, second) => second.weight - first.weight || second.reps - first.reps)
    .at(0);
}

async function upsertPersonalRecord(
  tx: Transaction,
  uid: number,
  exerciseName: string,
  best: { weight: number; reps: number },
  achievedAt: Date,
): Promise<void> {
  const existing = (
    await tx
      .select({ weight: personalRecords.weight, reps: personalRecords.reps })
      .from(personalRecords)
      .where(and(eq(personalRecords.userId, uid), eq(personalRecords.exerciseName, exerciseName)))
  ).at(0);

  if (existing) {
    const existingWeight = Number(existing.weight);
    const existingReps = Number(existing.reps) || 0;
    const notAnImprovement =
      best.weight < existingWeight ||
      (best.weight === existingWeight && best.reps <= existingReps);
    if (notAnImprovement) return;
  }

  const values = { weight: String(best.weight), reps: best.reps, achievedAt };
  await tx
    .insert(personalRecords)
    .values({ userId: uid, exerciseName, ...values })
    .onConflictDoUpdate({
      target: [personalRecords.userId, personalRecords.exerciseName],
      set: values,
    });
}

/** Recomputes every PR from scratch — used after a delete, where an existing
 *  record may no longer be backed by any workout. */
export async function rebuildPersonalRecords(tx: Transaction, uid: number): Promise<void> {
  const rows = await tx
    .select({
      exerciseName: workoutExercises.exerciseName,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      date: workouts.date,
    })
    .from(workouts)
    .innerJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(workoutSets, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(and(eq(workouts.userId, uid), eq(workoutSets.done, true)));

  const bestByExercise = new Map<string, { weight: number; reps: number; date: Date }>();
  for (const row of rows) {
    const weight = Number(row.weight);
    const reps = Number(row.reps) || 0;
    if (!Number.isFinite(weight) || weight <= 0) continue;
    const current = bestByExercise.get(row.exerciseName);
    if (!current || weight > current.weight || (weight === current.weight && reps > current.reps)) {
      bestByExercise.set(row.exerciseName, { weight, reps, date: row.date });
    }
  }

  await tx.delete(personalRecords).where(eq(personalRecords.userId, uid));
  if (bestByExercise.size === 0) return;

  await tx.insert(personalRecords).values(
    [...bestByExercise.entries()].map(([exerciseName, record]) => ({
      userId: uid,
      exerciseName,
      weight: String(record.weight),
      reps: record.reps,
      achievedAt: record.date,
    })),
  );
}

/** Workout + all exercises + all sets + PR updates in a single transaction. */
export async function createWorkout(uid: number, input: WorkoutInput): Promise<number> {
  const id = input.id ?? randomInt(1, 2 ** 48);
  const performedAt = new Date(input.date);

  await db.transaction(async (tx) => {
    const alreadyExists = (
      await tx.select({ id: workouts.id }).from(workouts).where(eq(workouts.id, id))
    ).at(0);
    if (alreadyExists) throw new HTTPException(409, { message: 'workout already exists' });

    await tx.insert(workouts).values({
      id,
      userId: uid,
      name: input.name,
      muscles: input.muscles ?? [],
      date: performedAt,
      duration: input.duration ?? null,
    });

    const exerciseInputs = input.exercises ?? [];
    for (const [index, exercise] of exerciseInputs.entries()) {
      const [inserted] = await tx
        .insert(workoutExercises)
        .values({
          workoutId: id,
          exerciseName: exercise.name,
          restSeconds: exercise.restSeconds ?? 120,
          supersetGroup: exercise.supersetGroup ?? null,
          sortOrder: index,
        })
        .returning({ id: workoutExercises.id });

      const sets = exercise.sets ?? [];
      if (sets.length) {
        await tx.insert(workoutSets).values(
          sets.map((set, setIndex) => ({
            workoutExerciseId: inserted.id,
            weight: set.weight ?? null,
            reps: set.reps ?? null,
            done: set.done ?? false,
            rpe: set.rpe ?? null,
            rir: set.rir ?? null,
            isWarmup: set.isWarmup ?? false,
            sortOrder: setIndex,
          })),
        );
      }

      const best = bestSetOf(sets);
      if (best) await upsertPersonalRecord(tx, uid, exercise.name, best, performedAt);
    }
  });

  return id;
}

export async function deleteWorkout(uid: number, id: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(workouts).where(and(eq(workouts.id, id), eq(workouts.userId, uid)));
    await rebuildPersonalRecords(tx, uid);
  });
}
