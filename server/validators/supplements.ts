import { z } from 'zod';
import { nonEmpty, optStr } from './common.js';

export const SupplementUpsertSchema = z.object({
  id:      nonEmpty.optional(),
  name:    nonEmpty,
  dose:    optStr,
  time:    optStr,
  enabled: z.boolean().optional(),
});

export const SupplementTakenSchema = z.object({
  id:    nonEmpty,
  date:  nonEmpty,
  taken: z.boolean(),
});

export const SupplementDeleteSchema = z.object({ id: nonEmpty });

export type SupplementUpsertInput = z.infer<typeof SupplementUpsertSchema>;
export type SupplementTakenInput = z.infer<typeof SupplementTakenSchema>;
export type SupplementDeleteInput = z.infer<typeof SupplementDeleteSchema>;
