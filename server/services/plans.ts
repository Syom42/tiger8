import { randomInt } from 'node:crypto';
import { and, asc, eq, inArray, sql, type SQLWrapper } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/client.js';
import {
  planExercises, plans, weekPlan,
  type NewPlanExercise, type PlanExerciseRow, type PlanRow,
} from '../db/schema.js';
import type { PlanExerciseInput, PlanInput } from '../validators/plans.js';

const DEFAULT_REST_SECONDS = 120;
const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 10;

export interface PlanExerciseDto {
  id: number;
  exercise_name: string;
  rest_seconds: number | null;
  target_sets: number | null;
  target_reps: number | null;
  superset_group: string | null;
  sort_order: number;
}

export interface PlanDto {
  id: number;
  name: string;
  description: string | null;
  exercises: PlanExerciseDto[];
}

export function groupExercisesByPlan(rows: PlanExerciseRow[]): Map<number, PlanExerciseDto[]> {
  const byPlan = new Map<number, PlanExerciseDto[]>();
  for (const exercise of rows) {
    const list = byPlan.get(exercise.planId) ?? [];
    list.push({
      id: exercise.id,
      exercise_name: exercise.exerciseName,
      rest_seconds: exercise.restSeconds,
      target_sets: exercise.targetSets,
      target_reps: exercise.targetReps,
      superset_group: exercise.supersetGroup,
      sort_order: exercise.sortOrder,
    });
    byPlan.set(exercise.planId, list);
  }
  return byPlan;
}

export function toPlanDto(row: PlanRow, exercises: PlanExerciseDto[]): PlanDto {
  return { id: row.id, name: row.name, description: row.description, exercises };
}

export async function listPlans(uid: number): Promise<PlanDto[]> {
  const planRows = await db
    .select()
    .from(plans)
    .where(eq(plans.userId, uid))
    .orderBy(asc(plans.createdAt));
  if (planRows.length === 0) return [];

  const exerciseRows = await db
    .select()
    .from(planExercises)
    .where(inArray(planExercises.planId, planRows.map((p) => p.id)))
    .orderBy(asc(planExercises.sortOrder));

  const byPlan = groupExercisesByPlan(exerciseRows);
  return planRows.map((p) => toPlanDto(p, byPlan.get(p.id) ?? []));
}

/** Normalises the accepted input shapes (bare name, camelCase, snake_case). */
function toPlanExerciseRow(
  planId: number,
  entry: PlanExerciseInput,
  sortOrder: number,
): NewPlanExercise | null {
  if (typeof entry === 'string') {
    return {
      planId,
      exerciseName: entry,
      restSeconds: DEFAULT_REST_SECONDS,
      targetSets: DEFAULT_TARGET_SETS,
      targetReps: DEFAULT_TARGET_REPS,
      supersetGroup: null,
      sortOrder,
    };
  }

  const exerciseName = entry.name || entry.exercise_name;
  if (!exerciseName) return null;

  return {
    planId,
    exerciseName,
    restSeconds: entry.restSeconds || entry.rest_seconds || DEFAULT_REST_SECONDS,
    targetSets: entry.targetSets || entry.target_sets || DEFAULT_TARGET_SETS,
    targetReps: entry.targetReps || entry.target_reps || DEFAULT_TARGET_REPS,
    supersetGroup: entry.supersetGroup || entry.superset_group || null,
    sortOrder,
  };
}

/** Create-or-replace: the exercise list is always rewritten wholesale. */
export async function savePlan(uid: number, input: PlanInput): Promise<number> {
  const id = input.id ?? randomInt(1, 2 ** 48);
  const description = input.description ?? null;

  await db.transaction(async (tx) => {
    const existing = (
      await tx.select({ userId: plans.userId }).from(plans).where(eq(plans.id, id))
    ).at(0);
    if (existing && existing.userId !== uid) {
      throw new HTTPException(404, { message: 'plan not found' });
    }

    if (existing) {
      await tx
        .update(plans)
        .set({ name: input.name, description })
        .where(and(eq(plans.id, id), eq(plans.userId, uid)));
    } else {
      await tx.insert(plans).values({ id, userId: uid, name: input.name, description });
    }

    await tx.delete(planExercises).where(eq(planExercises.planId, id));

    const rows = (input.exercises ?? [])
      .filter(Boolean)
      .map((entry, index) => toPlanExerciseRow(id, entry, index))
      .filter((row): row is NewPlanExercise => row !== null);
    if (rows.length) await tx.insert(planExercises).values(rows);
  });

  return id;
}

export async function deletePlan(uid: number, id: number): Promise<void> {
  await db.transaction(async (tx) => {
    const plan = (
      await tx
        .select({ id: plans.id })
        .from(plans)
        .where(and(eq(plans.id, id), eq(plans.userId, uid)))
    ).at(0);
    if (!plan) throw new HTTPException(404, { message: 'plan not found' });

    // Unassign the plan from any weekday it was scheduled on.
    const clearDay = (day: SQLWrapper) => sql`case when ${day} = ${id} then null else ${day} end`;
    await tx
      .update(weekPlan)
      .set({
        sun: clearDay(weekPlan.sun), mon: clearDay(weekPlan.mon), tue: clearDay(weekPlan.tue),
        wed: clearDay(weekPlan.wed), thu: clearDay(weekPlan.thu), fri: clearDay(weekPlan.fri),
        sat: clearDay(weekPlan.sat),
      })
      .where(eq(weekPlan.userId, uid));

    await tx.delete(plans).where(and(eq(plans.id, id), eq(plans.userId, uid)));
  });
}
