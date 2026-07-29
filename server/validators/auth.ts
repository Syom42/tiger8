import { z } from 'zod';
import { nonEmpty } from './common.js';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: nonEmpty,
});

// Strong password: 8+ chars, lower, upper, digit, special.
const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]).{8,}$/;

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().regex(strongPw, 'password too weak'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
