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
  if (!email || !password) return res.status(400).json({ error: 'missing credentials' });

  const { rows } = await sql`select id, password_hash from users where email = ${email}`;
  if (rows.length === 0) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const token = await signSession(rows[0].id, email);
  setSessionCookie(res, token);
  return res.status(200).json({ ok: true });
};
