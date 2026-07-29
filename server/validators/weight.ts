import { z } from 'zod';
import { finiteNumber, numericId, optStr } from './common.js';

export const WeightCreateSchema = z.object({
  weight: finiteNumber.min(20).max(500),
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid date'),
  note:   optStr,
});

export const WeightDeleteSchema = z.object({ id: numericId });

export type WeightCreateInput = z.infer<typeof WeightCreateSchema>;
export type WeightDeleteInput = z.infer<typeof WeightDeleteSchema>;
