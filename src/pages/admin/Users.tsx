import { useEffect, useState } from "react";
import { api, ApiUser } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, Trash2, Check, X } from "lucide-react";

export default function Users() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api.users.list()
      .then(setUsers)
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAdd = async () => {
    if (!email.trim() || !password.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await api.users.create(email.trim(), password);
      setUsers((prev) => [...prev, created]);
      setEmail("");
      setPassword("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.users.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Access Control</p>
            <h1 className="text-2xl font-bold text-foreground">Users</h1>
          </div>
          {!adding && (
            <button
              onClick={() => { setAdding(true); setError(""); }}
              className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} /> Add User
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">
            {error}
          </div>
        )}

        <div className="border border-border-subtle overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-chassis">
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Email</th>
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Role</th>
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Created</th>
                <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                    Loading…
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-chassis/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border border-primary/30 text-primary bg-primary/5">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono-tech text-[11px] text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {confirmId === u.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={deletingId === u.id}
                            className="px-3 py-1.5 text-xs bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {deletingId === u.id ? "…" : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="px-3 py-1.5 text-xs border border-border-subtle text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(u.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:border-red-500/40 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {adding && (
                <tr className="bg-primary/5 border-t-2 border-primary/20">
                  <td className="px-4 py-2">
                    <input
                      type="email"
                      value={email}
                      placeholder="user@example.com"
                      onChange={(e) => setEmail(e.target.value)}
                      className="field-input w-full"
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-2" colSpan={2}>
                    <input
                      type="password"
                      value={password}
                      placeholder="Password (min 8 chars)"
                      onChange={(e) => setPassword(e.target.value)}
                      className="field-input w-full"
                      onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleAdd}
                        disabled={saving || !email.trim() || !password.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <Check size={11} /> Add
                      </button>
                      <button
                        onClick={() => { setAdding(false); setEmail(""); setPassword(""); }}
                        className="flex items-center gap-1 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X size={11} /> Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mt-4">
          {users.length} {users.length === 1 ? "user" : "users"} · all users have admin access
        </p>
      </div>
    </AdminLayout>
  );
}
