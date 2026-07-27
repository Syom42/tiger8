-- Persist workout effort, warm-up sets, and paired-exercise groups.
alter table workout_sets add column if not exists rpe int;
alter table workout_sets add column if not exists rir int;
alter table workout_sets add column if not exists is_warmup boolean not null default false;

alter table workout_exercises add column if not exists superset_group text;
alter table plan_exercises add column if not exists superset_group text;