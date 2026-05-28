const { requireSession, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

module.exports = async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const { rows: plans } = await sql`
      select p.id, p.name, p.description,
             json_agg(
               json_build_object(
                 'id', pe.id,
                 'exercise_name', pe.exercise_name,
                 'rest_seconds', pe.rest_seconds,
                 'sort_order', pe.sort_order
               ) order by pe.sort_order
             ) filter (where pe.id is not null) as exercises
      from plans p
      left join plan_exercises pe on pe.plan_id = p.id
      where p.user_id = ${session.uid}
      group by p.id
      order by p.created_at asc`;
    return res.status(200).json(plans.map(p => ({ ...p, exercises: p.exercises ?? [] })));
  }

  if (req.method === 'POST') {
    const { id, name, description, exercises } = await readJsonBody(req);
    if (!id || !name) return res.status(400).json({ error: 'id, name required' });

    await sql`
      insert into plans (id, user_id, name, description)
      values (${id}, ${session.uid}, ${name}, ${description ?? null})
      on conflict (id) do update set name = excluded.name, description = excluded.description`;

    await sql`delete from plan_exercises where plan_id = ${id}`;
    for (let i = 0; i < (exercises ?? []).length; i++) {
      const ex = exercises[i];
      const name_val = typeof ex === 'string' ? ex : ex.name;
      const rest = typeof ex === 'string' ? 90 : (ex.restSeconds ?? 90);
      await sql`
        insert into plan_exercises (plan_id, exercise_name, rest_seconds, sort_order)
        values (${id}, ${name_val}, ${rest}, ${i})`;
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = await readJsonBody(req);
    if (!id) return res.status(400).json({ error: 'id required' });
    await sql`delete from plans where id = ${id} and user_id = ${session.uid}`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'method not allowed' });
};
