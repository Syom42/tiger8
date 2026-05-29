// Validates required environment variables at boot. Fails fast with a clear
// message instead of letting routes mysteriously 500 later.
import { z } from 'zod';

const schema = z.object({
  // Database (provided automatically by Vercel/Neon integration)
  POSTGRES_URL: z.string().url(),

  // Session signing
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),

  // Stable public base URL — used to build the Google OAuth redirect_uri.
  // MUST be the canonical production domain, NOT VERCEL_URL (which changes per deploy).
  APP_URL: z.string().url().optional().default('http://localhost:3000'),

  // Google OAuth (optional — /api/auth/google* will 503 if missing)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Groq (optional — /api/coach will 503 if missing)
  GROQ_API_KEY: z.string().optional(),

  // Neon auth display (optional — /api/config exposes these)
  NEON_AUTH_BASE_URL: z.string().optional().default(''),
  STACK_PUBLISHABLE_CLIENT_KEY: z.string().optional().default(''),

  VERCEL_ENV: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

let cached;
export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`[env] invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function isProd() {
  const e = env();
  return e.VERCEL_ENV === 'production' || e.NODE_ENV === 'production';
}
