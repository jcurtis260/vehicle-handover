import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;
let _sql: NeonQueryFunction<false, false> | null = null;
let _migrated = false;

async function runAutoMigrations() {
  if (_migrated || !_sql) return;
  _migrated = true;
  try {
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP`;
  } catch (err) {
    console.error("[AutoMigrate] Failed:", err);
  }
}

export function getDb() {
  if (!_db) {
    _sql = neon(process.env.DATABASE_URL!);
    _db = drizzle(_sql, { schema });
    runAutoMigrations();
  }
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
