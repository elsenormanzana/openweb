# OpenWeb

Lightweight CMS: React + Tailwind + Shadcn (frontend), Node.js + Fastify + Drizzle + Postgres (backend).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Backend env**
   - Copy `apps/api/.env.example` to `apps/api/.env`
   - Set `DATABASE_URL` to your Postgres connection string

3. **Run migrations**
   - Generate (first time or after schema changes): `npm run db:generate`
   - Apply: `npm run db:migrate`

## Run

- **API:** `npm run dev:api` (default http://localhost:3000)
- **Web:** `npm run dev:web` (default http://localhost:5173)

## Live site

- **URL:** http://localhost:5173/ (with web dev server and API running)
- **/** — Shows the **homepage** (the page marked as homepage in admin). If none is set, you see a short message and a link to the admin.
- **/:slug** — Shows any other page by slug (e.g. `/about` for a page with slug `about`).
- From the admin sidebar, use **“View live site”** to open the live site in a new tab.

## Admin panel

- **URL:** http://localhost:5173/admin
- **Homepage** — Choose which page is the homepage; open it in the web editor to edit.
- **Pages** — Create a draft (title + slug), then open the **web editor**. Use **Settings** for title, slug, and “Set as homepage”.
- **Theme packs** — Add/edit theme packs (name, slug, CSS content).

## Scripts

| Command       | Description              |
|---------------|--------------------------|
| `npm run dev:api`   | Start API dev server     |
| `npm run dev:web`   | Start frontend dev server|
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate`  | Run Drizzle migrations   |
