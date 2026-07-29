// Drizzle Kit config. Tables already exist in Neon — `db:push` is harmless
// (no-op) if your DB matches schema.ts. For new tables, run `npm run db:generate`
// to create a migration, then apply it manually or with `db:push`.
import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: '.env.local' });
dotenv.config();

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? '',
  },
});
