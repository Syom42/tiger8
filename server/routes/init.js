// Combined init endpoint — returns all user data in a single request.
// Eliminates 8 parallel cold-start connections to Neon.
import { Hono } from 'hono';
import { eq, or, isNull, asc, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sqlClient } from '../db/client.js';
import {
  users, userProfiles, exercises, workouts, workoutExercises, workoutSets,
  plans, planExercises, weekPlan, personalRecords, weightLog, supplements,
} from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const app = new Hono();

app.get('/init', requireAuth, async (c) => {
  const uid = c.get('uid');

  // Run all queries in parallel — single connection, concurrent queries
  const [
    profileRows,
    exerciseRows,
    workoutRows,
    planRows,
    weekPlanRows,
    prRows,
    weightRows,
    suppRows,
  ] = await Promise.all([
    // Profile
    db.select({
      name: userProfiles.name, age: userProfiles.age, height: userProfiles.height,
      goal: userProfiles.goal, joined_at: userProfiles.joinedAt, email: users.email,
    }).from(users).leftJoin(userProfiles, eq(userProfiles.userId, users.id)).where(eq(users.id, uid)),

    // Exercises
    db.select({
      id: exercises.id, user_id: exercises.userId, name: exercises.name,
      muscle: exercises.muscle, description: exercises.description, is_custom: exercises.isCustom,
    }).from(exercises)
      .where(or(eq(exercises.userId, uid), isNull(exercises.userId)))
      .orderBy(asc(exercises.isCustom), asc(exercises.name)),

    // Workouts (just the parent rows — exercises assembled below)
    db.select().from(workouts).where(eq(workouts.userId, uid)).orderBy(desc(workouts.date)),

    // Plans (just the parent rows)
    db.select().from(plans).where(eq(plans.userId, uid)).orderBy(asc(plans.createdAt)),

    // Week plan
    db.select({
      sun: weekPlan.sun, mon: weekPlan.mon, tue: weekPlan.tue,
      wed: weekPlan.wed, thu: weekPlan.thu, fri: weekPlan.fri, sat: weekPlan.sat,
    }).from(weekPlan).where(eq(weekPlan.userId, uid)),

    // PRs
    db.select({
      exercise_name: personalRecords.exerciseName,
      weight: personalRecords.weight, reps: personalRecords.reps,
      achieved_at: personalRecords.achievedAt,
    }).from(personalRecords).where(eq(personalRecords.userId, uid)),

    // Weight log
    db.select({ id: weightLog.id, weight: weightLog.weight, date: weightLog.date, note: weightLog.note })
      .from(weightLog).where(eq(weightLog.userId, uid)).orderBy(asc(weightLog.date)),

    // Supplements with taken_dates (raw SQL for json_agg)
    sqlClient`
      select s.id, s.name, s.dose, s.time, s.enabled,
             coalesce(json_agg(st.taken_date) filter (where st.taken_date is not null), '[]') as taken_dates
      from supplements s
      left join supplement_taken st on st.supplement_id = s.id
      where s.user_id = ${uid}
      group by s.id
      order by s.name`,
  ]);

  // Assemble workout exercises + sets
  let workoutsWithExercises = workoutRows;
  if (workoutRows.length > 0) {
    const { inArray } = await import('drizzle-orm');
    const wIds = workoutRows.map(w => w.id);
    const [exRows, allSets] = await Promise.all([
      db.select().from(workoutExercises).where(inArray(workoutExercises.workoutId, wIds)).orderBy(asc(workoutExercises.sortOrder)),
      db.select().from(workoutSets).orderBy(asc(workoutSets.sortOrder)),
    ]);

    // Filter sets to only those belonging to our exercises
    const exIds = new Set(exRows.map(e => e.id));
    const setsByEx = new Map();
    for (const s of allSets) {
      if (!exIds.has(s.workoutExerciseId)) continue;
      if (!setsByEx.has(s.workoutExerciseId)) setsByEx.set(s.workoutExerciseId, []);
      setsByEx.get(s.workoutExerciseId).push({
        id: s.id, weight: s.weight, reps: s.reps, done: s.done, sort_order: s.sortOrder,
      });
    }

    const exByWorkout = new Map();
    for (const e of exRows) {
      if (!exByWorkout.has(e.workoutId)) exByWorkout.set(e.workoutId, []);
      exByWorkout.get(e.workoutId).push({
        id: e.id, exercise_name: e.exerciseName,
        rest_seconds: e.restSeconds, sort_order: e.sortOrder,
        sets: setsByEx.get(e.id) ?? [],
      });
    }

    workoutsWithExercises = workoutRows.map(w => ({
      id: w.id, name: w.name, muscles: w.muscles, date: w.date, duration: w.duration,
      exercises: exByWorkout.get(w.id) ?? [],
    }));
  }

  // Assemble plan exercises
  let plansWithExercises = planRows;
  if (planRows.length > 0) {
    const { inArray } = await import('drizzle-orm');
    const pExRows = await db.select().from(planExercises)
      .where(inArray(planExercises.planId, planRows.map(p => p.id)))
      .orderBy(asc(planExercises.sortOrder));

    const byPlan = new Map();
    for (const e of pExRows) {
      if (!byPlan.has(e.planId)) byPlan.set(e.planId, []);
      byPlan.get(e.planId).push({
        id: e.id, exercise_name: e.exerciseName,
        rest_seconds: e.restSeconds, sort_order: e.sortOrder,
      });
    }
    plansWithExercises = planRows.map(p => ({
      id: p.id, name: p.name, description: p.description,
      exercises: byPlan.get(p.id) ?? [],
    }));
  }

  // PRs as object
  const prs = {};
  for (const r of prRows) {
    prs[r.exercise_name] = { weight: r.weight, reps: r.reps, date: r.achieved_at };
  }

  return c.json({
    profile: profileRows[0] ?? { email: c.get('email') },
    exercises: exerciseRows,
    workouts: workoutsWithExercises,
    plans: plansWithExercises,
    weekPlan: weekPlanRows[0] ?? { sun: '', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '' },
    prs,
    weight: weightRows,
    supplements: suppRows.rows ?? suppRows,
  });
});

export default app;
