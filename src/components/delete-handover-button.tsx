"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteHandover } from "@/lib/actions/handovers";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteHandoverButton({ handoverId }: { handoverId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteHandover(handoverId);
      router.push("/dashboard");
    } catch (err) {
      alert("Failed to delete. Please try again.");
      console.error(err);
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-destructive font-medium">Delete this handover?</span>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
          className="min-h-[44px]"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Yes, Delete
        </Button>
        <Button
          variant="outline"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="min-h-[44px]"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => setConfirming(true)}
      className="min-h-[44px] text-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Delete
    </Button>
  );
}
