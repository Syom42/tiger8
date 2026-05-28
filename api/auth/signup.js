const { sql } = require('../_lib/db');
const { bcrypt, signSession, setSessionCookie, readJsonBody } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  let body;
  try { body = await readJsonBody(req); } catch { return res.status(400).json({ error: 'invalid json' }); }
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'invalid email' });
  if (password.length < 6) return res.status(400).json({ error: 'password too short' });

  const hash = await bcrypt.hash(password, 10);
  let userId;
  try {
    const { rows } = await sql`
      insert into users (email, password_hash)
      values (${email}, ${hash})
      returning id
    `;
    userId = rows[0].id;
  } catch (e) {
    if (e && e.code === '23505') return res.status(409).json({ error: 'email already registered' });
    console.error('signup error', e);
    return res.status(500).json({ error: 'server error' });
  }
  await sql`insert into user_data (user_id, data) values (${userId}, '{}'::jsonb) on conflict do nothing`;
  const token = await signSession(userId, email);
  setSessionCookie(res, token);
  return res.status(200).json({ ok: true });
};
