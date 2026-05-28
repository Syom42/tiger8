const { requireSession, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

module.exports = async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const { rows } = await sql`
      select sun, mon, tue, wed, thu, fri, sat
      from week_plan where user_id = ${session.uid}`;
    return res.status(200).json(rows[0] ?? { sun: '', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '' });
  }

  if (req.method === 'PUT') {
    const { sun, mon, tue, wed, thu, fri, sat } = await readJsonBody(req);
    await sql`
      insert into week_plan (user_id, sun, mon, tue, wed, thu, fri, sat)
      values (${session.uid},
              ${sun ?? ''}, ${mon ?? ''}, ${tue ?? ''},
              ${wed ?? ''}, ${thu ?? ''}, ${fri ?? ''}, ${sat ?? ''})
      on conflict (user_id) do update
        set sun = excluded.sun, mon = excluded.mon, tue = excluded.tue,
            wed = excluded.wed, thu = excluded.thu, fri = excluded.fri, sat = excluded.sat`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'method not allowed' });
};
