// Primitives shared by every request schema.
import { z } from 'zod';

export const nonEmpty = z.string().trim().min(1).max(160);
export const optStr = z.string().trim().max(1000).optional().nullable();
export const positiveInteger = z.coerce.number().int().positive();
export const finiteNumber = z.coerce.number().finite();

/** Accepts `12` or `"12"`, always yields a number. */
export const numericId = z.number().int().or(z.string().regex(/^\d+$/).transform(Number));
