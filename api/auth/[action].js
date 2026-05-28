const { bcrypt, signSession, setSessionCookie, clearSessionCookie, requireSession, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

module.exports = async function handler(req, res) {
  const action = req.query.action;
  try {

  if (action === 'login') {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
    const { email, password } = await readJsonBody(req);
    if (!email || !password) return res.status(400).json({ error: 'missing credentials' });

    const rows = await sql`select id, password_hash from users where email = ${email.toLowerCase()}`;
    if (!rows.length) return res.status(401).json({ error: 'invalid credentials' });

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

    const existing = await sql`select id from users where email = ${email.toLowerCase()}`;
    if (existing.length) return res.status(409).json({ error: 'email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [user] = await sql`
      insert into users (email, password_hash) values (${email.toLowerCase()}, ${hash}) returning id`;

    await sql`insert into user_profiles (user_id) values (${user.id}) on conflict do nothing`;

    const token = await signSession(user.id, email.toLowerCase());
    setSessionCookie(res, token);
    return res.status(200).json({ ok: true });
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
