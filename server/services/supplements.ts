import { randomUUID } from 'node:crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db, toRows } from '../db/client.js';
import { supplementTaken, supplements } from '../db/schema.js';
import type { SupplementTakenInput, SupplementUpsertInput } from '../validators/supplements.js';

const TAKEN_RETENTION_DAYS = 30;

export interface SupplementDto {
  id: string;
  name: string;
  dose: string | null;
  time: string | null;
  enabled: boolean;
  taken_dates: string[];
}

function retentionCutoff(): string {
  const date = new Date();
  date.setDate(date.getDate() - TAKEN_RETENTION_DAYS);
  return date.toISOString().slice(0, 10);
}

/** Raw SQL because Drizzle has no aggregate-into-array helper for this shape. */
export async function listSupplements(uid: number): Promise<SupplementDto[]> {
  const result = await db.execute(sql`
    select s.id, s.name, s.dose, s.time, s.enabled,
           coalesce(json_agg(st.taken_date) filter (where st.taken_date is not null), '[]') as taken_dates
    from supplements s
    left join supplement_taken st on st.supplement_id = s.id
    where s.user_id = ${uid}
    group by s.id
    order by s.name`);
  return toRows<SupplementDto>(result);
}

export async function upsertSupplement(uid: number, input: SupplementUpsertInput): Promise<string> {
  const id = input.id ?? `supp_${randomUUID()}`;
  const values = {
    name: input.name,
    dose: input.dose ?? null,
    time: input.time ?? null,
    enabled: input.enabled ?? true,
  };

  const existing = (
    await db.select({ userId: supplements.userId }).from(supplements).where(eq(supplements.id, id))
  ).at(0);
  if (existing && existing.userId !== uid) {
    throw new HTTPException(404, { message: 'supplement not found' });
  }

  if (existing) {
    await db
      .update(supplements)
      .set(values)
      .where(and(eq(supplements.id, id), eq(supplements.userId, uid)));
  } else {
    await db.insert(supplements).values({ id, userId: uid, ...values });
  }
  return id;
}

export async function setSupplementTaken(uid: number, input: SupplementTakenInput): Promise<void> {
  const { id, date, taken } = input;

  const owned = (
    await db
      .select({ id: supplements.id })
      .from(supplements)
      .where(and(eq(supplements.id, id), eq(supplements.userId, uid)))
  ).at(0);
  if (!owned) throw new HTTPException(404, { message: 'supplement not found' });

  if (taken) {
    await db
      .insert(supplementTaken)
      .values({ supplementId: id, takenDate: date })
      .onConflictDoNothing();
  } else {
    await db
      .delete(supplementTaken)
      .where(and(eq(supplementTaken.supplementId, id), eq(supplementTaken.takenDate, date)));
  }

  await db
    .delete(supplementTaken)
    .where(and(
      eq(supplementTaken.supplementId, id),
      lt(supplementTaken.takenDate, retentionCutoff()),
    ));
}

export async function deleteSupplement(uid: number, id: string): Promise<void> {
  await db.delete(supplements).where(and(eq(supplements.id, id), eq(supplements.userId, uid)));
}
