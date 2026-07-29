import { z } from 'zod';

// PRs are a map: { "Bench Press": { weight, reps, date } }
export const PrsSchema = z.record(z.string(), z.object({
  weight: z.union([z.number(), z.string()]).nullable().optional(),
  reps:   z.number().int().nullable().optional(),
  date:   z.string().nullable().optional(),
}));

export type PrsInput = z.infer<typeof PrsSchema>;
