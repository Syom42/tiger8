import { z } from 'zod';
import { nonEmpty, optStr } from './common.js';

export const ExerciseSchema = z.object({
  id:          nonEmpty.optional(),
  name:        nonEmpty,
  muscle:      nonEmpty,
  description: optStr,
});

export const ExerciseDeleteSchema = z.object({ id: nonEmpty });

export type ExerciseInput = z.infer<typeof ExerciseSchema>;
export type ExerciseDeleteInput = z.infer<typeof ExerciseDeleteSchema>;
