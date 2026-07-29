import { z } from 'zod';

export const CoachSchema = z.object({
  messages: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(2000),
  })).min(1).max(12),
  temperature: z.number().min(0).max(1).optional(),
  max_tokens:  z.number().int().min(1).max(512).optional(),
}).strict();

export type CoachInput = z.infer<typeof CoachSchema>;
