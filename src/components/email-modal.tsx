"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, X, Loader2 } from "lucide-react";

export function EmailModal({ handoverId }: { handoverId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!email) return;
    setSending(true);
    setError("");

    try {
      const res = await fetch(`/handovers/${handoverId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email }),
      });

      if (!res.ok) {
        let message = "Failed to send";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          // Response wasn't JSON
        }
        throw new Error(message);
      }

      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setEmail("");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="min-h-[44px]"
      >
        <Mail className="h-4 w-4 mr-2" />
        Email Report
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Email Handover Report</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {sent ? (
              <div className="text-center py-6">
                <Mail className="h-10 w-10 text-success mx-auto mb-2" />
                <p className="font-medium">Email sent successfully!</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Recipient Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    required
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSend} disabled={sending || !email}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
