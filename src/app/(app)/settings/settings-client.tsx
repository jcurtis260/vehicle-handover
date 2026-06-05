"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createUser, deleteUser, updateUser } from "@/lib/actions/users";
import {
  addVehicleMake,
  addVehicleModel,
  deleteVehicleMake,
  deleteVehicleModel,
  renameVehicleMake,
  renameVehicleModel,
} from "@/lib/actions/vehicle-catalog";
import {
  DEFAULT_PASSWORD_MAX_AGE_DAYS,
  MAX_PASSWORD_MAX_AGE_DAYS,
  MIN_PASSWORD_MAX_AGE_DAYS,
  normalizePasswordMaxAgeDays,
} from "@/lib/password-policy";
import { saveAnalyticsWidgetSettings } from "@/lib/actions/app-settings";
import {
  DASHBOARD_WIDGET_IDS,
  DASHBOARD_WIDGET_LABELS,
  type DashboardWidgetId,
} from "@/lib/dashboard-widgets";
import {
  UserPlus,
  Trash2,
  Loader2,
  Shield,
  User,
  Pencil,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  BarChart3,
} from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  canEdit: boolean;
  canDelete: boolean;
  canViewChangelog: boolean;
  canViewAllReports: boolean;
  canEditAllReports: boolean;
  passwordChangedAt: Date | null;
  passwordMaxAgeDays: number;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface VehicleModelItem {
  id: string;
  makeId: string;
  name: string;
}

interface VehicleMakeItem {
  id: string;
  name: string;
  models: VehicleModelItem[];
}

type CatalogSortMode = "alpha" | "models_desc" | "models_asc";
const CATALOG_PREFS_KEY = "settingsVehicleCatalogPrefsV1";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordStatus(
  passwordChangedAt: Date | null,
  passwordMaxAgeDays: number
) {
  if (!passwordChangedAt) {
    return { label: "Never", expired: true };
  }

  const ageDays = Math.floor(
    (Date.now() - new Date(passwordChangedAt).getTime()) / (24 * 60 * 60 * 1000)
  );
  const maxAgeDays = normalizePasswordMaxAgeDays(passwordMaxAgeDays);
  const expired = ageDays >= maxAgeDays;
  const label = ageDays === 0 ? "Today" : `${ageDays} day${ageDays === 1 ? "" : "s"} ago`;
  return { label, expired };
}

