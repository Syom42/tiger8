const { bcrypt, signSession, setSessionCookie, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  const { email, password } = await readJsonBody(req);
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'invalid email' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'password too short' });

  const existing = await sql`select id from users where email = ${email.toLowerCase()}`;
  if (existing.length) return res.status(409).json({ error: 'email already registered' });

  const hash = await bcrypt.hash(password, 10);
  const [user] = await sql`
    insert into users (email, password_hash) values (${email.toLowerCase()}, ${hash}) returning id`;

  // Create empty profile row
  await sql`insert into user_profiles (user_id) values (${user.id}) on conflict do nothing`;

  const token = await signSession(user.id, email.toLowerCase());
  setSessionCookie(res, token);
  return res.status(200).json({ ok: true });
};
