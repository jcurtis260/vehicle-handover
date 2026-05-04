import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { UiPreferences } from "@/lib/ui-preferences";

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
  passwordChangedAt: timestamp("password_changed_at").defaultNow().notNull(),
  passwordMaxAgeDays: integer("password_max_age_days").default(30).notNull(),
  role: roleEnum("role").notNull().default("user"),
  canEdit: boolean("can_edit").notNull().default(false),
  canDelete: boolean("can_delete").notNull().default(false),
  canViewChangelog: boolean("can_view_changelog").notNull().default(false),
  canViewAllReports: boolean("can_view_all_reports").notNull().default(false),
  canEditAllReports: boolean("can_edit_all_reports").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  uiPreferences: jsonb("ui_preferences").$type<UiPreferences | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vehicleMakes = pgTable("vehicle_makes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vehicleModels = pgTable("vehicle_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  makeId: uuid("make_id")
    .references(() => vehicleMakes.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
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

export const formTemplates = pgTable("form_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  version: integer("version").notNull().default(1),
  isDraft: boolean("is_draft").notNull().default(true),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const formTemplateQuestions = pgTable("form_template_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .references(() => formTemplates.id, { onDelete: "cascade" })
    .notNull(),
  key: varchar("question_key", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  type: varchar("question_type", { length: 40 }).notNull(),
  required: boolean("required").notNull().default(false),
  helpText: text("help_text"),
  optionsJson: jsonb("options_json").$type<string[] | null>(),
  position: integer("position").notNull().default(0),
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
  /** Collection handovers: petrol | diesel | electric | petrol_hybrid | diesel_hybrid */
  fuelType: varchar("fuel_type", { length: 40 }),
  /** Collection handovers: accepted | rejected */
  collectionOutcome: varchar("collection_outcome", { length: 20 }),
  /** When collection is rejected */
  collectionRejectionReason: text("collection_rejection_reason"),
  /** Collection handovers: motorway | carwow | other */
  purchaseSource: varchar("purchase_source", { length: 20 }),
  /** Free text when purchaseSource is "other" */
  purchaseSourceOther: varchar("purchase_source_other", { length: 255 }),
  templateId: uuid("template_id").references(() => formTemplates.id, {
    onDelete: "set null",
  }),
  templateVersion: integer("template_version"),
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

export const handoverFormResponses = pgTable("handover_form_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  handoverId: uuid("handover_id")
    .references(() => handovers.id, { onDelete: "cascade" })
    .notNull(),
  questionId: uuid("question_id").references(() => formTemplateQuestions.id, {
    onDelete: "set null",
  }),
  questionKey: varchar("question_key", { length: 100 }).notNull(),
  questionLabel: varchar("question_label", { length: 255 }).notNull(),
  questionType: varchar("question_type", { length: 40 }).notNull(),
  valueJson: jsonb("value_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  vehicles: many(vehicles),
  handovers: many(handovers),
}));

export const vehicleMakesRelations = relations(vehicleMakes, ({ many }) => ({
  models: many(vehicleModels),
}));

export const vehicleModelsRelations = relations(vehicleModels, ({ one }) => ({
  make: one(vehicleMakes, {
    fields: [vehicleModels.makeId],
    references: [vehicleMakes.id],
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [vehicles.createdBy],
    references: [users.id],
  }),
  handovers: many(handovers),
}));

export const formTemplatesRelations = relations(formTemplates, ({ many }) => ({
  questions: many(formTemplateQuestions),
  handovers: many(handovers),
}));

export const formTemplateQuestionsRelations = relations(
  formTemplateQuestions,
  ({ one, many }) => ({
    template: one(formTemplates, {
      fields: [formTemplateQuestions.templateId],
      references: [formTemplates.id],
    }),
    responses: many(handoverFormResponses),
  })
);

export const handoversRelations = relations(handovers, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [handovers.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [handovers.userId],
    references: [users.id],
  }),
  template: one(formTemplates, {
    fields: [handovers.templateId],
    references: [formTemplates.id],
  }),
  checks: many(handoverChecks),
  tyres: many(tyreRecords),
  photos: many(handoverPhotos),
  dynamicResponses: many(handoverFormResponses),
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

export const handoverFormResponsesRelations = relations(
  handoverFormResponses,
  ({ one }) => ({
    handover: one(handovers, {
      fields: [handoverFormResponses.handoverId],
      references: [handovers.id],
    }),
    question: one(formTemplateQuestions, {
      fields: [handoverFormResponses.questionId],
      references: [formTemplateQuestions.id],
    }),
  })
);
