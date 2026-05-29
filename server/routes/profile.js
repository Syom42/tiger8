import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, userProfiles } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { ProfileSchema } from '../validators/schemas.js';

const app = new Hono();
app.use('/profile', requireAuth);

app.get('/profile', async (c) => {
  const uid = c.get('uid');
  const rows = await db
    .select({
      name: userProfiles.name, age: userProfiles.age, height: userProfiles.height,
      goal: userProfiles.goal, joined_at: userProfiles.joinedAt, email: users.email,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, uid));
  return c.json(rows[0] ?? { email: c.get('email') });
});

app.put('/profile', zValidator('json', ProfileSchema), async (c) => {
  const uid = c.get('uid');
  const { name, age, height, goal } = c.req.valid('json');
  await db.insert(userProfiles)
    .values({ userId: uid, name: name ?? null, age: age ?? null, height: height ?? null, goal: goal ?? null })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { name: name ?? null, age: age ?? null, height: height ?? null, goal: goal ?? null },
    });
  return c.json({ ok: true });
});

export default app;
