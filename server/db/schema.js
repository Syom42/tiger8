// Drizzle schema — mirrors schema.sql. Edit both in lockstep.
import {
  pgTable, bigserial, bigint, text, integer, numeric, boolean,
  timestamp, primaryKey,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id:           bigserial('id', { mode: 'number' }).primaryKey(),
  email:        text('email').unique().notNull(),
  passwordHash: text('password_hash'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userProfiles = pgTable('user_profiles', {
  userId:   bigint('user_id', { mode: 'number' }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  name:     text('name'),
  age:      integer('age'),
  height:   numeric('height'),
  goal:     text('goal'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
});

export const exercises = pgTable('exercises', {
  id:          text('id').primaryKey(),
  userId:      bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  muscle:      text('muscle').notNull(),
  description: text('description'),
  isCustom:    boolean('is_custom').notNull().default(false),
});

export const workouts = pgTable('workouts', {
  id:        bigint('id', { mode: 'number' }).primaryKey(),
  userId:    bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  muscles:   text('muscles').array(),
  date:      timestamp('date', { withTimezone: true }).notNull(),
  duration:  integer('duration'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workoutExercises = pgTable('workout_exercises', {
  id:           bigserial('id', { mode: 'number' }).primaryKey(),
  workoutId:    bigint('workout_id', { mode: 'number' }).notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseName: text('exercise_name').notNull(),
  restSeconds:  integer('rest_seconds').default(90),
  sortOrder:    integer('sort_order').notNull().default(0),
});

export const workoutSets = pgTable('workout_sets', {
  id:                bigserial('id', { mode: 'number' }).primaryKey(),
  workoutExerciseId: bigint('workout_exercise_id', { mode: 'number' }).notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
  weight:            text('weight'),
  reps:              text('reps'),
  done:              boolean('done').notNull().default(false),
  sortOrder:         integer('sort_order').notNull().default(0),
});

export const plans = pgTable('plans', {
  id:          bigint('id', { mode: 'number' }).primaryKey(),
  userId:      bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const planExercises = pgTable('plan_exercises', {
  id:           bigserial('id', { mode: 'number' }).primaryKey(),
  planId:       bigint('plan_id', { mode: 'number' }).notNull().references(() => plans.id, { onDelete: 'cascade' }),
  exerciseName: text('exercise_name').notNull(),
  restSeconds:  integer('rest_seconds').default(90),
  sortOrder:    integer('sort_order').notNull().default(0),
});

export const weekPlan = pgTable('week_plan', {
  userId: bigint('user_id', { mode: 'number' }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  sun:    text('sun').notNull().default(''),
  mon:    text('mon').notNull().default(''),
  tue:    text('tue').notNull().default(''),
  wed:    text('wed').notNull().default(''),
  thu:    text('thu').notNull().default(''),
  fri:    text('fri').notNull().default(''),
  sat:    text('sat').notNull().default(''),
});

export const personalRecords = pgTable('personal_records', {
  userId:       bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  exerciseName: text('exercise_name').notNull(),
  weight:       numeric('weight'),
  reps:         integer('reps'),
  achievedAt:   timestamp('achieved_at', { withTimezone: true }),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.exerciseName] }),
}));

export const weightLog = pgTable('weight_log', {
  id:       bigserial('id', { mode: 'number' }).primaryKey(),
  userId:   bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  weight:   numeric('weight').notNull(),
  date:     text('date').notNull(),
  note:     text('note'),
  loggedAt: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow(),
});

export const supplements = pgTable('supplements', {
  id:      text('id').primaryKey(),
  userId:  bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:    text('name').notNull(),
  dose:    text('dose'),
  time:    text('time'),
  enabled: boolean('enabled').notNull().default(true),
});

export const supplementTaken = pgTable('supplement_taken', {
  supplementId: text('supplement_id').notNull().references(() => supplements.id, { onDelete: 'cascade' }),
  takenDate:    text('taken_date').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.supplementId, t.takenDate] }),
}));
