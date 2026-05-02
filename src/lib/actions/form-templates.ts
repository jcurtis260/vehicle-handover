"use server";

import { db } from "@/lib/db";
import {
  formTemplateQuestions,
  formTemplates,
  handovers,
} from "@/lib/schema";
import {
  and,
  asc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  DYNAMIC_QUESTION_TYPES,
  isDynamicQuestionType,
  type DynamicFormTemplateDetails,
  type DynamicQuestionType,
} from "@/lib/dynamic-forms";

const MAX_NAME = 255;
const MAX_LABEL = 255;
const MAX_KEY = 100;

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

async function requireUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function bumpTemplateVersion(templateId: string) {
  await db
    .update(formTemplates)
    .set({
      version: sql`${formTemplates.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(formTemplates.id, templateId));
}

async function touchTemplate(templateId: string) {
  await db
    .update(formTemplates)
    .set({ updatedAt: new Date() })
    .where(eq(formTemplates.id, templateId));
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function validateQuestionInput(input: {
  key: string;
  label: string;
  type: string;
  required: boolean;
  helpText?: string | null;
  options?: string[] | null;
}) {
  const key = normalizeKey(input.key);
  if (!key || key.length > MAX_KEY) {
    throw new Error("Invalid question key");
  }
  const label = input.label.trim();
  if (!label || label.length > MAX_LABEL) {
    throw new Error("Invalid question label");
  }
  if (!isDynamicQuestionType(input.type)) {
    throw new Error("Invalid question type");
  }
  const helpText = input.helpText?.trim() || null;
  if (helpText && helpText.length > 1000) {
    throw new Error("Help text is too long");
  }

  let options: string[] | null = null;
  if (input.type === "single_select" || input.type === "multi_select") {
    const next = (input.options || [])
      .map((option) => option.trim())
      .filter(Boolean);
    if (next.length < 2) {
      throw new Error("Select questions need at least 2 options");
    }
    if (next.some((option) => option.length > MAX_LABEL)) {
      throw new Error("Option values are too long");
    }
    options = next;
  }

  return {
    key,
    label,
    type: input.type as DynamicQuestionType,
    required: Boolean(input.required),
    helpText,
    options,
  };
}

export async function listFormTemplates() {
  await requireAdminSession();
  const templates = await db
    .select()
    .from(formTemplates)
    .orderBy(asc(formTemplates.name));

  const questions = await db
    .select()
    .from(formTemplateQuestions)
    .orderBy(
      asc(formTemplateQuestions.templateId),
      asc(formTemplateQuestions.position)
    );

  const byTemplate = new Map<string, typeof questions>();
  for (const question of questions) {
    const bucket = byTemplate.get(question.templateId) || [];
    bucket.push(question);
    byTemplate.set(question.templateId, bucket);
  }

  return templates.map((template) => ({
    ...template,
    questions: byTemplate.get(template.id) || [],
  })) as DynamicFormTemplateDetails[];
}

export async function listActiveFormTemplates() {
  await requireUserSession();
  return db
    .select({
      id: formTemplates.id,
      name: formTemplates.name,
      version: formTemplates.version,
      isDraft: formTemplates.isDraft,
      description: formTemplates.description,
      isActive: formTemplates.isActive,
      createdAt: formTemplates.createdAt,
      updatedAt: formTemplates.updatedAt,
    })
    .from(formTemplates)
    .where(and(eq(formTemplates.isActive, true), eq(formTemplates.isDraft, false)))
    .orderBy(asc(formTemplates.name));
}

export async function getFormTemplateDetails(
  templateId: string,
  options?: { includeInactive?: boolean }
) {
  await requireUserSession();
  const [template] = await db
    .select()
    .from(formTemplates)
    .where(
      options?.includeInactive
        ? eq(formTemplates.id, templateId)
        : and(eq(formTemplates.id, templateId), eq(formTemplates.isActive, true))
    )
    .limit(1);

  if (!template) return null;

  const questions = await db
    .select()
    .from(formTemplateQuestions)
    .where(eq(formTemplateQuestions.templateId, template.id))
    .orderBy(asc(formTemplateQuestions.position));

  return {
    ...template,
    questions,
  } as DynamicFormTemplateDetails;
}

export async function createFormTemplate(input: {
  name: string;
  description?: string | null;
  isActive?: boolean;
}) {
  await requireAdminSession();
  const name = input.name.trim();
  if (!name || name.length > MAX_NAME) {
    throw new Error("Invalid form name");
  }
  const description = input.description?.trim() || null;
  if (description && description.length > 2000) {
    throw new Error("Description is too long");
  }

  const [created] = await db
    .insert(formTemplates)
    .values({
      name,
      version: 1,
      isDraft: true,
      description,
      isActive: input.isActive ?? true,
      updatedAt: new Date(),
    })
    .returning();

  revalidatePath("/forms");
  revalidatePath("/handovers/new");
  return created;
}

export async function updateFormTemplate(
  templateId: string,
  input: {
    name: string;
    description?: string | null;
    isActive: boolean;
  }
) {
  await requireAdminSession();
  const name = input.name.trim();
  if (!name || name.length > MAX_NAME) {
    throw new Error("Invalid form name");
  }
  const description = input.description?.trim() || null;
  if (description && description.length > 2000) {
    throw new Error("Description is too long");
  }

  await db
    .update(formTemplates)
    .set({
      name,
      description,
      isActive: Boolean(input.isActive),
      // Metadata edits do not bump version by themselves.
      updatedAt: new Date(),
    })
    .where(eq(formTemplates.id, templateId));

  revalidatePath("/forms");
  revalidatePath("/handovers/new");
}

export async function deleteFormTemplate(templateId: string) {
  await requireAdminSession();
  const [usage] = await db
    .select({ value: sql<number>`COUNT(*)::int` })
    .from(handovers)
    .where(eq(handovers.templateId, templateId));

  if ((usage?.value || 0) > 0) {
    throw new Error("Cannot delete a form that has existing handovers");
  }

  await db.delete(formTemplates).where(eq(formTemplates.id, templateId));
  revalidatePath("/forms");
  revalidatePath("/handovers/new");
}

export async function addFormQuestion(
  templateId: string,
  input: {
    key: string;
    label: string;
    type: string;
    required: boolean;
    helpText?: string | null;
    options?: string[] | null;
  }
) {
  await requireAdminSession();
  const validated = validateQuestionInput(input);
  const [existing] = await db
    .select({ id: formTemplateQuestions.id })
    .from(formTemplateQuestions)
    .where(
      and(
        eq(formTemplateQuestions.templateId, templateId),
        eq(formTemplateQuestions.key, validated.key)
      )
    )
    .limit(1);
  if (existing) {
    throw new Error("Question key already exists in this form");
  }

  const [lastPosition] = await db
    .select({ value: sql<number>`COALESCE(MAX(${formTemplateQuestions.position}), -1)` })
    .from(formTemplateQuestions)
    .where(eq(formTemplateQuestions.templateId, templateId));

  const [created] = await db
    .insert(formTemplateQuestions)
    .values({
      templateId,
      key: validated.key,
      label: validated.label,
      type: validated.type,
      required: validated.required,
      helpText: validated.helpText,
      optionsJson: validated.options,
      position: (lastPosition?.value ?? -1) + 1,
    })
    .returning();

  await touchTemplate(templateId);

  revalidatePath("/forms");
  revalidatePath("/handovers/new");
  return created;
}

export async function updateFormQuestion(
  questionId: string,
  input: {
    key: string;
    label: string;
    type: string;
    required: boolean;
    helpText?: string | null;
    options?: string[] | null;
  }
) {
  await requireAdminSession();
  const validated = validateQuestionInput(input);

  const [current] = await db
    .select({
      id: formTemplateQuestions.id,
      templateId: formTemplateQuestions.templateId,
    })
    .from(formTemplateQuestions)
    .where(eq(formTemplateQuestions.id, questionId))
    .limit(1);
  if (!current) throw new Error("Question not found");

  const [existing] = await db
    .select({ id: formTemplateQuestions.id })
    .from(formTemplateQuestions)
    .where(
      and(
        eq(formTemplateQuestions.templateId, current.templateId),
        eq(formTemplateQuestions.key, validated.key),
        sql`${formTemplateQuestions.id} <> ${questionId}`
      )
    )
    .limit(1);
  if (existing) {
    throw new Error("Question key already exists in this form");
  }

  await db
    .update(formTemplateQuestions)
    .set({
      key: validated.key,
      label: validated.label,
      type: validated.type,
      required: validated.required,
      helpText: validated.helpText,
      optionsJson: validated.options,
    })
    .where(eq(formTemplateQuestions.id, questionId));

  await touchTemplate(current.templateId);

  revalidatePath("/forms");
  revalidatePath("/handovers/new");
}

export async function deleteFormQuestion(questionId: string) {
  await requireAdminSession();
  const [current] = await db
    .select({
      id: formTemplateQuestions.id,
      templateId: formTemplateQuestions.templateId,
      position: formTemplateQuestions.position,
    })
    .from(formTemplateQuestions)
    .where(eq(formTemplateQuestions.id, questionId))
    .limit(1);
  if (!current) throw new Error("Question not found");

  await db.delete(formTemplateQuestions).where(eq(formTemplateQuestions.id, questionId));

  const remaining = await db
    .select({ id: formTemplateQuestions.id })
    .from(formTemplateQuestions)
    .where(eq(formTemplateQuestions.templateId, current.templateId))
    .orderBy(asc(formTemplateQuestions.position));

  for (const [index, question] of remaining.entries()) {
    await db
      .update(formTemplateQuestions)
      .set({ position: index })
      .where(eq(formTemplateQuestions.id, question.id));
  }

  await touchTemplate(current.templateId);

  revalidatePath("/forms");
  revalidatePath("/handovers/new");
}

export async function reorderFormQuestions(templateId: string, questionIds: string[]) {
  await requireAdminSession();
  if (questionIds.length === 0) return;

  const existing = await db
    .select({ id: formTemplateQuestions.id })
    .from(formTemplateQuestions)
    .where(
      and(
        eq(formTemplateQuestions.templateId, templateId),
        inArray(formTemplateQuestions.id, questionIds)
      )
    );

  if (existing.length !== questionIds.length) {
    throw new Error("Invalid question order payload");
  }

  for (const [index, id] of questionIds.entries()) {
    await db
      .update(formTemplateQuestions)
      .set({ position: index })
      .where(eq(formTemplateQuestions.id, id));
  }

  await touchTemplate(templateId);

  revalidatePath("/forms");
}

export async function saveFormQuestionChanges(
  templateId: string,
  hasQuestionChanges: boolean
) {
  await requireAdminSession();

  const [template] = await db
    .select({
      id: formTemplates.id,
      isDraft: formTemplates.isDraft,
    })
    .from(formTemplates)
    .where(eq(formTemplates.id, templateId))
    .limit(1);
  if (!template) throw new Error("Form not found");

  if (template.isDraft) {
    // First publish keeps V1.
    await db
      .update(formTemplates)
      .set({
        isDraft: false,
        updatedAt: new Date(),
      })
      .where(eq(formTemplates.id, templateId));
  } else if (hasQuestionChanges) {
    // Existing published form edited: single version bump.
    await bumpTemplateVersion(templateId);
  } else {
    await touchTemplate(templateId);
  }

  revalidatePath("/forms");
  revalidatePath("/handovers/new");
}

