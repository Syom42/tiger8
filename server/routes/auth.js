// Auth routes: email/password, Google OAuth, logout, me.
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, userProfiles } from '../db/schema.js';
import { env } from '../env.js';
import {
  bcrypt, signSession, setSessionCookie, clearSessionCookie,
  requireAuth, getSession,
} from '../middleware/auth.js';
import { LoginSchema, SignupSchema } from '../validators/schemas.js';
import { rateLimit } from '../middleware/rateLimit.js';

const app = new Hono();
const OAUTH_STATE_COOKIE = 'tiger8_oauth_state';
const OAUTH_STATE_MAX_AGE = 60 * 5;

app.use('/auth/*', rateLimit({ key: 'auth', max: 20, windowMs: 60_000 }));
app.use('/auth/login', rateLimit({ key: 'login', max: 5, windowMs: 60_000 }));
app.use('/auth/signup', rateLimit({ key: 'signup', max: 5, windowMs: 60_000 }));

function setOAuthState(c, state) {
  const environment = env();
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: environment.VERCEL_ENV === 'production' || environment.NODE_ENV === 'production',
    maxAge: OAUTH_STATE_MAX_AGE,
  });
}

function stateMatches(expected, actual) {
  if (!expected || !actual) return false;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function googleConfig() {
  const e = env();
  if (!e.GOOGLE_CLIENT_ID || !e.GOOGLE_CLIENT_SECRET) {
    throw new HTTPException(503, { message: 'google oauth not configured' });
  }
  return {
    clientId:     e.GOOGLE_CLIENT_ID,
    clientSecret: e.GOOGLE_CLIENT_SECRET,
    redirectUri:  e.APP_URL.replace(/\/$/, '') + '/api/auth/google-callback',
  };
}

app.post('/auth/login', zValidator('json', LoginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const lower = email.toLowerCase();
  const [row] = await db.select({ id: users.id, passwordHash: users.passwordHash })
    .from(users).where(eq(users.email, lower));
  if (!row) throw new HTTPException(401, { message: 'invalid credentials' });
  if (!row.passwordHash) throw new HTTPException(401, { message: 'use google login' });
  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) throw new HTTPException(401, { message: 'invalid credentials' });

  const token = await signSession(row.id, lower);
  setSessionCookie(c, token);
  return c.json({ ok: true });
});

app.post('/auth/signup', zValidator('json', SignupSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const lower = email.toLowerCase();
  const hash = await bcrypt.hash(password, 10);

  let userId;
  try {
    const [row] = await db.insert(users)
      .values({ email: lower, passwordHash: hash })
      .returning({ id: users.id });
    userId = row.id;
  } catch (e) {
    if (e?.code === '23505') throw new HTTPException(409, { message: 'email already registered' });
    throw e;
  }

  await db.insert(userProfiles).values({ userId }).onConflictDoNothing();

  const token = await signSession(userId, lower);
  setSessionCookie(c, token);
  return c.json({ ok: true });
});

app.get('/auth/google', (c) => {
  const { clientId, redirectUri } = googleConfig();
  const state = randomBytes(32).toString('base64url');
  setOAuthState(c, state);
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
    state,
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
});

app.get('/auth/google-callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const expectedState = getCookie(c, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/' });
  if (!code || !stateMatches(expectedState, state)) return c.redirect('/login.html', 302);

  const { clientId, clientSecret, redirectUri } = googleConfig();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || typeof tokens?.access_token !== 'string') return c.redirect('/login.html', 302);

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await userRes.json().catch(() => null);
  if (!userRes.ok || typeof profile?.email !== 'string' || profile.verified_email !== true) {
    return c.redirect('/login.html', 302);
  }

  const email = profile.email.toLowerCase();

  // Atomic upsert — works even if password_hash were NOT NULL.
  const [row] = await db.insert(users)
    .values({ email, passwordHash: null })
    .onConflictDoUpdate({ target: users.email, set: { email } })
    .returning({ id: users.id });

  await db.insert(userProfiles).values({ userId: row.id }).onConflictDoNothing();

  const token = await signSession(row.id, email);
  setSessionCookie(c, token);
  return c.redirect('/', 302);
});

app.post('/auth/logout', (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});

app.get('/auth/me', requireAuth, (c) => {
  return c.json({ email: c.get('email') });
});

export default app;
