import { and, eq, inArray } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/client.js';
import { plans, weekPlan } from '../db/schema.js';
import type { WeekPlanInput } from '../validators/weekPlan.js';

export interface WeekPlanDto {
  sun: number | null;
  mon: number | null;
  tue: number | null;
  wed: number | null;
  thu: number | null;
  fri: number | null;
  sat: number | null;
}

export const EMPTY_WEEK_PLAN: WeekPlanDto = {
  sun: null, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null,
};

export async function getWeekPlan(uid: number): Promise<WeekPlanDto> {
  const rows = await db
    .select({
      sun: weekPlan.sun, mon: weekPlan.mon, tue: weekPlan.tue,
      wed: weekPlan.wed, thu: weekPlan.thu, fri: weekPlan.fri, sat: weekPlan.sat,
    })
    .from(weekPlan)
    .where(eq(weekPlan.userId, uid));

  return rows.at(0) ?? EMPTY_WEEK_PLAN;
}

/** Rejects (400) if any assigned plan id is missing or belongs to someone else. */
export async function saveWeekPlan(uid: number, input: WeekPlanInput): Promise<void> {
  const planIds = Object.values(input).filter((id): id is number => id !== null && id !== undefined);

  if (planIds.length) {
    const owned = await db
      .select({ id: plans.id })
      .from(plans)
      .where(and(eq(plans.userId, uid), inArray(plans.id, planIds)));
    if (owned.length !== new Set(planIds).size) {
      throw new HTTPException(400, { message: 'One or more assigned plans do not exist' });
    }
  }

  const values = {
    userId: uid,
    sun: input.sun ?? null, mon: input.mon ?? null, tue: input.tue ?? null,
    wed: input.wed ?? null, thu: input.thu ?? null, fri: input.fri ?? null, sat: input.sat ?? null,
  };
  await db.insert(weekPlan).values(values).onConflictDoUpdate({ target: weekPlan.userId, set: values });
}
