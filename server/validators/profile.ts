import { z } from 'zod';
import { finiteNumber, optStr } from './common.js';

export const ProfileSchema = z.object({
  name:   z.string().trim().min(1).max(120).nullable().optional(),
  age:    z.coerce.number().int().min(13).max(120).nullable().optional(),
  height: finiteNumber.min(50).max(300).nullable().optional(),
  goal:   optStr,
});

export type ProfileInput = z.infer<typeof ProfileSchema>;
