// Single Vercel serverless entrypoint for the entire API.
// All /api/* requests are routed through this file to the Hono app.
import { handle } from 'hono/vercel';
import { app } from '../server/app.js';

export const config = { runtime: 'nodejs' };

export default handle(app);