export function SettingsClient({
  initialUsers,
  initialVehicleCatalog,
  initialAnalyticsWidgets,
}: {
  initialUsers: UserItem[];
  initialVehicleCatalog: VehicleMakeItem[];
  initialAnalyticsWidgets: DashboardWidgetId[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [usersSectionOpen, setUsersSectionOpen] = useState(false);
  const [catalogSectionOpen, setCatalogSectionOpen] = useState(false);
  const [analyticsSectionOpen, setAnalyticsSectionOpen] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<Set<DashboardWidgetId>>(
    () => new Set(initialAnalyticsWidgets)
  );
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsSaved, setAnalyticsSaved] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [vehicleCatalog, setVehicleCatalog] = useState(initialVehicleCatalog);

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
  const [editCanViewChangelog, setEditCanViewChangelog] = useState(false);
  const [editCanViewAllReports, setEditCanViewAllReports] = useState(false);
  const [editCanEditAllReports, setEditCanEditAllReports] = useState(false);
  const [editPasswordMaxAgeDays, setEditPasswordMaxAgeDays] = useState(
    DEFAULT_PASSWORD_MAX_AGE_DAYS
  );
  const [editError, setEditError] = useState("");

  // Vehicle catalog state
  const [newMakeName, setNewMakeName] = useState("");
  const [selectedMakeIdForModel, setSelectedMakeIdForModel] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [editingMakeId, setEditingMakeId] = useState<string | null>(null);
  const [editingMakeName, setEditingMakeName] = useState("");
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editingModelName, setEditingModelName] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogExactMakeId, setCatalogExactMakeId] = useState("");
  const [catalogOnlyEmptyMakes, setCatalogOnlyEmptyMakes] = useState(false);
  const [catalogSortMode, setCatalogSortMode] = useState<CatalogSortMode>("alpha");
  const [openMakeIds, setOpenMakeIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CATALOG_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        search?: string;
        exactMakeId?: string;
        onlyEmptyMakes?: boolean;
        sortMode?: CatalogSortMode;
        openMakeIds?: Record<string, boolean>;
      };
      if (typeof parsed.search === "string") setCatalogSearch(parsed.search);
      if (typeof parsed.exactMakeId === "string")
        setCatalogExactMakeId(parsed.exactMakeId);
      if (typeof parsed.onlyEmptyMakes === "boolean")
        setCatalogOnlyEmptyMakes(parsed.onlyEmptyMakes);
      if (
        parsed.sortMode === "alpha" ||
        parsed.sortMode === "models_desc" ||
        parsed.sortMode === "models_asc"
      ) {
        setCatalogSortMode(parsed.sortMode);
      }
      if (parsed.openMakeIds && typeof parsed.openMakeIds === "object") {
        setOpenMakeIds(parsed.openMakeIds);
      }
    } catch {
      // Ignore malformed localStorage payload.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        CATALOG_PREFS_KEY,
        JSON.stringify({
          search: catalogSearch,
          exactMakeId: catalogExactMakeId,
          onlyEmptyMakes: catalogOnlyEmptyMakes,
          sortMode: catalogSortMode,
          openMakeIds,
        })
      );
    } catch {
      // Ignore localStorage write failures.
    }
  }, [
    catalogSearch,
    catalogExactMakeId,
    catalogOnlyEmptyMakes,
    catalogSortMode,
    openMakeIds,
  ]);

  const filteredVehicleCatalog = useMemo(() => {
    const search = catalogSearch.trim().toLowerCase();
    const next = vehicleCatalog.filter((make) => {
      const matchesExact = !catalogExactMakeId || make.id === catalogExactMakeId;
      const matchesSearch = !search || make.name.toLowerCase().includes(search);
      const matchesEmpty = !catalogOnlyEmptyMakes || make.models.length === 0;
      return matchesExact && matchesSearch && matchesEmpty;
    });

    if (catalogSortMode === "models_desc") {
      return next.sort(
        (a, b) => b.models.length - a.models.length || a.name.localeCompare(b.name)
      );
    }

    if (catalogSortMode === "models_asc") {
      return next.sort(
        (a, b) => a.models.length - b.models.length || a.name.localeCompare(b.name)
      );
    }

    return next.sort((a, b) => a.name.localeCompare(b.name));
  }, [
    vehicleCatalog,
    catalogSearch,
    catalogExactMakeId,
    catalogOnlyEmptyMakes,
    catalogSortMode,
  ]);

  function handleAdd() {
    const name = addName.trim();
    const email = addEmail.trim().toLowerCase();

    if (!name || !email || !addPassword) {
      setAddError("Name, email, and password are required.");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setAddError("Enter a valid email address.");
      return;
    }
    if (addPassword.length < 8 || addPassword.length > 128) {
      setAddError("Password must be 8-128 characters.");
      return;
    }
    setAddError("");

    startTransition(async () => {
      try {
        const result = await createUser({
          name,
          email,
          password: addPassword,
          role: addRole,
        });
        if (!result.ok) {
          setAddError(result.error);
          return;
        }
        const user = result.user;
        setUsers((prev) => [
          ...prev,
          {
            ...user,
            canEdit: false,
            canDelete: false,
            canViewChangelog: false,
            canViewAllReports: false,
            canEditAllReports: false,
            passwordChangedAt: new Date(),
            passwordMaxAgeDays: DEFAULT_PASSWORD_MAX_AGE_DAYS,
            lastLoginAt: null,
            createdAt: new Date(),
          },
        ]);
        setShowAdd(false);
        setAddName("");
        setAddEmail("");
        setAddPassword("");
        setAddRole("user");
      } catch (err) {
        setAddError(
          "Unable to create user right now. Please try again."
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
    setEditCanViewChangelog(user.canViewChangelog);
    setEditCanViewAllReports(user.canViewAllReports);
    setEditCanEditAllReports(user.canEditAllReports);
    setEditPasswordMaxAgeDays(
      normalizePasswordMaxAgeDays(user.passwordMaxAgeDays)
    );
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
        const normalizedEditName = editName.trim();
        const normalizedEditEmail = editEmail.trim().toLowerCase();
        const updates: {
          name?: string;
          email?: string;
          role?: "admin" | "user";
          password?: string;
          canEdit?: boolean;
          canDelete?: boolean;
          canViewChangelog?: boolean;
          canViewAllReports?: boolean;
          canEditAllReports?: boolean;
          passwordMaxAgeDays?: number;
        } = {};

        if (normalizedEditName !== current?.name) updates.name = normalizedEditName;
        if (normalizedEditEmail !== current?.email) updates.email = normalizedEditEmail;
        if (editRole !== current?.role) updates.role = editRole;
        if (editPassword) updates.password = editPassword;
        if (editCanEdit !== current?.canEdit) updates.canEdit = editCanEdit;
        if (editCanDelete !== current?.canDelete) updates.canDelete = editCanDelete;
        if (editCanViewChangelog !== current?.canViewChangelog) updates.canViewChangelog = editCanViewChangelog;
        if (editCanViewAllReports !== current?.canViewAllReports) updates.canViewAllReports = editCanViewAllReports;
        if (editCanEditAllReports !== current?.canEditAllReports) updates.canEditAllReports = editCanEditAllReports;
        if (editPasswordMaxAgeDays !== current?.passwordMaxAgeDays) {
          updates.passwordMaxAgeDays = editPasswordMaxAgeDays;
        }

        if (Object.keys(updates).length > 0) {
          const passwordUpdated = Boolean(updates.password);
          await updateUser(userId, updates);
          setUsers((prev) =>
            prev.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    name: normalizedEditName || u.name,
                    email: normalizedEditEmail || u.email,
                    role: editRole || u.role,
                    canEdit: editCanEdit,
                    canDelete: editCanDelete,
                    canViewChangelog: editCanViewChangelog,
                    canViewAllReports: editCanViewAllReports,
                    canEditAllReports: editCanEditAllReports,
                    passwordChangedAt: passwordUpdated
                      ? new Date()
                      : u.passwordChangedAt,
                    passwordMaxAgeDays: editPasswordMaxAgeDays,
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

  function toggleWidget(id: DashboardWidgetId) {
    setAnalyticsSaved(false);
    setVisibleWidgets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSaveAnalytics() {
    setAnalyticsError("");
    setAnalyticsSaved(false);
    const selected = DASHBOARD_WIDGET_IDS.filter((id) => visibleWidgets.has(id));
    startTransition(async () => {
      try {
        const result = await saveAnalyticsWidgetSettings(selected);
        if (!result.ok) {
          setAnalyticsError(result.error);
          return;
        }
        setAnalyticsSaved(true);
      } catch (err) {
        setAnalyticsError(
          err instanceof Error ? err.message : "Failed to save analytics settings"
        );
      }
    });
  }

  function handleAddMake() {
    if (!newMakeName.trim()) return;
    setCatalogError("");
    startTransition(async () => {
      try {
        const created = await addVehicleMake(newMakeName);
        setVehicleCatalog((prev) =>
          [...prev, { ...created, models: [] }].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
        setNewMakeName("");
      } catch (err) {
        setCatalogError(
          err instanceof Error ? err.message : "Failed to add make"
        );
      }
    });
  }

  function handleDeleteMake(makeId: string, makeName: string) {
    if (!confirm(`Delete make "${makeName}"?`)) return;
    setCatalogError("");
    startTransition(async () => {
      try {
        await deleteVehicleMake(makeId);
        setVehicleCatalog((prev) => prev.filter((m) => m.id !== makeId));
        if (selectedMakeIdForModel === makeId) setSelectedMakeIdForModel("");
        if (catalogExactMakeId === makeId) setCatalogExactMakeId("");
        setOpenMakeIds((prev) => {
          const next = { ...prev };
          delete next[makeId];
          return next;
        });
      } catch (err) {
        setCatalogError(
          err instanceof Error ? err.message : "Failed to delete make"
        );
      }
    });
  }

  function handleStartEditMake(make: VehicleMakeItem) {
    setEditingMakeId(make.id);
    setEditingMakeName(make.name);
    setOpenMakeIds((prev) => ({ ...prev, [make.id]: true }));
  }

  function handleSaveEditMake(makeId: string) {
    if (!editingMakeName.trim()) return;
    setCatalogError("");
    startTransition(async () => {
      try {
        await renameVehicleMake(makeId, editingMakeName);
        setVehicleCatalog((prev) =>
          prev
            .map((m) =>
              m.id === makeId ? { ...m, name: editingMakeName.trim() } : m
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingMakeId(null);
        setEditingMakeName("");
      } catch (err) {
        setCatalogError(
          err instanceof Error ? err.message : "Failed to rename make"
        );
      }
    });
  }

  function handleAddModel() {
    if (!selectedMakeIdForModel || !newModelName.trim()) return;
    setCatalogError("");
    startTransition(async () => {
      try {
        const created = await addVehicleModel(selectedMakeIdForModel, newModelName);
        setVehicleCatalog((prev) =>
          prev.map((make) =>
            make.id === selectedMakeIdForModel
              ? {
                  ...make,
                  models: [...make.models, created].sort((a, b) =>
                    a.name.localeCompare(b.name)
                  ),
                }
              : make
          )
        );
        setNewModelName("");
      } catch (err) {
        setCatalogError(
          err instanceof Error ? err.message : "Failed to add model"
        );
      }
    });
  }

  function handleDeleteModel(modelId: string, modelName: string) {
    if (!confirm(`Delete model "${modelName}"?`)) return;
    setCatalogError("");
    startTransition(async () => {
      try {
        await deleteVehicleModel(modelId);
        setVehicleCatalog((prev) =>
          prev.map((make) => ({
            ...make,
            models: make.models.filter((model) => model.id !== modelId),
          }))
        );
      } catch (err) {
        setCatalogError(
          err instanceof Error ? err.message : "Failed to delete model"
        );
      }
    });
  }

  function handleStartEditModel(model: VehicleModelItem) {
    setEditingModelId(model.id);
    setEditingModelName(model.name);
    setOpenMakeIds((prev) => ({ ...prev, [model.makeId]: true }));
  }

  function handleSaveEditModel(modelId: string) {
    if (!editingModelName.trim()) return;
    setCatalogError("");
    startTransition(async () => {
      try {
        await renameVehicleModel(modelId, editingModelName);
        setVehicleCatalog((prev) =>
          prev.map((make) => ({
            ...make,
            models: make.models
              .map((model) =>
                model.id === modelId
                  ? { ...model, name: editingModelName.trim() }
                  : model
              )
              .sort((a, b) => a.name.localeCompare(b.name)),
          }))
        );
        setEditingModelId(null);
        setEditingModelName("");
      } catch (err) {
        setCatalogError(
          err instanceof Error ? err.message : "Failed to rename model"
        );
      }
    });
  }

  function toggleMakeOpen(makeId: string) {
    setOpenMakeIds((prev) => ({ ...prev, [makeId]: !prev[makeId] }));
  }

  function expandAllVisibleMakes() {
    setOpenMakeIds((prev) => {
      const next = { ...prev };
      for (const make of filteredVehicleCatalog) {
        next[make.id] = true;
      }
      return next;
    });
  }

  function collapseAllVisibleMakes() {
    setOpenMakeIds((prev) => {
      const next = { ...prev };
      for (const make of filteredVehicleCatalog) {
        next[make.id] = false;
      }
      return next;
    });
  }

  function clearCatalogFilters() {
    setCatalogSearch("");
    setCatalogExactMakeId("");
    setCatalogOnlyEmptyMakes(false);
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
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Initial password"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
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
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)} className="min-h-[44px]">
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={isPending} className="min-h-[44px]">
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
        <CardHeader className="pb-3">
          <button
            type="button"
            onClick={() => setUsersSectionOpen((prev) => !prev)}
            className="w-full flex items-center justify-between text-left"
            aria-expanded={usersSectionOpen}
            aria-controls="settings-users-section"
          >
            <CardTitle className="text-lg">Users ({users.length})</CardTitle>
            {usersSectionOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {usersSectionOpen && (
          <CardContent id="settings-users-section">
            <div className="space-y-3">
              {users.map((user) => {
                const passwordStatus = getPasswordStatus(
                  user.passwordChangedAt,
                  user.passwordMaxAgeDays
                );
                return (
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
                            autoComplete="name"
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
                            autoComplete="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
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
                            autoComplete="new-password"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
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
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Password expiry days
                          </label>
                          <Input
                            type="number"
                            min={MIN_PASSWORD_MAX_AGE_DAYS}
                            max={MAX_PASSWORD_MAX_AGE_DAYS}
                            value={editPasswordMaxAgeDays}
                            onChange={(e) =>
                              setEditPasswordMaxAgeDays(
                                normalizePasswordMaxAgeDays(
                                  Number.parseInt(e.target.value || "0", 10)
                                )
                              )
                            }
                          />
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
                          <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editCanViewChangelog}
                                onChange={(e) => setEditCanViewChangelog(e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-sm">Can view changelog</span>
                            </label>
                          </div>
                          <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editCanViewAllReports}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditCanViewAllReports(checked);
                                  if (checked) setEditCanEditAllReports(false);
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">Can view all reports (edit own only)</span>
                            </label>
                          </div>
                          <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editCanEditAllReports}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditCanEditAllReports(checked);
                                  if (checked) setEditCanViewAllReports(false);
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">Can view and edit all reports</span>
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
                            {user.role !== "admin" && (user.canEdit || user.canDelete || user.canViewAllReports || user.canEditAllReports) && (
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
                                {user.canViewChangelog && (
                                  <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                                    Changelog
                                  </span>
                                )}
                                {user.canViewAllReports && (
                                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                    View All Reports
                                  </span>
                                )}
                                {user.canEditAllReports && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                    Edit All Reports
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
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Password changed: {passwordStatus.label}
                            {passwordStatus.expired && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                Expired
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Password expires every {user.passwordMaxAgeDays} days
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
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            onClick={() => setAnalyticsSectionOpen((prev) => !prev)}
            className="w-full flex items-center justify-between text-left"
            aria-expanded={analyticsSectionOpen}
            aria-controls="settings-analytics-section"
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Dashboard Analytics ({visibleWidgets.size}/{DASHBOARD_WIDGET_IDS.length})
            </CardTitle>
            {analyticsSectionOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {analyticsSectionOpen && (
          <CardContent id="settings-analytics-section" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose which analytics widgets appear on the dashboard. This applies
              to all users. The core stats (Total, Drafts, Completed) and Recent
              Handovers are always shown.
            </p>

            {analyticsError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {analyticsError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DASHBOARD_WIDGET_IDS.map((id) => (
                <label
                  key={id}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer select-none hover:bg-accent/50"
                >
                  <input
                    type="checkbox"
                    checked={visibleWidgets.has(id)}
                    onChange={() => toggleWidget(id)}
                    className="h-4 w-4 rounded border-border text-primary accent-primary shrink-0"
                  />
                  <span>{DASHBOARD_WIDGET_LABELS[id]}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              {analyticsSaved && (
                <span className="text-sm text-success flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Saved
                </span>
              )}
              <Button
                onClick={handleSaveAnalytics}
                disabled={isPending}
                className="min-h-[44px]"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Analytics
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            onClick={() => setCatalogSectionOpen((prev) => !prev)}
            className="w-full flex items-center justify-between text-left"
            aria-expanded={catalogSectionOpen}
            aria-controls="settings-vehicle-catalog-section"
          >
            <CardTitle className="text-lg">
              Vehicle Make/Model List ({vehicleCatalog.length} makes)
            </CardTitle>
            {catalogSectionOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {catalogSectionOpen && (
          <CardContent id="settings-vehicle-catalog-section" className="space-y-4">
            {catalogError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {catalogError}
              </div>
            )}

            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px_auto] gap-2">
                <Input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search brand (e.g. Mercedes)"
                />
                <select
                  value={catalogExactMakeId}
                  onChange={(e) => setCatalogExactMakeId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="">All brands</option>
                  {vehicleCatalog
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((make) => (
                      <option key={make.id} value={make.id}>
                        {make.name}
                      </option>
                    ))}
                </select>
                <Button variant="outline" onClick={clearCatalogFilters}>
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[auto_220px_auto_auto] gap-2">
                <label className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={catalogOnlyEmptyMakes}
                    onChange={(e) => setCatalogOnlyEmptyMakes(e.target.checked)}
                    className="rounded"
                  />
                  Only brands with 0 models
                </label>
                <select
                  value={catalogSortMode}
                  onChange={(e) => setCatalogSortMode(e.target.value as CatalogSortMode)}
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="alpha">Sort: A-Z</option>
                  <option value="models_desc">Sort: Model count (high-low)</option>
                  <option value="models_asc">Sort: Model count (low-high)</option>
                </select>
                <Button variant="outline" onClick={expandAllVisibleMakes}>
                  Expand Visible
                </Button>
                <Button variant="outline" onClick={collapseAllVisibleMakes}>
                  Collapse Visible
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing {filteredVehicleCatalog.length} of {vehicleCatalog.length} brands
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <Input
                value={newMakeName}
                onChange={(e) => setNewMakeName(e.target.value)}
                placeholder="Add make (e.g. BMW)"
              />
              <Button onClick={handleAddMake} disabled={isPending}>
                Add Make
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <select
                value={selectedMakeIdForModel}
                onChange={(e) => setSelectedMakeIdForModel(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select make for new model</option>
                {vehicleCatalog.map((make) => (
                  <option key={make.id} value={make.id}>
                    {make.name}
                  </option>
                ))}
              </select>
              <Input
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="Add model (e.g. 3 Series)"
              />
              <Button onClick={handleAddModel} disabled={isPending}>
                Add Model
              </Button>
            </div>

            <div className="space-y-3">
              {filteredVehicleCatalog.map((make) => (
                <div key={make.id} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    {editingMakeId === make.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingMakeName}
                          onChange={(e) => setEditingMakeName(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveEditMake(make.id)}
                          disabled={isPending}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingMakeId(null);
                            setEditingMakeName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleMakeOpen(make.id)}
                          className="flex items-center gap-2 text-left"
                          aria-expanded={!!openMakeIds[make.id]}
                        >
                          {openMakeIds[make.id] ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <p className="font-semibold">{make.name}</p>
                          <Badge variant="secondary">{make.models.length} models</Badge>
                        </button>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartEditMake(make)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteMake(make.id, make.name)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {openMakeIds[make.id] && (
                    <div className="space-y-1">
                      {make.models.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No models yet</p>
                      ) : (
                        make.models.map((model) => (
                          <div
                            key={model.id}
                            className="flex items-center justify-between rounded-md border border-border px-2 py-1.5"
                          >
                            {editingModelId === model.id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={editingModelName}
                                  onChange={(e) => setEditingModelName(e.target.value)}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEditModel(model.id)}
                                  disabled={isPending}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingModelId(null);
                                    setEditingModelName("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm">{model.name}</span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStartEditModel(model)}
                                  >
                                    <Pencil className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteModel(model.id, model.name)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
              {filteredVehicleCatalog.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No brands match the current filters.
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
