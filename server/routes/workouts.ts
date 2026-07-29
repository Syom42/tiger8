import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import { createWorkout, deleteWorkout, listWorkouts } from '../services/workouts.js';
import type { AppEnv } from '../types.js';
import { WorkoutDeleteSchema, WorkoutSchema } from '../validators/workouts.js';

const app = new Hono<AppEnv>();
app.use('/workouts', requireAuth);

app.get('/workouts', async (c) => {
  return c.json(await listWorkouts(c.get('uid')));
});

app.post('/workouts', zValidator('json', WorkoutSchema), async (c) => {
  const id = await createWorkout(c.get('uid'), c.req.valid('json'));
  return c.json({ ok: true, id });
});

app.delete('/workouts', zValidator('json', WorkoutDeleteSchema), async (c) => {
  await deleteWorkout(c.get('uid'), c.req.valid('json').id);
  return c.json({ ok: true });
});

export default app;
