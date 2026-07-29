import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import { deleteExercise, listExercises, saveExercise } from '../services/exercises.js';
import type { AppEnv } from '../types.js';
import { ExerciseDeleteSchema, ExerciseSchema } from '../validators/exercises.js';

const app = new Hono<AppEnv>();
app.use('/exercises', requireAuth);

app.get('/exercises', async (c) => {
  return c.json(await listExercises(c.get('uid')));
});

app.post('/exercises', zValidator('json', ExerciseSchema), async (c) => {
  const id = await saveExercise(c.get('uid'), c.req.valid('json'));
  return c.json({ ok: true, id });
});

app.delete('/exercises', zValidator('json', ExerciseDeleteSchema), async (c) => {
  await deleteExercise(c.get('uid'), c.req.valid('json').id);
  return c.json({ ok: true });
});

export default app;
