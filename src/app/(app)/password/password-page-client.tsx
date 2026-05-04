"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { changeOwnPassword } from "@/lib/actions/users";

export function PasswordPageClient({
  userName,
  passwordExpired,
}: {
  userName: string;
  passwordExpired: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }

    startTransition(async () => {
      try {
        await changeOwnPassword({ currentPassword, newPassword });
        setSuccess("Password changed. You will now sign in again.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          void signOut({ callbackUrl: "/login" });
        }, 600);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to change password");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl px-1 sm:px-0">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordExpired && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              Your password has expired. Update it to continue using the app.
            </div>
          )}

          <p className="text-sm text-muted-foreground">Signed in as {userName}</p>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Current password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">New password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Confirm new password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Password must be 8-128 characters.
            </p>

            <div className="pt-1">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full min-h-[44px] sm:w-auto"
              >
                {isPending ? "Saving..." : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
