const { requireSession, readJsonBody } = require('../_lib/auth');
const { sql } = require('../_lib/db');

module.exports = async function handler(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const workouts = await sql`
      select w.id, w.name, w.muscles, w.date, w.duration,
             json_agg(
               json_build_object(
                 'id', we.id,
                 'exercise_name', we.exercise_name,
                 'rest_seconds', we.rest_seconds,
                 'sort_order', we.sort_order,
                 'sets', (
                   select json_agg(
                     json_build_object('id', ws.id, 'weight', ws.weight, 'reps', ws.reps, 'done', ws.done, 'sort_order', ws.sort_order)
                     order by ws.sort_order
                   ) from workout_sets ws where ws.workout_exercise_id = we.id
                 )
               ) order by we.sort_order
             ) as exercises
      from workouts w
      left join workout_exercises we on we.workout_id = w.id
      where w.user_id = ${session.uid}
      group by w.id
      order by w.date desc`;
    return res.status(200).json(workouts);
  }

  if (req.method === 'POST') {
    const { id, name, muscles, date, duration, exercises } = await readJsonBody(req);
    if (!id || !name || !date) return res.status(400).json({ error: 'id, name, date required' });

    await sql`
      insert into workouts (id, user_id, name, muscles, date, duration)
      values (${id}, ${session.uid}, ${name}, ${muscles ?? []}, ${date}, ${duration ?? null})
      on conflict (id) do nothing`;

    for (let i = 0; i < (exercises ?? []).length; i++) {
      const ex = exercises[i];
      const [weRow] = await sql`
        insert into workout_exercises (workout_id, exercise_name, rest_seconds, sort_order)
        values (${id}, ${ex.name}, ${ex.restSeconds ?? 90}, ${i})
        returning id`;
      for (let j = 0; j < (ex.sets ?? []).length; j++) {
        const s = ex.sets[j];
        await sql`
          insert into workout_sets (workout_exercise_id, weight, reps, done, sort_order)
          values (${weRow.id}, ${s.weight ?? null}, ${s.reps ?? null}, ${s.done ?? false}, ${j})`;
      }
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = await readJsonBody(req);
    if (!id) return res.status(400).json({ error: 'id required' });
    await sql`delete from workouts where id = ${id} and user_id = ${session.uid}`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'method not allowed' });
};
