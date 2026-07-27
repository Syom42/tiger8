-- Use two minutes when a plan or completed workout does not specify a rest time.
alter table workout_exercises alter column rest_seconds set default 120;
alter table plan_exercises alter column rest_seconds set default 120;