-- Tiger8 schema. Run once against your Vercel Postgres database
-- (Vercel dashboard → Storage → your DB → Query).

create table if not exists users (
  id            bigserial primary key,
  email         text unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists user_data (
  user_id    bigint primary key references users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
