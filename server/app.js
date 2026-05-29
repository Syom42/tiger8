// Hono app — mount every route here. Single source of truth.
import { Hono } from 'hono';
import { onError } from './middleware/error.js';

import config       from './routes/config.js';
import init         from './routes/init.js';
import auth         from './routes/auth.js';
import profile      from './routes/profile.js';
import weekPlan     from './routes/weekPlan.js';
import prs          from './routes/prs.js';
import exercises    from './routes/exercises.js';
import workouts     from './routes/workouts.js';
import plans        from './routes/plans.js';
import weight       from './routes/weight.js';
import supplements  from './routes/supplements.js';
import coach        from './routes/coach.js';

export const app = new Hono().basePath('/api');

app.route('/', config);
app.route('/', init);
app.route('/', auth);
app.route('/', profile);
app.route('/', weekPlan);
app.route('/', prs);
app.route('/', exercises);
app.route('/', workouts);
app.route('/', plans);
app.route('/', weight);
app.route('/', supplements);
app.route('/', coach);

app.notFound((c) => c.json({ error: 'not found' }, 404));
app.onError(onError);
