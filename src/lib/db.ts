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
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_edit BOOLEAN NOT NULL DEFAULT false`;
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_delete BOOLEAN NOT NULL DEFAULT false`;
    await _sql`ALTER TABLE tyre_records ADD COLUMN IF NOT EXISTS tyre_type VARCHAR(20) NOT NULL DEFAULT 'normal'`;
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_changelog BOOLEAN NOT NULL DEFAULT false`;
    await _sql`ALTER TABLE handovers ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'collection'`;
    try { await _sql`ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'v5'`; } catch { /* already exists */ }
    try { await _sql`ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'signature'`; } catch { /* already exists */ }
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
