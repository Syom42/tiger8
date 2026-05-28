const { sql } = require('../_lib/db');
const { requireSession, readJsonBody } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;
  const userId = session.uid;

  if (req.method === 'GET') {
    const { rows } = await sql`select data from user_data where user_id = ${userId}`;
    if (rows.length === 0) {
      await sql`insert into user_data (user_id, data) values (${userId}, '{}'::jsonb) on conflict do nothing`;
      return res.status(200).json({ data: {} });
    }
    return res.status(200).json({ data: rows[0].data || {} });
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await readJsonBody(req); } catch { return res.status(400).json({ error: 'invalid json' }); }
    const data = body && body.data;
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'missing data object' });
    const json = JSON.stringify(data);
    const { rows } = await sql`
      insert into user_data (user_id, data, updated_at)
      values (${userId}, ${json}::jsonb, now())
      on conflict (user_id) do update set data = excluded.data, updated_at = now()
      returning updated_at
    `;
    return res.status(200).json({ ok: true, updated_at: rows[0].updated_at });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'method not allowed' });
};
