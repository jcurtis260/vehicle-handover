"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createUser, deleteUser, updateUser } from "@/lib/actions/users";
import {
  UserPlus,
  Trash2,
  KeyRound,
  Loader2,
  Shield,
  User,
  X,
} from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

export function SettingsClient({
  initialUsers,
}: {
  initialUsers: UserItem[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  // Add user form state
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "user">("user");
  const [addError, setAddError] = useState("");

  function handleAdd() {
    if (!addName || !addEmail || !addPassword) return;
    setAddError("");

    startTransition(async () => {
      try {
        const user = await createUser({
          name: addName,
          email: addEmail,
          password: addPassword,
          role: addRole,
        });
        setUsers((prev) => [
          ...prev,
          { ...user, createdAt: new Date() },
        ]);
        setShowAdd(false);
        setAddName("");
        setAddEmail("");
        setAddPassword("");
        setAddRole("user");
      } catch (err) {
        setAddError(
          err instanceof Error ? err.message : "Failed to create user"
        );
      }
    });
  }

  function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to remove this user?")) return;

    startTransition(async () => {
      try {
        await deleteUser(userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete user");
      }
    });
  }

  function handleResetPassword(userId: string) {
    if (!newPassword) return;

    startTransition(async () => {
      try {
        await updateUser(userId, { password: newPassword });
        setResetUserId(null);
        setNewPassword("");
        alert("Password updated successfully");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to update password");
      }
    });
  }

  function handleToggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "user" : "admin";
    startTransition(async () => {
      try {
        await updateUser(userId, { role: newRole as "admin" | "user" });
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to update role");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="min-h-[44px]"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {addError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {addError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Initial password"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={addRole}
                  onChange={(e) =>
                    setAddRole(e.target.value as "admin" | "user")
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={isPending}>
                {isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Create User
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    {user.role === "admin" ? (
                      <Shield className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-12 sm:ml-0">
                  <button
                    onClick={() => handleToggleRole(user.id, user.role)}
                    title="Toggle role"
                  >
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      className="cursor-pointer"
                    >
                      {user.role}
                    </Badge>
                  </button>

                  {resetUserId === user.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className="h-8 w-32 text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleResetPassword(user.id)}
                        disabled={isPending || !newPassword}
                        className="h-8"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setResetUserId(null);
                          setNewPassword("");
                        }}
                        className="h-8"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setResetUserId(user.id)}
                      title="Reset password"
                      className="h-8 w-8"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(user.id)}
                    title="Remove user"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
