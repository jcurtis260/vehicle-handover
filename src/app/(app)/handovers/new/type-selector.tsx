"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, ArrowRight, FileText } from "lucide-react";
import type { DynamicFormTemplateSummary } from "@/lib/dynamic-forms";

export function TypeSelector({
  dynamicTemplates,
}: {
  dynamicTemplates: DynamicFormTemplateSummary[];
}) {
  const hasDynamicTemplates = dynamicTemplates.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Handover</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the handover form to create.
        </p>
      </div>

      <div
        className={
          hasDynamicTemplates
            ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
            : "flex justify-center"
        }
      >
        <Link
          href="/handovers/new?type=collection"
          className={hasDynamicTemplates ? "" : "w-full max-w-sm"}
        >
          <Card className="group cursor-pointer hover:border-primary hover:shadow-md transition-all h-full">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ClipboardCheck className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Collection</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Full vehicle inspection check sheet with all checks, tyre info,
                  and photos.
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-primary">
                Start <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {dynamicTemplates.map((template) => (
          <Link
            key={template.id}
            href={`/handovers/new?type=dynamic&templateId=${template.id}`}
          >
            <Card className="group cursor-pointer hover:border-primary hover:shadow-md transition-all h-full">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {template.name} (V{template.version})
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.description || "Custom handover form"}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-primary">
                  Start <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
