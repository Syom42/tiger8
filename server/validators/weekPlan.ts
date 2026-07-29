import { z } from 'zod';
import { positiveInteger } from './common.js';

const PlanIdSchema = positiveInteger.nullable().optional();

export const WeekPlanSchema = z.object({
  sun: PlanIdSchema,
  mon: PlanIdSchema,
  tue: PlanIdSchema,
  wed: PlanIdSchema,
  thu: PlanIdSchema,
  fri: PlanIdSchema,
  sat: PlanIdSchema,
});

export type WeekPlanInput = z.infer<typeof WeekPlanSchema>;
