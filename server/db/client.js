// Drizzle client over @vercel/postgres. Use `db` for typed queries,
// and `sqlClient` for the rare case you need a raw template tag.
import { sql as sqlClient } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from './schema.js';

export const db = drizzle(sqlClient, { schema });
export { sqlClient };
