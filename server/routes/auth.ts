// Auth routes: email/password, Google OAuth, logout, me.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { isProd } from '../config/env.js';
import { clearSessionCookie, setSessionCookie, signSession } from '../lib/session.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  authenticate, exchangeGoogleCode, fetchGoogleEmail, googleAuthUrl, googleConfig,
  register, upsertGoogleUser,
} from '../services/auth.js';
import type { AppEnv } from '../types.js';
import { LoginSchema, SignupSchema } from '../validators/auth.js';

const app = new Hono<AppEnv>();

const OAUTH_STATE_COOKIE = 'tiger8_oauth_state';
const OAUTH_STATE_MAX_AGE = 60 * 5;
const LOGIN_REDIRECT = '/login.html';

app.use('/auth/*', rateLimit({ key: 'auth', max: 20, windowMs: 60_000 }));
app.use('/auth/login', rateLimit({ key: 'login', max: 5, windowMs: 60_000 }));
app.use('/auth/signup', rateLimit({ key: 'signup', max: 5, windowMs: 60_000 }));

function setOAuthState(c: Context<AppEnv>, state: string): void {
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProd(),
    maxAge: OAUTH_STATE_MAX_AGE,
  });
}

function stateMatches(expected: string | undefined, actual: string | undefined): boolean {
  if (!expected || !actual) return false;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

app.post('/auth/login', zValidator('json', LoginSchema), async (c) => {
  const { userId, email } = await authenticate(c.req.valid('json'));
  setSessionCookie(c, await signSession(userId, email));
  return c.json({ ok: true });
});

app.post('/auth/signup', zValidator('json', SignupSchema), async (c) => {
  const { userId, email } = await register(c.req.valid('json'));
  setSessionCookie(c, await signSession(userId, email));
  return c.json({ ok: true });
});

app.get('/auth/google', (c) => {
  const config = googleConfig();
  const state = randomBytes(32).toString('base64url');
  setOAuthState(c, state);
  return c.redirect(googleAuthUrl(config, state), 302);
});

app.get('/auth/google-callback', async (c) => {
  const code = c.req.query('code');
  const expectedState = getCookie(c, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/' });
  if (!code || !stateMatches(expectedState, c.req.query('state'))) {
    return c.redirect(LOGIN_REDIRECT, 302);
  }

  const config = googleConfig();
  const accessToken = await exchangeGoogleCode(config, code);
  if (!accessToken) return c.redirect(LOGIN_REDIRECT, 302);

  const googleEmail = await fetchGoogleEmail(accessToken);
  if (!googleEmail) return c.redirect(LOGIN_REDIRECT, 302);

  const { userId, email } = await upsertGoogleUser(googleEmail);
  setSessionCookie(c, await signSession(userId, email));
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
