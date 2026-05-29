// Validates environment variables. Logs warnings for missing values but does NOT
// crash the function — individual routes fail with clear messages instead.
import { z } from 'zod';

const schema = z.object({
  // Database (provided automatically by Vercel/Neon integration)
  POSTGRES_URL: z.string().min(1).optional().default(''),

  // Session signing
  JWT_SECRET: z.string().min(1).optional().default(''),

  // Stable public base URL — used to build the Google OAuth redirect_uri.
  APP_URL: z.string().optional().default('http://localhost:3000'),

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
    // Log but don't crash — let individual routes handle missing vars
    console.error('[env] validation warnings:', parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '));
    cached = schema.parse({}); // use defaults
  } else {
    cached = parsed.data;
  }
  // Warn about critical missing vars
  if (!cached.POSTGRES_URL) console.warn('[env] POSTGRES_URL is not set — DB calls will fail');
  if (!cached.JWT_SECRET) console.warn('[env] JWT_SECRET is not set — auth will fail');
  return cached;
}

export function isProd() {
  const e = env();
  return e.VERCEL_ENV === 'production' || e.NODE_ENV === 'production';
}
