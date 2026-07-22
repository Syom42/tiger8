# Tiger8

Tiger8 is a Hebrew RTL fitness tracker with a React/Vite client, a Hono API, and a Neon Postgres database through Vercel.

## Development

Install dependencies once:

```powershell
npm install
```

Create the local environment file at the repository root, next to `package.json`:

```text
.env.local
```

The file is intentionally ignored by Git. Do not put secrets in `.env.example`, source files, or commits. Once the Vercel Development environment is configured, pull it locally:

```powershell
npx vercel env pull .env.local --environment=development
```

Run the full application through the Vercel local runtime:

```powershell
npm run dev
```

Open `http://localhost:3000`. The standalone UI-only server is available with `npm run dev:web` at `http://localhost:5173`.

## Development Database

Keep development isolated from Preview and Production by creating a Neon branch from the existing Tiger8 Neon project. In the Neon dashboard, create a branch named `development`, then configure these Vercel project environment variables for **Development** only:

```text
POSTGRES_URL=<development branch connection string>
JWT_SECRET=<unique development secret>
APP_URL=http://localhost:3000
```

After pulling `.env.local`, apply the Drizzle schema only to the development database:

```powershell
npm run db:push
```

Never run this command until `POSTGRES_URL` points at the development branch. The application currently uses `@vercel/postgres`, so no second database client or connection abstraction is needed.

For a new Development database, run the complete bootstrap once:

```powershell
npm run db:bootstrap
```

This creates or updates the schema and seeds the shared exercise catalog. It is safe to rerun: the seed uses `ON CONFLICT DO NOTHING`. It does not create demo users or user data; workouts, history, plans, body-weight logs, PRs, weekly schedules, and supplements all belong to an authenticated user and should be created through the application as their screens are connected to the API.

## Verification

```powershell
npm run type-check
npm run build
```

With `npm run dev` running, run the Development smoke suite from a second terminal. It verifies public routes, email/password signup, authenticated bootstrap data, and the live AI coach:

```powershell
$env:QA_BASE_URL = 'http://localhost:3000'
npm run qa:smoke
```

The suite reports Google OAuth as skipped until Development has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. After configuring both, require the Google redirect as part of QA:

```powershell
$env:QA_REQUIRE_GOOGLE = '1'
npm run qa:smoke
```
