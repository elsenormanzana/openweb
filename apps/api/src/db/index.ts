import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export function getDatabaseUrl() {
  const host = process.env.POSTGRES_HOST?.trim() || "localhost";
  const port = process.env.POSTGRES_PORT?.trim() || "5432";
  const db = process.env.POSTGRES_DB?.trim();
  const user = process.env.POSTGRES_USER?.trim();
  const pass = process.env.POSTGRES_PASSWORD ?? "";

  // Prefer discrete Postgres vars when present to avoid URL parsing issues
  // with special characters in credentials (for example '@' in password).
  if (db && user) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(db)}`;
  }

  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();

  throw new Error("Database configuration missing. Set DATABASE_URL or POSTGRES_HOST/POSTGRES_PORT/POSTGRES_DB/POSTGRES_USER/POSTGRES_PASSWORD.");
}

const connection = postgres(getDatabaseUrl(), {
  // Connection pool tuning
  max: 20,                // max simultaneous connections (default is 10)
  idle_timeout: 20,       // close idle connections after 20s
  connect_timeout: 5,     // fail fast if DB unreachable
  max_lifetime: 1800,     // recycle connections every 30min to avoid stale sockets
  prepare: false,         // disable prepared statements — required when running behind PgBouncer in transaction mode
});
export const db = drizzle(connection, { schema });
export * from "./schema.js";
