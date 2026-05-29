// Single Vercel serverless entrypoint for the entire API.
// All /api/* requests are routed through this file to the Hono app.
// Uses named exports (Web API style) so Vercel treats these as fetch handlers.
import { handle } from 'hono/vercel';
import { app } from '../server/app.js';

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const HEAD = handler;
export const OPTIONS = handler;
