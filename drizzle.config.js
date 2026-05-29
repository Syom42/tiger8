// Drizzle Kit config. Tables already exist in Neon — `db:push` is harmless
// (no-op) if your DB matches schema.js. For new tables, run `npm run db:generate`
// to create a migration, then apply it manually or with `db:push`.
import 'dotenv/config';

/** @type {import('drizzle-kit').Config} */
export default {
  schema: './server/db/schema.js',
  out:    './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL,
  },
};
