import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { isUniqueViolation } from '../db/errors.js';
import { userProfiles, users } from '../db/schema.js';
import type { LoginInput, SignupInput } from '../validators/auth.js';

const BCRYPT_ROUNDS = 10;

export interface AuthenticatedUser {
  userId: number;
  email: string;
}

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export async function authenticate(input: LoginInput): Promise<AuthenticatedUser> {
  const email = input.email.toLowerCase();
  const row = (
    await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
  ).at(0);

  if (!row) throw new HTTPException(401, { message: 'invalid credentials' });
  if (!row.passwordHash) throw new HTTPException(401, { message: 'use google login' });

  const ok = await bcrypt.compare(input.password, row.passwordHash);
  if (!ok) throw new HTTPException(401, { message: 'invalid credentials' });

  return { userId: row.id, email };
}

export async function register(input: SignupInput): Promise<AuthenticatedUser> {
  const email = input.email.toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  let userId: number;
  try {
    const [row] = await db
      .insert(users)
      .values({ email, passwordHash })
      .returning({ id: users.id });
    userId = row.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HTTPException(409, { message: 'email already registered' });
    }
    throw error;
  }

  await db.insert(userProfiles).values({ userId }).onConflictDoNothing();
  return { userId, email };
}

// ---- Google OAuth ----------------------------------------------------------

export function googleConfig(): GoogleConfig {
  const current = env();
  if (!current.GOOGLE_CLIENT_ID || !current.GOOGLE_CLIENT_SECRET) {
    throw new HTTPException(503, { message: 'google oauth not configured' });
  }
  return {
    clientId: current.GOOGLE_CLIENT_ID,
    clientSecret: current.GOOGLE_CLIENT_SECRET,
    redirectUri: `${current.APP_URL.replace(/\/$/, '')}/api/auth/google-callback`,
  };
}

export function googleAuthUrl(config: GoogleConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Exchanges an authorization code for an access token, or `null` on failure. */
export async function exchangeGoogleCode(config: GoogleConfig, code: string): Promise<string | null> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = (await response.json().catch(() => null)) as { access_token?: unknown } | null;
  if (!response.ok || typeof tokens?.access_token !== 'string') return null;
  return tokens.access_token;
}

/** Returns the verified Google email, or `null` if unusable. */
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const profile = (await response.json().catch(() => null)) as
    | { email?: unknown; verified_email?: unknown }
    | null;
  if (!response.ok || typeof profile?.email !== 'string' || profile.verified_email !== true) {
    return null;
  }
  return profile.email.toLowerCase();
}

/** Atomic upsert — works even if password_hash were NOT NULL. */
export async function upsertGoogleUser(email: string): Promise<AuthenticatedUser> {
  const [row] = await db
    .insert(users)
    .values({ email, passwordHash: null })
    .onConflictDoUpdate({ target: users.email, set: { email } })
    .returning({ id: users.id });

  await db.insert(userProfiles).values({ userId: row.id }).onConflictDoNothing();
  return { userId: row.id, email };
}
