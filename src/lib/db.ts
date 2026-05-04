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
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP`;
    await _sql`UPDATE users SET password_changed_at = COALESCE(password_changed_at, created_at, NOW()) WHERE password_changed_at IS NULL`;
    await _sql`ALTER TABLE users ALTER COLUMN password_changed_at SET DEFAULT NOW()`;
    await _sql`ALTER TABLE users ALTER COLUMN password_changed_at SET NOT NULL`;
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_max_age_days INTEGER DEFAULT 30`;
    await _sql`UPDATE users SET password_max_age_days = 30 WHERE password_max_age_days IS NULL`;
    await _sql`ALTER TABLE users ALTER COLUMN password_max_age_days SET DEFAULT 30`;
    await _sql`ALTER TABLE users ALTER COLUMN password_max_age_days SET NOT NULL`;
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_edit BOOLEAN NOT NULL DEFAULT false`;
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_delete BOOLEAN NOT NULL DEFAULT false`;
    await _sql`ALTER TABLE tyre_records ADD COLUMN IF NOT EXISTS tyre_type VARCHAR(20) NOT NULL DEFAULT 'normal'`;
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_changelog BOOLEAN NOT NULL DEFAULT false`;
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_all_reports BOOLEAN NOT NULL DEFAULT false`;
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_edit_all_reports BOOLEAN NOT NULL DEFAULT false`;
    await _sql`ALTER TABLE handovers ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'collection'`;
    await _sql`ALTER TABLE handovers ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(40)`;
    await _sql`ALTER TABLE handovers ADD COLUMN IF NOT EXISTS collection_outcome VARCHAR(20)`;
    await _sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_preferences JSONB`;
    await _sql`ALTER TABLE handovers ADD COLUMN IF NOT EXISTS collection_rejection_reason TEXT`;
    await _sql`ALTER TABLE handovers ADD COLUMN IF NOT EXISTS purchase_source VARCHAR(20)`;
    await _sql`ALTER TABLE handovers ADD COLUMN IF NOT EXISTS purchase_source_other VARCHAR(255)`;
    await _sql`
      CREATE TABLE IF NOT EXISTS form_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        is_draft BOOLEAN NOT NULL DEFAULT true,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await _sql`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1`;
    await _sql`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS is_draft BOOLEAN`;
    await _sql`UPDATE form_templates SET is_draft = false WHERE is_draft IS NULL`;
    await _sql`ALTER TABLE form_templates ALTER COLUMN is_draft SET NOT NULL`;
    await _sql`ALTER TABLE form_templates ALTER COLUMN is_draft SET DEFAULT true`;
    await _sql`
      CREATE TABLE IF NOT EXISTS form_template_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
        question_key VARCHAR(100) NOT NULL,
        label VARCHAR(255) NOT NULL,
        question_type VARCHAR(40) NOT NULL,
        required BOOLEAN NOT NULL DEFAULT false,
        help_text TEXT,
        options_json JSONB,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await _sql`ALTER TABLE handovers ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES form_templates(id) ON DELETE SET NULL`;
    await _sql`ALTER TABLE handovers ADD COLUMN IF NOT EXISTS template_version INTEGER`;
    await _sql`
      CREATE TABLE IF NOT EXISTS handover_form_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        handover_id UUID NOT NULL REFERENCES handovers(id) ON DELETE CASCADE,
        question_id UUID REFERENCES form_template_questions(id) ON DELETE SET NULL,
        question_key VARCHAR(100) NOT NULL,
        question_label VARCHAR(255) NOT NULL,
        question_type VARCHAR(40) NOT NULL,
        value_json JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await _sql`
      CREATE INDEX IF NOT EXISTS form_template_questions_template_id_idx
      ON form_template_questions (template_id, position)
    `;
    await _sql`
      CREATE INDEX IF NOT EXISTS handover_form_responses_handover_id_idx
      ON handover_form_responses (handover_id)
    `;
    await _sql`
      CREATE TABLE IF NOT EXISTS vehicle_makes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await _sql`
      CREATE TABLE IF NOT EXISTS vehicle_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        make_id UUID NOT NULL REFERENCES vehicle_makes(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await _sql`
      CREATE UNIQUE INDEX IF NOT EXISTS vehicle_makes_name_lower_uq
      ON vehicle_makes (LOWER(name))
    `;
    await _sql`
      CREATE UNIQUE INDEX IF NOT EXISTS vehicle_models_make_name_lower_uq
      ON vehicle_models (make_id, LOWER(name))
    `;
    await _sql`
      CREATE INDEX IF NOT EXISTS vehicle_models_make_id_idx
      ON vehicle_models (make_id)
    `;
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
