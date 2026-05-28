const { requireSession, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

module.exports = async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const rows = await sql`
      select id, weight, date, note
      from weight_log where user_id = ${session.uid}
      order by date asc`;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { weight, date, note } = await readJsonBody(req);
    if (!weight || !date) return res.status(400).json({ error: 'weight and date required' });
    const [row] = await sql`
      insert into weight_log (user_id, weight, date, note)
      values (${session.uid}, ${weight}, ${date}, ${note ?? null})
      returning id`;
    return res.status(200).json({ ok: true, id: row.id });
  }

  if (req.method === 'DELETE') {
    const { id } = await readJsonBody(req);
    if (!id) return res.status(400).json({ error: 'id required' });
    await sql`delete from weight_log where id = ${id} and user_id = ${session.uid}`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'method not allowed' });
};
