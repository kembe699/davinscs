import React, { useEffect, useState } from "react";
import { api, ApiUser } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "./AdminLayout";
import { Plus, Trash2, Pencil, Check, X, Shield, Key, Users as UsersIcon, ChevronDown, ChevronUp } from "lucide-react";

type Tab = "users" | "roles" | "permissions";
type EditState = { email: string; password: string };

// ── Users Tab ───────────────────────────────────────────────────────────────────────────────
function UsersTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ email: "", password: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([api.users.list(), api.roles.list()])
      .then(([u, r]) => { setUsers(u); setRoles(r); })
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (u: any) => {
    setEditId(u.id);
    setEditState({ email: u.email, password: "" });
    setConfirmId(null);
    setError("");
  };
  const cancelEdit = () => { setEditId(null); setEditState({ email: "", password: "" }); };

  const handleSaveEdit = async () => {
    if (!editState.email.trim()) return;
    setEditSaving(true);
    setError("");
    try {
      const updated = await api.users.update(editId!, editState.email.trim(), editState.password || undefined);
      setUsers(prev => prev.map(u => u.id === editId ? { ...u, ...updated } : u));
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally { setEditSaving(false); }
  };

  const handleAdd = async () => {
    if (!newEmail.trim() || !newPassword.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await api.users.create(newEmail.trim(), newPassword, newRoleId || null);
      const role = roles.find(r => r.id === newRoleId);
      setUsers(prev => [...prev, { ...created, role_name: role?.name || null }]);
      setNewEmail(""); setNewPassword(""); setNewRoleId(""); setAdding(false);
      toast("User created successfully!", "success", "Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.users.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally { setDeletingId(null); setConfirmId(null); }
  };

  const handleAssignRole = async (userId: number, roleId: number | null) => {
    setAssigningId(userId);
    try {
      await api.users.assignRole(userId, roleId);
      const role = roles.find(r => r.id === roleId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role_id: roleId, role_name: role?.name || null } : u));
      toast("Role assigned successfully!", "success", "Updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign role");
    } finally { setAssigningId(null); }
  };

  const inputCls = "w-full h-8 bg-background border border-border-subtle px-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">{users.length} {users.length === 1 ? "user" : "users"}</p>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setError(""); cancelEdit(); }}
            className="flex items-center gap-2 h-9 px-4 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            <Plus size={12} /> Add User
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">{error}</div>
      )}

      <div className="border border-border-subtle overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-chassis">
              <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Email</th>
              <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Role</th>
              <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Password</th>
              <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Created</th>
              <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">Loading…</td></tr>
            ) : users.map(u =>
              editId === u.id ? (
                <tr key={u.id} className="bg-primary/5 border-l-2 border-primary/40">
                  <td className="px-4 py-2">
                    <input type="email" value={editState.email} onChange={e => setEditState(s => ({ ...s, email: e.target.value }))} className={inputCls} autoFocus />
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{u.role_name || "—"}</td>
                  <td className="px-4 py-2">
                    <input type="password" value={editState.password} onChange={e => setEditState(s => ({ ...s, password: e.target.value }))} placeholder="Leave blank to keep" className={inputCls} onKeyDown={e => e.key === "Enter" && handleSaveEdit()} />
                  </td>
                  <td className="px-4 py-2 font-mono-tech text-[11px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={handleSaveEdit} disabled={editSaving || !editState.email.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50">
                        <Check size={11} /> {editSaving ? "…" : "Save"}
                      </button>
                      <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <X size={11} /> Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} className="hover:bg-chassis/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role_id ?? ""}
                      onChange={e => handleAssignRole(u.id, e.target.value === "" ? null : Number(e.target.value))}
                      disabled={assigningId === u.id}
                      className="h-7 px-2 bg-background border border-border-subtle text-xs text-foreground focus:outline-none focus:border-primary/60 disabled:opacity-50 min-w-[120px]"
                    >
                      <option value="">No role</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 font-mono-tech text-[11px] text-muted-foreground">••••••••</td>
                  <td className="px-4 py-3 font-mono-tech text-[11px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {confirmId === u.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDelete(u.id)} disabled={deletingId === u.id} className="px-3 py-1.5 text-xs bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">{deletingId === u.id ? "…" : "Confirm"}</button>
                          <button onClick={() => setConfirmId(null)} className="px-3 py-1.5 text-xs border border-border-subtle text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => startEdit(u)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                            <Pencil size={11} /> Edit
                          </button>
                          <button onClick={() => { setConfirmId(u.id); cancelEdit(); }} className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:border-red-500/40 hover:text-red-400 transition-colors">
                            <Trash2 size={11} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )}

            {adding && (
              <tr className="bg-primary/5 border-t-2 border-primary/20">
                <td className="px-4 py-2">
                  <input type="email" value={newEmail} placeholder="user@example.com" onChange={e => setNewEmail(e.target.value)} className={inputCls} autoFocus />
                </td>
                <td className="px-4 py-2">
                  <select value={newRoleId} onChange={e => setNewRoleId(e.target.value === "" ? "" : Number(e.target.value))} className="w-full h-8 bg-background border border-border-subtle px-2 text-xs text-foreground focus:outline-none focus:border-primary/60">
                    <option value="">No role</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input type="password" value={newPassword} placeholder="Min 8 characters" onChange={e => setNewPassword(e.target.value)} className={inputCls} onKeyDown={e => e.key === "Enter" && handleAdd()} />
                </td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={handleAdd} disabled={saving || !newEmail.trim() || !newPassword.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50">
                      <Check size={11} /> Add
                    </button>
                    <button onClick={() => { setAdding(false); setNewEmail(""); setNewPassword(""); setNewRoleId(""); }} className="flex items-center gap-1 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <X size={11} /> Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Roles Tab ─────────────────────────────────────────────────────────────────
function RolesTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [rolePerms, setRolePerms] = useState<number[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.roles.list(), api.roles.listPermissions()])
      .then(([r, p]) => { setRoles(r); setPermissions(p); })
      .catch(() => setError("Failed to load roles"))
      .finally(() => setLoading(false));
  }, []);

  const selectRole = async (id: number) => {
    setSelectedRoleId(id);
    setLoadingPerms(true);
    try {
      const r = await api.roles.get(id);
      setRolePerms((r.permissions || []).map((p: any) => p.id));
    } finally { setLoadingPerms(false); }
  };

  const togglePerm = (id: number) => {
    setRolePerms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const savePerms = async () => {
    if (!selectedRoleId) return;
    setSavingPerms(true);
    try {
      await api.roles.setPermissions(selectedRoleId, rolePerms);
      setRoles(prev => prev.map(r => r.id === selectedRoleId ? { ...r, permission_count: rolePerms.length } : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSavingPerms(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const r = await api.roles.create({ name: newName.trim(), description: newDesc.trim() || undefined });
      setRoles(prev => [...prev, r]);
      setNewName(""); setNewDesc(""); setAdding(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    try {
      const r = await api.roles.update(editId, { name: editName.trim(), description: editDesc.trim() || undefined });
      setRoles(prev => prev.map(x => x.id === editId ? { ...x, ...r } : x));
      setEditId(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.roles.delete(id);
      setRoles(prev => prev.filter(r => r.id !== id));
      if (selectedRoleId === id) { setSelectedRoleId(null); setRolePerms([]); }
      setConfirmDeleteId(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
  };

  // Group permissions by group_name
  const grouped = permissions.reduce((acc: Record<string, any[]>, p) => {
    const g = p.group_name || "General";
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});

  const inputCls = "w-full h-8 bg-background border border-border-subtle px-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60";

  if (loading) return <div className="text-xs text-muted-foreground animate-pulse py-8">Loading…</div>;

  return (
    <div className="flex gap-6">
      {/* Left: roles list */}
      <div className="w-72 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">{roles.length} roles</p>
          {!adding && (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1 h-7 px-3 bg-primary text-background text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90">
              <Plus size={10} /> New Role
            </button>
          )}
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 mb-3">{error}</div>}

        {adding && (
          <div className="border border-primary/30 bg-primary/5 p-3 mb-3 space-y-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Role name" className={inputCls} autoFocus />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className={inputCls} />
            <div className="flex gap-1">
              <button onClick={handleCreate} disabled={!newName.trim()} className="flex-1 h-7 bg-primary text-background text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50">Create</button>
              <button onClick={() => { setAdding(false); setNewName(""); setNewDesc(""); }} className="flex-1 h-7 border border-border-subtle text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {roles.map(r => (
            <div key={r.id} className={`border cursor-pointer transition-colors ${selectedRoleId === r.id ? "border-primary bg-primary/5" : "border-border-subtle hover:bg-chassis/50"}`}>
              {editId === r.id ? (
                <div className="p-2 space-y-2">
                  <input value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} autoFocus />
                  <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" className={inputCls} />
                  <div className="flex gap-1">
                    <button onClick={handleUpdate} className="flex-1 h-6 bg-primary text-background text-[9px] font-bold uppercase tracking-widest hover:bg-primary/90">Save</button>
                    <button onClick={() => setEditId(null)} className="flex-1 h-6 border border-border-subtle text-[9px] text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3" onClick={() => selectRole(r.id)}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.permission_count} permissions</p>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditId(r.id); setEditName(r.name); setEditDesc(r.description || ""); }} className="p-1 text-muted-foreground hover:text-primary"><Pencil size={11} /></button>
                    {confirmDeleteId === r.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(r.id)} className="px-1.5 py-0.5 text-[9px] bg-red-500 text-white hover:bg-red-600">Del</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="px-1.5 py-0.5 text-[9px] border border-border-subtle text-muted-foreground">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(r.id)} className="p-1 text-muted-foreground hover:text-red-400"><Trash2 size={11} /></button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: permissions assignment */}
      <div className="flex-1">
        {!selectedRoleId ? (
          <div className="text-center text-muted-foreground py-16">
            <Shield size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a role to manage its permissions</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Permissions for: <span className="text-primary">{roles.find(r => r.id === selectedRoleId)?.name}</span></h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{rolePerms.length} of {permissions.length} permissions selected</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRolePerms(permissions.map(p => p.id))} className="px-3 py-1.5 text-[10px] border border-border-subtle text-muted-foreground hover:text-foreground">Select All</button>
                <button onClick={() => setRolePerms([])} className="px-3 py-1.5 text-[10px] border border-border-subtle text-muted-foreground hover:text-foreground">Clear All</button>
                <button onClick={savePerms} disabled={savingPerms} className="px-4 py-1.5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50">
                  {savingPerms ? "Saving…" : "Save Permissions"}
                </button>
              </div>
            </div>

            {loadingPerms ? (
              <div className="text-xs text-muted-foreground animate-pulse">Loading permissions…</div>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([group, perms]) => (
                  <div key={group} className="border border-border-subtle">
                    <div className="flex items-center justify-between px-4 py-2 bg-chassis border-b border-border-subtle">
                      <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">{group}</p>
                      <button
                        onClick={() => {
                          const ids = perms.map(p => p.id);
                          const allChecked = ids.every(id => rolePerms.includes(id));
                          setRolePerms(prev => allChecked ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
                        }}
                        className="text-[9px] text-muted-foreground hover:text-primary uppercase tracking-widest"
                      >
                        {perms.every(p => rolePerms.includes(p.id)) ? "Deselect group" : "Select group"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-border-subtle">
                      {perms.map(p => (
                        <label key={p.id} className="flex items-start gap-3 p-3 bg-background cursor-pointer hover:bg-chassis/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={rolePerms.includes(p.id)}
                            onChange={() => togglePerm(p.id)}
                            className="mt-0.5 accent-primary"
                          />
                          <div>
                            <p className="text-xs font-medium text-foreground">{p.name}</p>
                            <p className="font-mono-tech text-[9px] text-muted-foreground">{p.key}</p>
                            {p.description && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{p.description}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Permissions Tab ───────────────────────────────────────────────────────────
function PermissionsTab() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.roles.listPermissions()
      .then(p => { setPermissions(p); setExpanded(new Set([...new Set(p.map((x: any) => x.group_name))])); })
      .finally(() => setLoading(false));
  }, []);

  const grouped = permissions.reduce((acc: Record<string, any[]>, p) => {
    const g = p.group_name || "General";
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});

  const toggle = (g: string) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(g) ? s.delete(g) : s.add(g);
    return s;
  });

  if (loading) return <div className="text-xs text-muted-foreground animate-pulse py-8">Loading…</div>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-4">{permissions.length} total permissions across {Object.keys(grouped).length} groups</p>
      {Object.entries(grouped).map(([group, perms]) => (
        <div key={group} className="border border-border-subtle">
          <button onClick={() => toggle(group)} className="w-full flex items-center justify-between px-4 py-3 bg-chassis hover:bg-chassis/80 transition-colors">
            <div className="flex items-center gap-3">
              <Key size={12} className="text-muted-foreground" />
              <span className="font-mono-tech text-[10px] text-foreground uppercase tracking-widest">{group}</span>
              <span className="font-mono-tech text-[9px] text-muted-foreground">({perms.length})</span>
            </div>
            {expanded.has(group) ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </button>
          {expanded.has(group) && (
            <div className="divide-y divide-border-subtle/50">
              {perms.map(p => (
                <div key={p.id} className="flex items-start gap-4 px-4 py-2.5">
                  <code className="font-mono-tech text-[10px] text-primary bg-primary/5 px-1.5 py-0.5 border border-primary/20 whitespace-nowrap">{p.key}</code>
                  <div>
                    <p className="text-xs font-medium text-foreground">{p.name}</p>
                    {p.description && <p className="text-[10px] text-muted-foreground mt-0.5">{p.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Users() {
  const [tab, setTab] = useState<Tab>("users");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users",       label: "Users",       icon: <UsersIcon size={14} /> },
    { id: "roles",       label: "Roles",       icon: <Shield size={14} /> },
    { id: "permissions", label: "Permissions", icon: <Key size={14} /> },
  ];

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8 max-w-6xl">
        <div className="mb-6">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Access Control</p>
          <h1 className="text-2xl font-bold text-foreground">Users & Permissions</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border-subtle"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "users"       && <UsersTab />}
        {tab === "roles"       && <RolesTab />}
        {tab === "permissions" && <PermissionsTab />}
      </div>
    </AdminLayout>
  );
}
