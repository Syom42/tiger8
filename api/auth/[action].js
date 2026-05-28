const { bcrypt, signSession, setSessionCookie, clearSessionCookie, requireSession, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

function getGoogleConfig() {
  // APP_URL must be set in Vercel env vars to the stable production domain,
  // e.g. https://tiger8.vercel.app — never use VERCEL_URL (changes per deployment).
  const base = process.env.APP_URL || 'http://localhost:3000';
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: base + '/api/auth/google-callback',
  };
}

module.exports = async function handler(req, res) {
  const action = req.query.action;
  try {

  if (action === 'login') {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
    const { email, password } = await readJsonBody(req);
    if (!email || !password) return res.status(400).json({ error: 'missing credentials' });

    const rows = await sql`select id, password_hash from users where email = ${email.toLowerCase()}`;
    if (!rows.length) return res.status(401).json({ error: 'invalid credentials' });

    if (!rows[0].password_hash) return res.status(401).json({ error: 'use google login' });

    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'invalid credentials' });

    const token = await signSession(rows[0].id, email.toLowerCase());
    setSessionCookie(res, token);
    return res.status(200).json({ ok: true });
  }

  if (action === 'signup') {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
    const { email, password } = await readJsonBody(req);
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'invalid email' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'password too short' });

    const hash = await bcrypt.hash(password, 10);
    let user;
    try {
      const [row] = await sql`
        insert into users (email, password_hash) values (${email.toLowerCase()}, ${hash}) returning id`;
      user = row;
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'email already registered' });
      throw e;
    }

    await sql`insert into user_profiles (user_id) values (${user.id}) on conflict do nothing`;

    const token = await signSession(user.id, email.toLowerCase());
    setSessionCookie(res, token);
    return res.status(200).json({ ok: true });
  }

  if (action === 'google') {
    const { clientId, redirectUri } = getGoogleConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });
    return res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  if (action === 'google-callback') {
    const code = req.query.code;
    if (!code) return res.redirect(302, '/login.html');

    const { clientId, clientSecret, redirectUri } = getGoogleConfig();

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) return res.redirect(302, '/login.html');

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await userRes.json();
    if (!profile.email) return res.redirect(302, '/login.html');

    const email = profile.email.toLowerCase();

    // Find or create user
    let rows = await sql`select id from users where email = ${email}`;
    let userId;
    if (rows.length) {
      userId = rows[0].id;
    } else {
      const [newUser] = await sql`
        insert into users (email, password_hash) values (${email}, ${null}) returning id`;
      userId = newUser.id;
      await sql`insert into user_profiles (user_id) values (${userId}) on conflict do nothing`;
    }

    const token = await signSession(userId, email);
    setSessionCookie(res, token);
    return res.redirect(302, '/');
  }

  if (action === 'logout') {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  }

  if (action === 'me') {
    const session = await requireSession(req, res);
    if (!session) return;
    return res.status(200).json({ email: session.email });
  }

  return res.status(404).json({ error: 'not found' });
  } catch (err) {
    console.error('[auth]', action, err);
    return res.status(500).json({ error: 'server error' });
  }
};
