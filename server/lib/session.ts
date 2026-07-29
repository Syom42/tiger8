// Session cookie + JWT helpers. Routes never touch the cookie directly —
// they go through `requireAuth` or these functions.
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { env, isProd } from '../config/env.js';

const COOKIE_NAME = 'tiger8_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload extends JWTPayload {
  /** Old JWTs (pre-v2 backend) stored this as a string. */
  uid: number | string;
  email: string;
}

function secret(): Uint8Array {
  return new TextEncoder().encode(env().JWT_SECRET);
}

function isSessionPayload(payload: JWTPayload): payload is SessionPayload {
  return (
    (typeof payload.uid === 'number' || typeof payload.uid === 'string') &&
    typeof payload.email === 'string'
  );
}

export async function signSession(userId: number, email: string): Promise<string> {
  return await new SignJWT({ uid: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(secret());
}

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProd(),
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProd(),
  });
}

export async function readSession(c: Context): Promise<SessionPayload | null> {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return isSessionPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}
