# GEMINI.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OpenWeb** is a lightweight CMS monorepo with two apps:
- `apps/api` - Fastify backend with PostgreSQL (via Drizzle ORM)
- `apps/web` - React SPA frontend (Vite + Tailwind + Shadcn/UI)

## Commands

### Root-level (run from `/`)
```bash
npm run dev:api          # Start API dev server (tsx watch)
npm run dev:web          # Start web dev server (Vite)
npm run build:api        # Compile API TypeScript
npm run build:web        # Type-check + Vite build
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run pending migrations
```

### API-specific (from `apps/api/`)
```bash
npm run db:studio        # Open Drizzle Studio (DB GUI)
npm start                # Run compiled production server
```

### Web-specific (from `apps/web/`)
```bash
npm run lint             # ESLint
npm run preview          # Preview production build
```

## Environment Setup

Copy `apps/api/.env.example` to `apps/api/.env` and set:
- `PORT` - API server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/openweb`)

## Architecture

### Backend (`apps/api/src/`)
- **`index.ts`** - Single-file Fastify server with all route handlers (~411 lines). Registers CORS, multipart, and static file plugins.
- **`db/schema.ts`** - Drizzle schema: `pages`, `siteSettings`, `themePacks`, `storageConfig`, `mediaItems` tables
- **`db/index.ts`** - Drizzle connection via `DATABASE_URL`

Key backend behaviors:
- Only one page can be marked as `isHomepage` at a time (enforced in route handlers)
- `siteSettings` stores nav/footer config as JSON columns
- File uploads stored in `apps/api/uploads/`; SVGs are converted to JPEG via Sharp
- Storage config supports local, S3, Firebase, Google Drive, Google Photos with Google OAuth

### Frontend (`apps/web/src/`)
- **`App.tsx`** - React Router route tree (admin and public routes)
- **`pages/`** - Admin pages (PagesList, MediaGallery, ThemePacksList, StorageSettings, etc.) and public pages
- **`components/ui/`** - Shadcn/UI primitives (Button, Card, Dialog, Input, Tabs, etc.)
- **`lib/utils.ts`** - `cn()` (clsx + tailwind-merge) and `slugify()` helpers
- Several files are stubs under active development: `PageWebEditor`, `PublicPage`, `PublicHomePage`, `BlockEditor`, `BlockRenderer`, `GlobalLayout`, `lib/api.ts`, `lib/blocks.ts`

### Frontend–Backend Integration
- Vite proxies `/api/*` and `/uploads/*` to `http://localhost:3000` in development
- No dedicated API client yet (`lib/api.ts` is empty); fetch calls are made directly in page components

## Key Patterns

- **TypeScript throughout** - strict mode in API (`tsconfig.json`), standard in web
- **Shadcn/UI** - configured via `apps/web/components.json`; add components with the shadcn CLI
- **Drizzle ORM** - schema-first; always run `db:generate` after schema changes, then `db:migrate`
- **npm workspaces** - monorepo managed at root; workspace packages referenced as `apps/api` and `apps/web`

## Important Rules when Coding

- **Less code is better** - It is better to create code without bloating with code, less is more.
- **Elegant design and flexibility** - We want to create something for people that are not code literate.
- **Code first, import later** - If the solution can be made with code, let's do that and prevent a bunch of imports.
- **Keep it lightweight** - We want to create a powerful website builder, but keeping it light and snappy.
