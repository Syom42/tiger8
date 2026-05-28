const { requireSession, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

const THIRTY_DAYS_AGO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

module.exports = async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const supplements = await sql`
      select s.id, s.name, s.dose, s.time, s.enabled,
             coalesce(json_agg(st.taken_date) filter (where st.taken_date is not null), '[]') as taken_dates
      from supplements s
      left join supplement_taken st on st.supplement_id = s.id
      where s.user_id = ${session.uid}
      group by s.id
      order by s.name`;
    return res.status(200).json(supplements);
  }

  if (req.method === 'POST') {
    const { id, name, dose, time, enabled } = await readJsonBody(req);
    if (!id || !name) return res.status(400).json({ error: 'id and name required' });
    await sql`
      insert into supplements (id, user_id, name, dose, time, enabled)
      values (${id}, ${session.uid}, ${name}, ${dose ?? null}, ${time ?? null}, ${enabled ?? true})
      on conflict (id) do update
        set name = excluded.name, dose = excluded.dose,
            time = excluded.time, enabled = excluded.enabled`;
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PUT') {
    // Toggle taken for a date: { id, date, taken: true|false }
    const { id, date, taken } = await readJsonBody(req);
    if (!id || !date) return res.status(400).json({ error: 'id and date required' });
    if (taken) {
      await sql`
        insert into supplement_taken (supplement_id, taken_date) values (${id}, ${date})
        on conflict do nothing`;
    } else {
      await sql`delete from supplement_taken where supplement_id = ${id} and taken_date = ${date}`;
    }
    // Prune entries older than 30 days
    await sql`
      delete from supplement_taken
      where supplement_id = ${id} and taken_date < ${THIRTY_DAYS_AGO()}`;
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = await readJsonBody(req);
    if (!id) return res.status(400).json({ error: 'id required' });
    await sql`delete from supplements where id = ${id} and user_id = ${session.uid}`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return res.status(405).json({ error: 'method not allowed' });
};
