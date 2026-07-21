-- Convert legacy weekly plan names into nullable plan IDs.
-- This is one PostgreSQL statement so it can run in Vercel's query editor.
do $$
declare
  current_day_type text;
begin
  select data_type into current_day_type
  from information_schema.columns
  where table_schema = current_schema()
    and table_name = 'week_plan'
    and column_name = 'sun';

  if current_day_type = 'text' then
    alter table week_plan add column sun_plan_id bigint;
    alter table week_plan add column mon_plan_id bigint;
    alter table week_plan add column tue_plan_id bigint;
    alter table week_plan add column wed_plan_id bigint;
    alter table week_plan add column thu_plan_id bigint;
    alter table week_plan add column fri_plan_id bigint;
    alter table week_plan add column sat_plan_id bigint;

    update week_plan wp
    set
      sun_plan_id = (select p.id from plans p where p.user_id = wp.user_id and p.name = wp.sun order by p.id limit 1),
      mon_plan_id = (select p.id from plans p where p.user_id = wp.user_id and p.name = wp.mon order by p.id limit 1),
      tue_plan_id = (select p.id from plans p where p.user_id = wp.user_id and p.name = wp.tue order by p.id limit 1),
      wed_plan_id = (select p.id from plans p where p.user_id = wp.user_id and p.name = wp.wed order by p.id limit 1),
      thu_plan_id = (select p.id from plans p where p.user_id = wp.user_id and p.name = wp.thu order by p.id limit 1),
      fri_plan_id = (select p.id from plans p where p.user_id = wp.user_id and p.name = wp.fri order by p.id limit 1),
      sat_plan_id = (select p.id from plans p where p.user_id = wp.user_id and p.name = wp.sat order by p.id limit 1);

    alter table week_plan drop column sun;
    alter table week_plan drop column mon;
    alter table week_plan drop column tue;
    alter table week_plan drop column wed;
    alter table week_plan drop column thu;
    alter table week_plan drop column fri;
    alter table week_plan drop column sat;

    alter table week_plan rename column sun_plan_id to sun;
    alter table week_plan rename column mon_plan_id to mon;
    alter table week_plan rename column tue_plan_id to tue;
    alter table week_plan rename column wed_plan_id to wed;
    alter table week_plan rename column thu_plan_id to thu;
    alter table week_plan rename column fri_plan_id to fri;
    alter table week_plan rename column sat_plan_id to sat;

    alter table week_plan add constraint week_plan_sun_fkey foreign key (sun) references plans(id) on delete set null;
    alter table week_plan add constraint week_plan_mon_fkey foreign key (mon) references plans(id) on delete set null;
    alter table week_plan add constraint week_plan_tue_fkey foreign key (tue) references plans(id) on delete set null;
    alter table week_plan add constraint week_plan_wed_fkey foreign key (wed) references plans(id) on delete set null;
    alter table week_plan add constraint week_plan_thu_fkey foreign key (thu) references plans(id) on delete set null;
    alter table week_plan add constraint week_plan_fri_fkey foreign key (fri) references plans(id) on delete set null;
    alter table week_plan add constraint week_plan_sat_fkey foreign key (sat) references plans(id) on delete set null;
  elsif current_day_type is null then
    raise exception 'week_plan.sun does not exist; check that schema.sql was applied';
  end if;
end $$;