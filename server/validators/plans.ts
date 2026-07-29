import { z } from 'zod';
import { nonEmpty, numericId, optStr } from './common.js';

/** The client sends either a bare exercise name or an object using either
 *  camelCase or snake_case keys — both spellings are accepted. */
export const PlanExerciseSchema = z.union([
  nonEmpty,
  z.object({
    name:           z.string().optional(),
    exercise_name:  z.string().optional(),
    restSeconds:    z.number().int().optional(),
    rest_seconds:   z.number().int().optional(),
    targetSets:     z.number().int().min(1).max(20).optional(),
    target_sets:    z.number().int().min(1).max(20).optional(),
    targetReps:     z.number().int().min(1).max(100).optional(),
    target_reps:    z.number().int().min(1).max(100).optional(),
    supersetGroup:  z.string().trim().max(80).nullable().optional(),
    superset_group: z.string().trim().max(80).nullable().optional(),
  }),
]);

export const PlanSchema = z.object({
  id:          numericId.optional(),
  name:        nonEmpty,
  description: optStr,
  exercises:   z.array(PlanExerciseSchema).optional(),
});

export const PlanDeleteSchema = z.object({ id: numericId });

export type PlanExerciseInput = z.infer<typeof PlanExerciseSchema>;
export type PlanInput = z.infer<typeof PlanSchema>;
export type PlanDeleteInput = z.infer<typeof PlanDeleteSchema>;
