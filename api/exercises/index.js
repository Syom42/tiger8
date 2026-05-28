const { requireSession, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

module.exports = async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const rows = await sql`
      select id, user_id, name, muscle, description, is_custom
      from exercises
      where user_id = ${session.uid} or user_id is null
      order by is_custom asc, name asc`;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { id, name, muscle, description } = await readJsonBody(req);
    if (!id || !name || !muscle) return res.status(400).json({ error: 'id, name, muscle required' });
    await sql`
      insert into exercises (id, user_id, name, muscle, description, is_custom)
      values (${id}, ${session.uid}, ${name}, ${muscle}, ${description ?? null}, true)
      on conflict (id) do update
        set name = excluded.name,
            muscle = excluded.muscle,
            description = excluded.description`;
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = await readJsonBody(req);
    if (!id) return res.status(400).json({ error: 'id required' });
    await sql`
      delete from exercises where id = ${id} and user_id = ${session.uid}`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'method not allowed' });
};
