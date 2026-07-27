import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { createPool } from '@vercel/postgres';

dotenv.config({ path: '.env.local' });
dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is required. Pull Development variables into .env.local before seeding.');
}

const seedSql = await readFile(new URL('../seed.sql', import.meta.url), 'utf8');
const pool = createPool({ connectionString: process.env.POSTGRES_URL });

try {
  await pool.query(seedSql);
  const { rows } = await pool.query(
    'select count(*)::int as count from exercises where user_id is null and is_custom = false',
  );
  console.log(`Database seed complete: ${rows[0].count} shared exercises available.`);
} finally {
  await pool.end();
}
