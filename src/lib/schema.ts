import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "user"]);
export const handoverStatusEnum = pgEnum("handover_status", [
  "draft",
  "completed",
]);
export const tyrePositionEnum = pgEnum("tyre_position", [
  "NSF",
  "NSR",
  "OSR",
  "OSF",
]);
export const photoCategoryEnum = pgEnum("photo_category", [
  "exterior",
  "interior",
  "damage",
  "tyres",
  "other",
  "v5",
  "signature",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("user"),
  canEdit: boolean("can_edit").notNull().default(false),
  canDelete: boolean("can_delete").notNull().default(false),
  canViewChangelog: boolean("can_view_changelog").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vehicles = pgTable("vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  registration: varchar("registration", { length: 20 }).notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const handovers = pgTable("handovers", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .references(() => vehicles.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  date: timestamp("date").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  mileage: integer("mileage"),
  otherComments: text("other_comments"),
  status: handoverStatusEnum("status").notNull().default("draft"),
  type: varchar("type", { length: 20 }).notNull().default("collection"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const handoverChecks = pgTable("handover_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  handoverId: uuid("handover_id")
    .references(() => handovers.id, { onDelete: "cascade" })
    .notNull(),
  checkItem: varchar("check_item", { length: 100 }).notNull(),
  checked: boolean("checked").notNull().default(false),
  comments: text("comments"),
});

export const tyreRecords = pgTable("tyre_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  handoverId: uuid("handover_id")
    .references(() => handovers.id, { onDelete: "cascade" })
    .notNull(),
  position: tyrePositionEnum("position").notNull(),
  size: varchar("size", { length: 50 }),
  depth: varchar("depth", { length: 50 }),
  brand: varchar("brand", { length: 100 }),
  tyreType: varchar("tyre_type", { length: 20 }).notNull().default("normal"),
});

export const handoverPhotos = pgTable("handover_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  handoverId: uuid("handover_id")
    .references(() => handovers.id, { onDelete: "cascade" })
    .notNull(),
  blobUrl: text("blob_url").notNull(),
  caption: text("caption"),
  category: photoCategoryEnum("category").notNull().default("other"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  vehicles: many(vehicles),
  handovers: many(handovers),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [vehicles.createdBy],
    references: [users.id],
  }),
  handovers: many(handovers),
}));

export const handoversRelations = relations(handovers, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [handovers.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [handovers.userId],
    references: [users.id],
  }),
  checks: many(handoverChecks),
  tyres: many(tyreRecords),
  photos: many(handoverPhotos),
}));

export const handoverChecksRelations = relations(
  handoverChecks,
  ({ one }) => ({
    handover: one(handovers, {
      fields: [handoverChecks.handoverId],
      references: [handovers.id],
    }),
  })
);

export const tyreRecordsRelations = relations(tyreRecords, ({ one }) => ({
  handover: one(handovers, {
    fields: [tyreRecords.handoverId],
    references: [handovers.id],
  }),
}));

export const handoverPhotosRelations = relations(
  handoverPhotos,
  ({ one }) => ({
    handover: one(handovers, {
      fields: [handoverPhotos.handoverId],
      references: [handovers.id],
    }),
  })
);
