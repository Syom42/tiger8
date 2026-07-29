-- Per-exercise training targets inside a plan template.
alter table plan_exercises add column if not exists target_sets int default 3;
alter table plan_exercises add column if not exists target_reps int default 10;
