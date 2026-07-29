import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { weightLog } from '../db/schema.js';
import type { WeightCreateInput } from '../validators/weight.js';

export interface WeightEntryDto {
  id: number;
  /** numeric column — the driver returns it as a string. */
  weight: string;
  date: string;
  note: string | null;
}

export async function listWeight(uid: number): Promise<WeightEntryDto[]> {
  return await db
    .select({
      id: weightLog.id,
      weight: weightLog.weight,
      date: weightLog.date,
      note: weightLog.note,
    })
    .from(weightLog)
    .where(eq(weightLog.userId, uid))
    .orderBy(asc(weightLog.date));
}

export async function addWeight(uid: number, input: WeightCreateInput): Promise<number> {
  const [row] = await db
    .insert(weightLog)
    .values({
      userId: uid,
      weight: String(input.weight),
      date: input.date,
      note: input.note ?? null,
    })
    .returning({ id: weightLog.id });
  return row.id;
}

export async function deleteWeight(uid: number, id: number): Promise<void> {
  await db.delete(weightLog).where(and(eq(weightLog.id, id), eq(weightLog.userId, uid)));
}
