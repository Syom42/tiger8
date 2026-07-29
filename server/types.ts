// Shared Hono typings. Every router is created as `new Hono<AppEnv>()` so that
// `c.get('uid')` / `c.get('email')` are typed instead of `any`.
import type { Env } from 'hono';

/** Context values populated by `requireAuth`. */
export interface AppVariables {
  uid: number;
  email: string;
}

export interface AppEnv extends Env {
  Variables: AppVariables;
}
