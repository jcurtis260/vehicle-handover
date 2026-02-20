"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, Truck, ArrowRight } from "lucide-react";

export function TypeSelector() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Handover</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the type of handover to create.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/handovers/new?type=collection">
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

        <Link href="/handovers/new?type=delivery">
          <Card className="group cursor-pointer hover:border-primary hover:shadow-md transition-all h-full">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Truck className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Delivery</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Customer handover with keys, documents, V5 photo, and
                  signature.
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-primary">
                Start <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
