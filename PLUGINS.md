# OpenWeb Plugins Guide

This document explains how to build, package, test, and run plugins in OpenWeb.

## 1) Plugin System Overview

OpenWeb plugins are installed from **ZIP files** through Admin UI.

- Admin path: `System -> Plugins`
- Install: upload ZIP
- Activate: enable plugin toggle
- Runtime apply: click `Reload API`

Plugin dependencies are lifecycle-managed:

- On enable: plugin dependencies are installed in plugin folder
- On disable: plugin `node_modules` is removed
- On delete: plugin folder and dependencies are removed from server

## 2) Required ZIP Structure

A plugin ZIP must include `plugin.json` at its root.

Example:

```text
my-plugin.zip
  plugin.json
  index.js
  client.js        (optional)
  package.json     (optional, needed for npm deps)
  ...
```

## 3) Required `plugin.json`

`plugin.json` must contain:

- `name`
- `description`
- `author` or `authors`
- `version`
- `website`

Recommended fields:

- `main` (default: `index.js`)
- `client` (optional browser file)

Example:

```json
{
  "name": "Hello World Plugin",
  "description": "Example plugin for OpenWeb",
  "author": "Your Name",
  "version": "1.0.0",
  "website": "https://github.com/your-org/your-repo",
  "main": "index.js",
  "client": "client.js"
}
```

## 4) Plugin Runtime API (JavaScript)

`main` file exports a function:

```js
export default async function register(api) {
  // use api here
}
```

Available `api` members:

- `api.registerRoute(method, path, handler, options?)`
- `api.db.query(sql, params?)`
- `api.db.createTable(name, columns, opts?)`
- `api.db.dropTable(name)`
- `api.db.tableName(name)`
- `api.pages.list(siteId)`
- `api.pages.getById(siteId, id)`
- `api.pages.getBySlug(siteId, slug)`
- `api.pages.create(siteId, body)`
- `api.sites.list()`
- `api.sites.getById(id)`
- `api.cron.schedule(name, cronExpr, handler, options?)`
- `api.log.info(msg)` / `api.log.error(msg)`
- `api.plugin` metadata (`id`, `slug`, `name`, `siteId`)

### Route options

- `allSites?: boolean`
- `auth?: string[]` (`admin`, `page_developer`, etc.)
- `globalOnly?: boolean`

### Cron format

5-field cron format:

- `minute hour day month weekday`

Supported tokens:

- `*`
- `*/n`
- comma lists like `1,15,30`

## 5) Multisite Notes

- Plugin routes are site-aware by default.
- Use `allSites: true` to run route/cron handlers across sites.
- For plugin tables, use `createTable(..., { includeSiteId: true })` for per-site isolation.

## 6) Hello World Template

A ready ZIP template is included at repo root:

- `hello-world-plugin-template.zip`

Template source folder:

- `templates/plugins/hello-world/`

What it does:

- Registers `GET /api/plugins/hello-world/ping`
- Creates a plugin-scoped table
- Adds a cron heartbeat every 5 minutes
- Loads a client script in browser

## 7) Local Testing Workflow (GitHub Recommended)

Recommended approach:

1. Push OpenWeb repo changes to your GitHub repo.
2. Clone your GitHub repo on your local machine for testing.
3. Run OpenWeb locally (`npm run dev:api` + `npm run dev:web`) or with Docker.
4. Upload `hello-world-plugin-template.zip` in Admin.
5. Enable plugin and click `Reload API`.
6. Test route:
   - `GET /api/plugins/hello-world/ping`

This keeps plugin iteration reproducible with your GitHub history and branches.

## 8) Troubleshooting

- Upload fails:
  - Ensure ZIP contains `plugin.json` at root.
  - Ensure required metadata fields are present.
- Plugin not loading after enable:
  - Click `Reload API`.
  - Check API logs.
- Dependencies not found:
  - Confirm plugin has valid `package.json`.
  - Re-enable plugin to reinstall deps.
- Client script not running:
  - Confirm `client` field points to existing file.
  - Hard refresh browser cache.

