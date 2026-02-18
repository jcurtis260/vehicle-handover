import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hash } from "bcryptjs";
import { users } from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  await sql`
    DO $$ BEGIN
      CREATE TYPE role AS ENUM ('admin', 'user');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE handover_status AS ENUM ('draft', 'completed');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE tyre_position AS ENUM ('NSF', 'NSR', 'OSR', 'OSF');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE photo_category AS ENUM ('exterior', 'interior', 'damage', 'tyres', 'other');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password_hash TEXT NOT NULL,
      role role NOT NULL DEFAULT 'user',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS vehicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      make VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      registration VARCHAR(20) NOT NULL,
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS handovers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vehicle_id UUID NOT NULL REFERENCES vehicles(id),
      user_id UUID NOT NULL REFERENCES users(id),
      date TIMESTAMP NOT NULL,
      name VARCHAR(255) NOT NULL,
      mileage INTEGER,
      other_comments TEXT,
      status handover_status NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS handover_checks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      handover_id UUID NOT NULL REFERENCES handovers(id) ON DELETE CASCADE,
      check_item VARCHAR(100) NOT NULL,
      checked BOOLEAN NOT NULL DEFAULT false,
      comments TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tyre_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      handover_id UUID NOT NULL REFERENCES handovers(id) ON DELETE CASCADE,
      position tyre_position NOT NULL,
      size VARCHAR(50),
      depth VARCHAR(50),
      brand VARCHAR(100)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS handover_photos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      handover_id UUID NOT NULL REFERENCES handovers(id) ON DELETE CASCADE,
      blob_url TEXT NOT NULL,
      caption TEXT,
      category photo_category NOT NULL DEFAULT 'other',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing.length === 0) {
    const passwordHash = await hash(adminPassword, 12);
    await db.insert(users).values({
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "admin",
    });
    console.log(`Admin account created: ${adminEmail}`);
  } else {
    console.log("Admin account already exists");
  }

  console.log("Seed completed successfully");
}

seed().catch(console.error);
