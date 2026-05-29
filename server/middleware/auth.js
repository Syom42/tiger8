// Session cookie helpers + Hono middleware. All auth lives in this file —
// routes only call `requireAuth` or read `c.get('uid')`.
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { env, isProd } from '../env.js';

const COOKIE_NAME = 'tiger8_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  return new TextEncoder().encode(env().JWT_SECRET);
}

export async function signSession(userId, email) {
  return await new SignJWT({ uid: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(secret());
}

async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch { return null; }
}

export function setSessionCookie(c, token) {
  setCookie(c, COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProd(),
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearSessionCookie(c) {
  deleteCookie(c, COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProd(),
  });
}

export async function getSession(c) {
  const token = getCookie(c, COOKIE_NAME);
  return await verifySession(token);
}

/** Hono middleware. Use as `app.get('/api/x', requireAuth, handler)`.
 *  After it runs, `c.get('uid')` and `c.get('email')` are set. */
export async function requireAuth(c, next) {
  const session = await getSession(c);
  if (!session) throw new HTTPException(401, { message: 'unauthorized' });
  // Coerce to number — old JWTs (signed by the pre-v2 backend) stored uid as a
  // string because @vercel/postgres returns bigint columns as strings.
  c.set('uid', Number(session.uid));
  c.set('email', session.email);
  await next();
}

export { bcrypt };
