// Drizzle client over @vercel/postgres. Use `db` for typed queries,
// and `sqlClient` for the rare case you need a raw template tag.
import { sql as sqlClient } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from './schema.js';

export const db = drizzle(sqlClient, { schema });
export { sqlClient };

export type Database = typeof db;
/** The `tx` handle passed to `db.transaction(async (tx) => ...)`. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Anything that can run a query — lets services work inside or outside a tx. */
export type Executor = Database | Transaction;

/** Normalises raw driver results (`{ rows }` or a plain array) into rows. */
export function toRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown } | null | undefined)?.rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}
