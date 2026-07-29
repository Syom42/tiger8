// Validates environment variables. Logs warnings for missing values but does NOT
// crash the function — individual routes fail with clear messages instead.
import { z } from 'zod';

const envSchema = z.object({
  // Database (provided automatically by Vercel/Neon integration).
  // Deliberately not `.min(1)` — an empty value must fall through to the
  // warning below rather than throwing and 400-ing every request.
  POSTGRES_URL: z.string().optional().default(''),

  // Session signing
  JWT_SECRET: z.string().optional().default(''),

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

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) {
    cached = parsed.data;
  } else {
    // Log but don't crash — let individual routes handle missing vars.
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    console.error('[env] validation warnings:', details);
    cached = envSchema.parse({}); // use defaults
  }

  if (!cached.POSTGRES_URL) console.warn('[env] POSTGRES_URL is not set — DB calls will fail');
  if (!cached.JWT_SECRET) console.warn('[env] JWT_SECRET is not set — auth will fail');
  return cached;
}

export function isProd(): boolean {
  const current = env();
  return current.VERCEL_ENV === 'production' || current.NODE_ENV === 'production';
}
