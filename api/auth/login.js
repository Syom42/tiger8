const { bcrypt, signSession, setSessionCookie, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

module.exports = async function handler(req, res) {
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
};
