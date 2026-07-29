import { z } from 'zod';
import { nonEmpty, numericId, optStr } from './common.js';

export const WorkoutSetSchema = z.object({
  weight:   optStr,
  reps:     optStr,
  done:     z.boolean().optional(),
  rpe:      z.number().int().min(1).max(10).nullable().optional(),
  rir:      z.number().int().min(0).max(10).nullable().optional(),
  isWarmup: z.boolean().optional(),
});

export const WorkoutExerciseSchema = z.object({
  name:          nonEmpty,
  restSeconds:   z.number().int().optional(),
  supersetGroup: z.string().trim().max(80).nullable().optional(),
  sets:          z.array(WorkoutSetSchema).optional(),
});

export const WorkoutSchema = z.object({
  id:        numericId.optional(),
  name:      nonEmpty,
  muscles:   z.array(z.string()).optional(),
  date:      nonEmpty, // ISO string
  duration:  z.number().int().nullable().optional(),
  exercises: z.array(WorkoutExerciseSchema).optional(),
});

export const WorkoutDeleteSchema = z.object({ id: numericId });

export type WorkoutSetInput = z.infer<typeof WorkoutSetSchema>;
export type WorkoutExerciseInput = z.infer<typeof WorkoutExerciseSchema>;
export type WorkoutInput = z.infer<typeof WorkoutSchema>;
export type WorkoutDeleteInput = z.infer<typeof WorkoutDeleteSchema>;
