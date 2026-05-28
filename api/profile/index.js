const { requireSession, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

module.exports = async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const rows = await sql`
      select name, age, height, goal, joined_at
      from user_profiles where user_id = ${session.uid}`;
    return res.status(200).json(rows[0] ?? {});
  }

  if (req.method === 'PUT') {
    const { name, age, height, goal } = await readJsonBody(req);
    await sql`
      insert into user_profiles (user_id, name, age, height, goal)
      values (${session.uid}, ${name ?? null}, ${age ?? null}, ${height ?? null}, ${goal ?? null})
      on conflict (user_id) do update
        set name = excluded.name,
            age  = excluded.age,
            height = excluded.height,
            goal = excluded.goal`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'method not allowed' });
};
