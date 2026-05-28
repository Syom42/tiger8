const { requireSession, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

module.exports = async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const rows = await sql`
      select exercise_name, weight, reps, achieved_at
      from personal_records where user_id = ${session.uid}`;
    // Return as { exerciseName: { weight, reps, date } } to match existing frontend shape
    const prs = {};
    for (const r of rows) {
      prs[r.exercise_name] = { weight: r.weight, reps: r.reps, date: r.achieved_at };
    }
    return res.status(200).json(prs);
  }

  if (req.method === 'PUT') {
    // Body: { exerciseName: { weight, reps, date } }
    const body = await readJsonBody(req);
    for (const [exercise_name, pr] of Object.entries(body)) {
      await sql`
        insert into personal_records (user_id, exercise_name, weight, reps, achieved_at)
        values (${session.uid}, ${exercise_name}, ${pr.weight ?? null}, ${pr.reps ?? null}, ${pr.date ?? null})
        on conflict (user_id, exercise_name) do update
          set weight = excluded.weight,
              reps = excluded.reps,
              achieved_at = excluded.achieved_at`;
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'method not allowed' });
};
