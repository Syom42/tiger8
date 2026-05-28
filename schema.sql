-- Tiger8 schema — run once against your Neon database (Neon Console → SQL Editor).
-- WARNING: the DROP statements are irreversible — only run on a fresh DB.

drop table if exists user_data cascade;
drop table if exists users cascade;

-- Local user accounts (email + password hash). password_hash is null for Google-only users.
create table if not exists users (
  id            bigserial primary key,
  email         text unique not null,
  password_hash text,
  created_at    timestamptz not null default now()
);

-- App-specific profile data, one row per user.
create table if not exists user_profiles (
  user_id   bigint primary key references users(id) on delete cascade,
  name      text,
  age       int,
  height    numeric,
  goal      text,
  joined_at timestamptz not null default now()
);

-- Exercise library. Preset exercises have user_id = NULL; custom ones are scoped to a user.
create table if not exists exercises (
  id          text primary key,
  user_id     bigint references users(id) on delete cascade,
  name        text not null,
  muscle      text not null,
  description text,
  is_custom   boolean not null default false
);

-- Completed workout sessions.
create table if not exists workouts (
  id         bigint primary key,   -- Date.now() from client
  user_id    bigint not null references users(id) on delete cascade,
  name       text not null,
  muscles    text[],
  date       timestamptz not null,
  duration   int,                  -- seconds
  created_at timestamptz not null default now()
);

-- Exercises within a completed workout.
create table if not exists workout_exercises (
  id            bigserial primary key,
  workout_id    bigint not null references workouts(id) on delete cascade,
  exercise_name text not null,
  rest_seconds  int default 90,
  sort_order    int not null default 0
);

-- Individual sets within a workout exercise.
create table if not exists workout_sets (
  id                  bigserial primary key,
  workout_exercise_id bigint not null references workout_exercises(id) on delete cascade,
  weight              text,
  reps                text,
  done                boolean not null default false,
  sort_order          int not null default 0
);

-- Reusable workout plan templates.
create table if not exists plans (
  id          bigint primary key,  -- Date.now() from client
  user_id     bigint not null references users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- Exercises within a plan template.
create table if not exists plan_exercises (
  id            bigserial primary key,
  plan_id       bigint not null references plans(id) on delete cascade,
  exercise_name text not null,
  rest_seconds  int default 90,
  sort_order    int not null default 0
);

-- Weekly schedule (one row per user, upsert on save).
create table if not exists week_plan (
  user_id bigint primary key references users(id) on delete cascade,
  sun     text not null default '',
  mon     text not null default '',
  tue     text not null default '',
  wed     text not null default '',
  thu     text not null default '',
  fri     text not null default '',
  sat     text not null default ''
);

-- Personal records — one row per (user, exercise name).
create table if not exists personal_records (
  user_id       bigint not null references users(id) on delete cascade,
  exercise_name text not null,
  weight        numeric,
  reps          int,
  achieved_at   timestamptz,
  primary key (user_id, exercise_name)
);

-- Body weight log.
create table if not exists weight_log (
  id        bigserial primary key,
  user_id   bigint not null references users(id) on delete cascade,
  weight    numeric not null,
  date      text not null,       -- 'YYYY-MM-DD' from client
  note      text,
  logged_at timestamptz not null default now()
);

-- Supplement list.
create table if not exists supplements (
  id      text primary key,      -- 'supp_<timestamp>' from client
  user_id bigint not null references users(id) on delete cascade,
  name    text not null,
  dose    text,
  time    text,                  -- 'HH:MM'
  enabled boolean not null default true
);

-- Daily adherence tracking (kept to last 30 days; pruned on write).
create table if not exists supplement_taken (
  supplement_id text not null references supplements(id) on delete cascade,
  taken_date    text not null,   -- 'YYYY-MM-DD'
  primary key (supplement_id, taken_date)
);
