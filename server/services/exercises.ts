import { randomUUID } from 'node:crypto';
import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/client.js';
import { exercises } from '../db/schema.js';
import type { ExerciseInput } from '../validators/exercises.js';

export interface ExerciseDto {
  id: string;
  user_id: number | null;
  name: string;
  muscle: string;
  description: string | null;
  is_custom: boolean;
}

/** Shared seed rows (`user_id is null`) plus the user's own custom exercises. */
export async function listExercises(uid: number): Promise<ExerciseDto[]> {
  return await db
    .select({
      id: exercises.id,
      user_id: exercises.userId,
      name: exercises.name,
      muscle: exercises.muscle,
      description: exercises.description,
      is_custom: exercises.isCustom,
    })
    .from(exercises)
    .where(or(eq(exercises.userId, uid), isNull(exercises.userId)))
    .orderBy(asc(exercises.isCustom), asc(exercises.name));
}

export async function saveExercise(uid: number, input: ExerciseInput): Promise<string> {
  const id = input.id ?? `custom_${randomUUID()}`;
  const description = input.description ?? null;

  const existing = (
    await db.select({ userId: exercises.userId }).from(exercises).where(eq(exercises.id, id))
  ).at(0);
  if (existing && existing.userId !== uid) {
    throw new HTTPException(404, { message: 'exercise not found' });
  }

  if (existing) {
    await db
      .update(exercises)
      .set({ name: input.name, muscle: input.muscle, description })
      .where(and(eq(exercises.id, id), eq(exercises.userId, uid)));
  } else {
    await db.insert(exercises).values({
      id,
      userId: uid,
      name: input.name,
      muscle: input.muscle,
      description,
      isCustom: true,
    });
  }
  return id;
}

export async function deleteExercise(uid: number, id: string): Promise<void> {
  await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.userId, uid)));
}
