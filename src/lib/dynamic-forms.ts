export const DYNAMIC_QUESTION_TYPES = [
  "text",
  "textarea",
  "boolean",
  "single_select",
  "multi_select",
  "number",
  "date",
  "photo",
  "signature",
] as const;

export type DynamicQuestionType = (typeof DYNAMIC_QUESTION_TYPES)[number];

export type DynamicAnswerValue =
  | string
  | number
  | boolean
  | string[]
  | null;

export interface DynamicFormTemplateQuestion {
  id: string;
  templateId: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  helpText: string | null;
  optionsJson: string[] | null;
  position: number;
}

export interface DynamicFormTemplateSummary {
  id: string;
  name: string;
  version: number;
  isDraft: boolean;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DynamicFormTemplateDetails extends DynamicFormTemplateSummary {
  questions: DynamicFormTemplateQuestion[];
}

export interface DynamicTemplateResponseInput {
  questionId: string;
  questionKey: string;
  questionLabel: string;
  questionType: string;
  value: DynamicAnswerValue;
}

export function isDynamicQuestionType(value: string): value is DynamicQuestionType {
  return DYNAMIC_QUESTION_TYPES.includes(value as DynamicQuestionType);
}
