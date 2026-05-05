"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FORM_TEMPLATE_PRESETS,
  type FormTemplatePreset,
} from "@/lib/form-template-presets";
import {
  addFormQuestion,
  createFormTemplate,
  deleteFormQuestion,
  deleteFormTemplate,
  reorderFormQuestions,
  saveFormQuestionChanges,
  updateFormQuestion,
  updateFormTemplate,
} from "@/lib/actions/form-templates";
import {
  DYNAMIC_QUESTION_TYPES,
  type DynamicFormTemplateDetails,
} from "@/lib/dynamic-forms";
import {
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

interface Props {
  initialTemplates: DynamicFormTemplateDetails[];
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: "Short text",
  textarea: "Long text",
  boolean: "Yes/No",
  single_select: "Single select",
  multi_select: "Multi select",
  number: "Number",
  date: "Date",
  photo: "Photo",
  signature: "Signature",
};

export function FormBuilderClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);
  const [showCreateFormModal, setShowCreateFormModal] = useState(false);
  const [createMode, setCreateMode] = useState<"blank" | "template" | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateActive, setNewTemplateActive] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingTemplateDescription, setEditingTemplateDescription] = useState("");
  const [editingTemplateActive, setEditingTemplateActive] = useState(true);

  const [questionEditorTemplateId, setQuestionEditorTemplateId] = useState<string | null>(
    null
  );
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionKey, setQuestionKey] = useState("");
  const [questionLabel, setQuestionLabel] = useState("");
  const [questionType, setQuestionType] = useState<(typeof DYNAMIC_QUESTION_TYPES)[number]>(
    "text"
  );
  const [questionRequired, setQuestionRequired] = useState(false);
  const [questionHelpText, setQuestionHelpText] = useState("");
  const [questionOptionsCsv, setQuestionOptionsCsv] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [questionEditTemplateId, setQuestionEditTemplateId] = useState<string | null>(null);
  const [questionChangesByTemplate, setQuestionChangesByTemplate] = useState<
    Record<string, boolean>
  >({});
  const [questionFieldErrors, setQuestionFieldErrors] = useState<{
    key?: string;
    label?: string;
    options?: string;
  }>({});
  const [dragTemplateId, setDragTemplateId] = useState<string | null>(null);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const templateCountLabel = useMemo(
    () => `${templates.length} form${templates.length === 1 ? "" : "s"}`,
    [templates.length]
  );
  const selectedPreset = useMemo(
    () => FORM_TEMPLATE_PRESETS.find((preset) => preset.id === selectedPresetId) ?? null,
    [selectedPresetId]
  );

  function parseOptionsCsv(raw: string) {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function resetQuestionEditor() {
    setQuestionEditorTemplateId(null);
    setEditingQuestionId(null);
    setQuestionKey("");
    setQuestionLabel("");
    setQuestionType("text");
    setQuestionRequired(false);
    setQuestionHelpText("");
    setQuestionOptionsCsv("");
    setQuestionError("");
    setQuestionFieldErrors({});
  }

  function startTemplateEdit(template: DynamicFormTemplateDetails) {
    setEditingTemplateId(template.id);
    setEditingTemplateName(template.name);
    setEditingTemplateDescription(template.description || "");
    setEditingTemplateActive(template.isActive);
    setTemplateError("");
  }

  function startFullTemplateEdit(template: DynamicFormTemplateDetails) {
    startTemplateEdit(template);
    enterQuestionEditMode(template.id);
  }

  function startQuestionEdit(templateId: string, question: DynamicFormTemplateDetails["questions"][number]) {
    setQuestionEditorTemplateId(templateId);
    setEditingQuestionId(question.id);
    setQuestionKey(question.key);
    setQuestionLabel(question.label);
    setQuestionType(
      DYNAMIC_QUESTION_TYPES.includes(question.type as (typeof DYNAMIC_QUESTION_TYPES)[number])
        ? (question.type as (typeof DYNAMIC_QUESTION_TYPES)[number])
        : "text"
    );
    setQuestionRequired(question.required);
    setQuestionHelpText(question.helpText || "");
    setQuestionOptionsCsv((question.optionsJson || []).join(", "));
    setQuestionError("");
    setQuestionFieldErrors({});
  }

  function closeCreateFormModal() {
    setShowCreateFormModal(false);
    setCreateMode(null);
    setSelectedPresetId("");
    setNewTemplateName("");
    setNewTemplateDescription("");
    setNewTemplateActive(true);
  }

  function handleCreateTemplate(selectedPresetInput: FormTemplatePreset | null) {
    if (!newTemplateName.trim()) return;
    setTemplateError("");
    startTransition(async () => {
      try {
        const created = await createFormTemplate({
          name: newTemplateName,
          description: newTemplateDescription,
          isActive: newTemplateActive,
        });

        const createdQuestions: DynamicFormTemplateDetails["questions"] = [];
        if (selectedPresetInput) {
          for (const presetQuestion of selectedPresetInput.questions) {
            const question = await addFormQuestion(created.id, {
              key: presetQuestion.key,
              label: presetQuestion.label,
              type: presetQuestion.type,
              required: presetQuestion.required,
              helpText: presetQuestion.helpText ?? null,
              options: presetQuestion.options ?? null,
            });
            createdQuestions.push(question);
          }
        }

        // Publish immediately after create so "Active" forms appear in New Handover
        // without requiring an extra edit/save step. Initial publish remains V1.
        await saveFormQuestionChanges(created.id, false);

        setTemplates((prev) =>
          [...prev, { ...created, isDraft: false, questions: createdQuestions }].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
        closeCreateFormModal();
        setOpenTemplateId(created.id);
      } catch (error) {
        setTemplateError(error instanceof Error ? error.message : "Failed to create form");
      }
    });
  }

  function cancelFullTemplateEdit(templateId: string) {
    setEditingTemplateId(null);
    if (questionEditTemplateId === templateId) {
      exitQuestionEditMode();
    }
  }

  function saveFullTemplateEdit(templateId: string) {
    const hasQuestionChanges = questionChangesByTemplate[templateId] === true;
    setTemplateError("");
    setQuestionError("");

    startTransition(async () => {
      try {
        await updateFormTemplate(templateId, {
          name: editingTemplateName,
          description: editingTemplateDescription,
          isActive: editingTemplateActive,
        });
        await saveFormQuestionChanges(templateId, hasQuestionChanges);

        setTemplates((prev) =>
          prev.map((item) => {
            if (item.id !== templateId) return item;
            const base = {
              ...item,
              name: editingTemplateName.trim(),
              description: editingTemplateDescription.trim() || null,
              isActive: editingTemplateActive,
              updatedAt: new Date(),
            };
            if (item.isDraft) {
              return {
                ...base,
                isDraft: false,
              };
            }
            if (hasQuestionChanges) {
              return {
                ...base,
                version: item.version + 1,
              };
            }
            return base;
          })
        );

        setQuestionChangesByTemplate((prev) => ({ ...prev, [templateId]: false }));
        cancelFullTemplateEdit(templateId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save form";
        setTemplateError(message);
        setQuestionError(message);
      }
    });
  }

  function handleDeleteTemplate(templateId: string, name: string) {
    if (!confirm(`Delete form "${name}"?`)) return;
    setTemplateError("");
    startTransition(async () => {
      try {
        const result = await deleteFormTemplate(templateId, {
          submissionHandling: "block",
        });

        if (!result.ok && "requiresDecision" in result && result.requiresDecision) {
          const keepSubmitted = confirm(
            `"${name}" has ${result.submissionCount} submitted form${
              result.submissionCount === 1 ? "" : "s"
            }.\n\nPress OK to keep submitted forms and delete only the template.\nPress Cancel to choose whether to delete submitted forms as well.`
          );

          if (keepSubmitted) {
            const keepResult = await deleteFormTemplate(templateId, {
              submissionHandling: "keep_submissions",
            });
            if (!keepResult.ok) {
              setTemplateError(
                "error" in keepResult
                  ? keepResult.error
                  : "Failed to delete form"
              );
              return;
            }
          } else {
            const deleteSubmitted = confirm(
              `Delete template "${name}" and all ${result.submissionCount} submitted form${
                result.submissionCount === 1 ? "" : "s"
              }?\n\nThis permanently deletes related reports and photos. Press Cancel to abort.`
            );

            if (!deleteSubmitted) {
              setTemplateError("Delete cancelled.");
              return;
            }

            const deleteResult = await deleteFormTemplate(templateId, {
              submissionHandling: "delete_submissions",
            });
            if (!deleteResult.ok) {
              setTemplateError(
                "error" in deleteResult
                  ? deleteResult.error
                  : "Failed to delete form"
              );
              return;
            }
          }
        } else if (!result.ok) {
          setTemplateError(
            "error" in result ? result.error : "Failed to delete form"
          );
          return;
        }

        setTemplates((prev) => prev.filter((template) => template.id !== templateId));
        if (openTemplateId === templateId) setOpenTemplateId(null);
      } catch (error) {
        setTemplateError(error instanceof Error ? error.message : "Failed to delete form");
      }
    });
  }

  function handleSaveQuestion(templateId: string) {
    if (questionEditTemplateId !== templateId) return;
    const nextFieldErrors: {
      key?: string;
      label?: string;
      options?: string;
    } = {};
    if (!questionKey.trim()) nextFieldErrors.key = "Question key is required.";
    if (!questionLabel.trim()) nextFieldErrors.label = "Label is required.";

    const options = parseOptionsCsv(questionOptionsCsv);
    if (
      (questionType === "single_select" || questionType === "multi_select") &&
      options.length < 2
    ) {
      nextFieldErrors.options = "Enter at least 2 options.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setQuestionFieldErrors(nextFieldErrors);
      setQuestionError("Please fill in the required fields.");
      return;
    }

    setQuestionFieldErrors({});
    setQuestionError("");

    startTransition(async () => {
      try {
        if (editingQuestionId) {
          await updateFormQuestion(editingQuestionId, {
            key: questionKey,
            label: questionLabel,
            type: questionType,
            required: questionRequired,
            helpText: questionHelpText,
            options,
          });
          setTemplates((prev) =>
            prev.map((template) =>
              template.id !== templateId
                ? template
                : {
                    ...template,
                    questions: template.questions.map((question) =>
                      question.id === editingQuestionId
                        ? {
                            ...question,
                            key: questionKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_"),
                            label: questionLabel.trim(),
                            type: questionType,
                            required: questionRequired,
                            helpText: questionHelpText.trim() || null,
                            optionsJson:
                              questionType === "single_select" || questionType === "multi_select"
                                ? options
                                : null,
                          }
                        : question
                    ),
                  }
            )
          );
          setQuestionChangesByTemplate((prev) => ({ ...prev, [templateId]: true }));
        } else {
          const created = await addFormQuestion(templateId, {
            key: questionKey,
            label: questionLabel,
            type: questionType,
            required: questionRequired,
            helpText: questionHelpText,
            options,
          });
          setTemplates((prev) =>
            prev.map((template) =>
              template.id === templateId
                ? {
                    ...template,
                    questions: [...template.questions, created].sort(
                      (a, b) => a.position - b.position
                    ),
                  }
                : template
            )
          );
          setQuestionChangesByTemplate((prev) => ({ ...prev, [templateId]: true }));
        }
        resetQuestionEditor();
      } catch (error) {
        setQuestionError(error instanceof Error ? error.message : "Failed to save question");
      }
    });
  }

  function handleDeleteQuestion(templateId: string, questionId: string, label: string) {
    if (questionEditTemplateId !== templateId) return;
    if (!confirm(`Delete question "${label}"?`)) return;
    setQuestionError("");
    startTransition(async () => {
      try {
        await deleteFormQuestion(questionId);
        setTemplates((prev) =>
          prev.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  questions: template.questions
                    .filter((question) => question.id !== questionId)
                    .map((question, index) => ({ ...question, position: index })),
                }
              : template
          )
        );
        setQuestionChangesByTemplate((prev) => ({ ...prev, [templateId]: true }));
        if (editingQuestionId === questionId) resetQuestionEditor();
      } catch (error) {
        setQuestionError(error instanceof Error ? error.message : "Failed to delete question");
      }
    });
  }

  function reorderQuestionsById(
    templateId: string,
    sourceQuestionId: string,
    targetQuestionId: string
  ) {
    if (questionEditTemplateId !== templateId) return;
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    const currentIndex = template.questions.findIndex(
      (question) => question.id === sourceQuestionId
    );
    const targetIndex = template.questions.findIndex(
      (question) => question.id === targetQuestionId
    );
    if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) return;

    const reordered = template.questions.slice();
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const ids = reordered.map((question) => question.id);

    setTemplates((prev) =>
      prev.map((item) =>
        item.id === templateId
          ? {
              ...item,
              questions: reordered.map((question, index) => ({
                ...question,
                position: index,
              })),
            }
          : item
      )
    );

    startTransition(async () => {
      try {
        await reorderFormQuestions(templateId, ids);
        setQuestionChangesByTemplate((prev) => ({ ...prev, [templateId]: true }));
      } catch (error) {
        setQuestionError(error instanceof Error ? error.message : "Failed to reorder questions");
      }
    });
  }

  function handleQuestionDragStart(templateId: string, questionId: string) {
    if (questionEditTemplateId !== templateId) return;
    setDragTemplateId(templateId);
    setDraggedQuestionId(questionId);
    setDragOverQuestionId(questionId);
  }

  function handleQuestionDrop(templateId: string, targetQuestionId: string) {
    if (questionEditTemplateId !== templateId) return;
    if (!draggedQuestionId || !dragTemplateId) return;
    if (dragTemplateId !== templateId) {
      setDragTemplateId(null);
      setDraggedQuestionId(null);
      setDragOverQuestionId(null);
      return;
    }
    reorderQuestionsById(templateId, draggedQuestionId, targetQuestionId);
    setDragTemplateId(null);
    setDraggedQuestionId(null);
    setDragOverQuestionId(null);
  }

  function enterQuestionEditMode(templateId: string) {
    setQuestionEditTemplateId(templateId);
    setQuestionChangesByTemplate((prev) => ({
      ...prev,
      [templateId]: prev[templateId] ?? false,
    }));
    setQuestionError("");
  }

  function exitQuestionEditMode() {
    setQuestionEditTemplateId(null);
    resetQuestionEditor();
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Form Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage dynamic handover forms and their questions. ({templateCountLabel})
          </p>
        </div>
        <Button onClick={() => setShowCreateFormModal(true)} className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-2" />
          Add Form
        </Button>
      </div>

      {(templateError || questionError) && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {templateError || questionError}
        </div>
      )}

      {showCreateFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Create Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Start from</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode("blank");
                      setSelectedPresetId("");
                      setNewTemplateName("");
                      setNewTemplateDescription("");
                    }}
                    className={cn(
                      "rounded-md border p-3 text-left text-sm",
                      createMode === "blank"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-medium">Blank Form</p>
                    <p className="text-muted-foreground mt-1">
                      Start from scratch and add your own questions.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const firstPreset = FORM_TEMPLATE_PRESETS[0];
                      setCreateMode("template");
                      setSelectedPresetId(firstPreset.id);
                      setNewTemplateName(firstPreset.name);
                      setNewTemplateDescription(firstPreset.description);
                    }}
                    className={cn(
                      "rounded-md border p-3 text-left text-sm",
                      createMode === "template"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-medium">Template</p>
                    <p className="text-muted-foreground mt-1">
                      Pick a vehicle handover template and auto-fill questions.
                    </p>
                  </button>
                </div>
              </div>

              {createMode === "template" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template library</label>
                  <select
                    value={selectedPresetId}
                    onChange={(event) => {
                      const preset = FORM_TEMPLATE_PRESETS.find(
                        (item) => item.id === event.target.value
                      );
                      setSelectedPresetId(event.target.value);
                      if (preset) {
                        setNewTemplateName(preset.name);
                        setNewTemplateDescription(preset.description);
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                  >
                    {FORM_TEMPLATE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} ({preset.questions.length} questions)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                value={newTemplateName}
                onChange={(event) => setNewTemplateName(event.target.value)}
                placeholder="Form name"
              />
              <textarea
                value={newTemplateDescription}
                onChange={(event) => setNewTemplateDescription(event.target.value)}
                rows={3}
                placeholder="Description (optional)"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
              />
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newTemplateActive}
                  onChange={(event) => setNewTemplateActive(event.target.checked)}
                  className="rounded"
                />
                Active (visible in New Handover)
              </label>

              {createMode === "template" && selectedPreset && (
                <p className="text-xs text-muted-foreground">
                  This template will add {selectedPreset.questions.length} starter questions.
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeCreateFormModal} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    handleCreateTemplate(createMode === "template" ? selectedPreset : null)
                  }
                  disabled={
                    isPending ||
                    !createMode ||
                    !newTemplateName.trim() ||
                    (createMode === "template" && !selectedPreset)
                  }
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {templates.map((template) => {
          const isOpen = openTemplateId === template.id;
          const isEditingTemplate = editingTemplateId === template.id;
          const isQuestionEditorForTemplate = questionEditorTemplateId === template.id;
          const isQuestionEditMode = questionEditTemplateId === template.id;
          const hasQuestionChanges = questionChangesByTemplate[template.id] === true;
          return (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenTemplateId(isOpen ? null : template.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        V{template.version}
                        {template.isDraft ? " Draft" : ""}
                        {" - "}
                        {template.isActive ? "Active" : "Inactive"} - {template.questions.length} question
                        {template.questions.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {isQuestionEditMode ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => saveFullTemplateEdit(template.id)}
                          disabled={isPending}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelFullTemplateEdit(template.id)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startFullTemplateEdit(template)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="space-y-4">
                  {isEditingTemplate && (
                    <div className="rounded-lg border border-border p-3 space-y-3">
                      <Input
                        value={editingTemplateName}
                        onChange={(event) => setEditingTemplateName(event.target.value)}
                        placeholder="Form name"
                      />
                      <textarea
                        value={editingTemplateDescription}
                        onChange={(event) =>
                          setEditingTemplateDescription(event.target.value)
                        }
                        rows={3}
                        placeholder="Description (optional)"
                        className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                      />
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editingTemplateActive}
                          onChange={(event) => setEditingTemplateActive(event.target.checked)}
                          className="rounded"
                        />
                        Active (visible in New Handover)
                      </label>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Questions</h3>
                    <div className="flex items-center gap-2">
                      {isQuestionEditMode && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setQuestionEditorTemplateId(template.id);
                              setEditingQuestionId(null);
                              setQuestionKey("");
                              setQuestionLabel("");
                              setQuestionType("text");
                              setQuestionRequired(false);
                              setQuestionHelpText("");
                              setQuestionOptionsCsv("");
                              setQuestionError("");
                              setQuestionFieldErrors({});
                            }}
                            disabled={isPending}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Question
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isQuestionEditMode
                      ? "Drag questions by the handle to reorder, then click Save Form once to publish the next version."
                      : "Question edits are locked. Click Edit at the top to edit this form and its questions."}
                    {hasQuestionChanges ? " Unsaved question changes." : ""}
                  </p>

                  {template.questions.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No questions yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {template.questions
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .map((question) => (
                          <div
                            key={question.id}
                            draggable={isQuestionEditMode}
                            onDragStart={() =>
                              handleQuestionDragStart(template.id, question.id)
                            }
                            onDragOver={(event) => {
                              event.preventDefault();
                              if (dragTemplateId === template.id) {
                                setDragOverQuestionId(question.id);
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              handleQuestionDrop(template.id, question.id);
                            }}
                            onDragEnd={() => {
                              setDragTemplateId(null);
                              setDraggedQuestionId(null);
                              setDragOverQuestionId(null);
                            }}
                            className={`rounded-md border p-3 space-y-2 ${
                              dragOverQuestionId === question.id
                                ? "border-primary bg-primary/5"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <div
                                  className="mt-0.5 cursor-grab text-muted-foreground"
                                  title="Drag to reorder"
                                  aria-label="Drag to reorder"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <div>
                                <p className="font-medium text-sm">{question.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  key: {question.key} - type:{" "}
                                  {QUESTION_TYPE_LABELS[question.type] || question.type}{" "}
                                  {question.required ? "(required)" : ""}
                                </p>
                                {question.helpText && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {question.helpText}
                                  </p>
                                )}
                                {(question.type === "single_select" ||
                                  question.type === "multi_select") &&
                                  question.optionsJson &&
                                  question.optionsJson.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Options: {question.optionsJson.join(", ")}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isQuestionEditMode && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startQuestionEdit(template.id, question)}
                                  >
                                    <Pencil className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() =>
                                      handleDeleteQuestion(
                                        template.id,
                                        question.id,
                                        question.label
                                      )
                                    }
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {isQuestionEditorForTemplate && isQuestionEditMode && (
                    <div className="rounded-lg border border-border p-3 space-y-3">
                      <h4 className="font-semibold text-sm">
                        {editingQuestionId ? "Edit Question" : "Add Question"}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Question Key</label>
                          <Input
                            value={questionKey}
                            onChange={(event) => {
                              setQuestionKey(event.target.value);
                              setQuestionFieldErrors((prev) => ({ ...prev, key: undefined }));
                            }}
                            placeholder="e.g. customer_name"
                            className={cn(
                              questionFieldErrors.key &&
                                "border-destructive ring-1 ring-destructive/30"
                            )}
                          />
                          {questionFieldErrors.key && (
                            <p className="text-xs text-destructive">{questionFieldErrors.key}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Internal ID used by the system (not shown to customers). Keep this short,
                            unique, and stable.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Label</label>
                          <Input
                            value={questionLabel}
                            onChange={(event) => {
                              setQuestionLabel(event.target.value);
                              setQuestionFieldErrors((prev) => ({ ...prev, label: undefined }));
                            }}
                            placeholder="e.g. Customer full name"
                            className={cn(
                              questionFieldErrors.label &&
                                "border-destructive ring-1 ring-destructive/30"
                            )}
                          />
                          {questionFieldErrors.label && (
                            <p className="text-xs text-destructive">{questionFieldErrors.label}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            This is the customer-facing question text shown on the handover form.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Type</label>
                          <select
                            value={questionType}
                            onChange={(event) =>
                              setQuestionType(
                                event.target.value as (typeof DYNAMIC_QUESTION_TYPES)[number]
                              )
                            }
                            className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                          >
                            {DYNAMIC_QUESTION_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {QUESTION_TYPE_LABELS[type]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Required</label>
                          <label className="inline-flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm">
                            <input
                              type="checkbox"
                              checked={questionRequired}
                              onChange={(event) =>
                                setQuestionRequired(event.target.checked)
                              }
                              className="rounded"
                            />
                            Required on completion
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Help Text</label>
                        <Input
                          value={questionHelpText}
                          onChange={(event) => setQuestionHelpText(event.target.value)}
                          placeholder="e.g. Enter legal name exactly as on ID"
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional supporting guidance shown under the question to help the customer.
                        </p>
                      </div>
                      {(questionType === "single_select" ||
                        questionType === "multi_select") && (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Options (comma separated)
                          </label>
                          <Input
                            value={questionOptionsCsv}
                            onChange={(event) => {
                              setQuestionOptionsCsv(event.target.value);
                              setQuestionFieldErrors((prev) => ({ ...prev, options: undefined }));
                            }}
                            placeholder="Option A, Option B, Option C"
                            className={cn(
                              questionFieldErrors.options &&
                                "border-destructive ring-1 ring-destructive/30"
                            )}
                          />
                          {questionFieldErrors.options && (
                            <p className="text-xs text-destructive">
                              {questionFieldErrors.options}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={resetQuestionEditor}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleSaveQuestion(template.id)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Save Question
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
