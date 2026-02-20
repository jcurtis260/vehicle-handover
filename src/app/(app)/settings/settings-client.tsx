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
  Loader2,
  Shield,
  User,
  Pencil,
  X,
  Check,
} from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  canEdit: boolean;
  canDelete: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export function SettingsClient({
  initialUsers,
}: {
  initialUsers: UserItem[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Add user form state
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "user">("user");
  const [addError, setAddError] = useState("");

  // Edit user form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [editPassword, setEditPassword] = useState("");
  const [editCanEdit, setEditCanEdit] = useState(false);
  const [editCanDelete, setEditCanDelete] = useState(false);
  const [editError, setEditError] = useState("");

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
        setUsers((prev) => [...prev, { ...user, canEdit: false, canDelete: false, lastLoginAt: null, createdAt: new Date() }]);
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

  function startEdit(user: UserItem) {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role as "admin" | "user");
    setEditPassword("");
    setEditCanEdit(user.canEdit);
    setEditCanDelete(user.canDelete);
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  function handleSaveEdit(userId: string) {
    setEditError("");

    startTransition(async () => {
      try {
        const current = users.find((u) => u.id === userId);
        const updates: {
          name?: string;
          email?: string;
          role?: "admin" | "user";
          password?: string;
          canEdit?: boolean;
          canDelete?: boolean;
        } = {};

        if (editName !== current?.name) updates.name = editName;
        if (editEmail !== current?.email) updates.email = editEmail;
        if (editRole !== current?.role) updates.role = editRole;
        if (editPassword) updates.password = editPassword;
        if (editCanEdit !== current?.canEdit) updates.canEdit = editCanEdit;
        if (editCanDelete !== current?.canDelete) updates.canDelete = editCanDelete;

        if (Object.keys(updates).length > 0) {
          await updateUser(userId, updates);
          setUsers((prev) =>
            prev.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    name: editName || u.name,
                    email: editEmail || u.email,
                    role: editRole || u.role,
                    canEdit: editCanEdit,
                    canDelete: editCanDelete,
                  }
                : u
            )
          );
        }

        setEditingId(null);
      } catch (err) {
        setEditError(
          err instanceof Error ? err.message : "Failed to update user"
        );
      }
    });
  }

  function handleDelete(userId: string, userName: string) {
    if (
      !confirm(
        `Are you sure you want to delete "${userName}"? This will also delete all their handovers and photos.`
      )
    )
      return;

    startTransition(async () => {
      try {
        await deleteUser(userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete user");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button onClick={() => setShowAdd(!showAdd)} className="min-h-[44px]">
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
              <Button variant="outline" onClick={() => setShowAdd(false)}>
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
          <CardTitle className="text-lg">Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded-lg border border-border overflow-hidden"
              >
                {editingId === user.id ? (
                  // Edit mode
                  <div className="p-4 space-y-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Edit User</h4>
                      <button
                        onClick={cancelEdit}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {editError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                        {editError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Name
                        </label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Email
                        </label>
                        <Input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          New Password (leave blank to keep current)
                        </label>
                        <Input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Leave blank to keep current"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Role
                        </label>
                        <select
                          value={editRole}
                          onChange={(e) =>
                            setEditRole(e.target.value as "admin" | "user")
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>

                    {editRole !== "admin" && (
                      <div className="rounded-lg border border-border p-3 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Permissions
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={editCanEdit}
                              onChange={(e) => setEditCanEdit(e.target.checked)}
                              className="h-4 w-4 rounded border-border text-primary accent-primary"
                            />
                            <span className="text-sm">Can edit reports</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={editCanDelete}
                              onChange={(e) => setEditCanDelete(e.target.checked)}
                              className="h-4 w-4 rounded border-border text-primary accent-primary"
                            />
                            <span className="text-sm">Can delete reports</span>
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Admins always have full access. These only apply to standard users.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(user.id)}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                        {user.role === "admin" ? (
                          <Shield className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{user.name}</p>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "secondary"
                            }
                          >
                            {user.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {user.role !== "admin" && (user.canEdit || user.canDelete) && (
                            <>
                              {user.canEdit && (
                                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                  Can Edit
                                </span>
                              )}
                              {user.canDelete && (
                                <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                                  Can Delete
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last login:{" "}
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Never"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-12 sm:ml-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(user)}
                        className="h-8"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user.id, user.name)}
                        className="h-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
