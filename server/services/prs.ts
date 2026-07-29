import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { personalRecords } from '../db/schema.js';
import type { PrsInput } from '../validators/prs.js';

export interface PersonalRecordDto {
  /** numeric column — the driver returns it as a string. */
  weight: string | null;
  reps: number | null;
  date: Date | null;
}

/** Keyed by exercise name: `{ "Bench Press": { weight, reps, date } }`. */
export type PersonalRecordMap = Record<string, PersonalRecordDto>;

export async function getPersonalRecords(uid: number): Promise<PersonalRecordMap> {
  const rows = await db
    .select({
      exerciseName: personalRecords.exerciseName,
      weight: personalRecords.weight,
      reps: personalRecords.reps,
      achievedAt: personalRecords.achievedAt,
    })
    .from(personalRecords)
    .where(eq(personalRecords.userId, uid));

  const byExercise: PersonalRecordMap = {};
  for (const row of rows) {
    byExercise[row.exerciseName] = { weight: row.weight, reps: row.reps, date: row.achievedAt };
  }
  return byExercise;
}

/** One transaction for all upserts (atomic + faster). Entries without a
 *  positive weight are skipped, matching the previous behaviour. */
export async function savePersonalRecords(uid: number, input: PrsInput): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [exerciseName, record] of Object.entries(input)) {
      const weight = record.weight === null || record.weight === undefined
        ? null
        : String(record.weight);
      if (weight === null || !Number.isFinite(Number(weight)) || Number(weight) <= 0) continue;

      const values = {
        weight,
        reps: record.reps ?? null,
        achievedAt: record.date ? new Date(record.date) : null,
      };
      await tx
        .insert(personalRecords)
        .values({ userId: uid, exerciseName, ...values })
        .onConflictDoUpdate({
          target: [personalRecords.userId, personalRecords.exerciseName],
          set: values,
        });
    }
  });
}
