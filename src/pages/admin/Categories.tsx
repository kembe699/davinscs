import { useEffect, useRef, useState } from "react";
import { api, ApiCategory } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "./AdminLayout";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

type DraftRow = { slug: string; name: string; sort_order: number; image_url: string };

const emptyDraft: DraftRow = { slug: "", name: "", sort_order: 0, image_url: "" };

function autoSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function Categories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<DraftRow>(emptyDraft);
  const nameRef = useRef<HTMLInputElement>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<DraftRow>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api.categories.list()
      .then(setCategories)
      .catch(() => setError("Failed to load categories"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openModal = () => { setDraft(emptyDraft); setError(""); setModalOpen(true); setTimeout(() => nameRef.current?.focus(), 40); };
  const closeModal = () => { setModalOpen(false); setDraft(emptyDraft); setError(""); };

  const handleAdd = async () => {
    if (!draft.name.trim() || !draft.slug.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await api.categories.create(draft);
      setCategories((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      closeModal();
      toast("Category created successfully!", "success", "Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: ApiCategory) => {
    setEditId(c.id);
    setEditDraft({ slug: c.slug, name: c.name, sort_order: c.sort_order, image_url: c.image_url ?? "" });
  };

  const handleEdit = async (id: number) => {
    setSaving(true);
    setError("");
    try {
      const updated = await api.categories.update(id, editDraft);
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.sort_order - b.sort_order)
      );
      setEditId(null);
      toast("Category updated successfully!", "success", "Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.categories.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Navigation</p>
            <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> Add Category
          </button>
        </div>

        {error && !modalOpen && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">
            {error}
          </div>
        )}

        <div className="border border-border-subtle overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-chassis">
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest w-16">Order</th>
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest w-14">Img</th>
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Name</th>
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Slug</th>
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Image URL</th>
                <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest w-44">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                    Loading…
                  </td>
                </tr>
              ) : categories.map((c) => (
                <tr key={c.id} className="hover:bg-chassis/50 transition-colors">
                  {editId === c.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="number" value={editDraft.sort_order}
                          onChange={(e) => setEditDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
                          className="field-input w-16 text-center"
                        />
                      </td>
                      <td className="px-4 py-2">
                        {editDraft.image_url ? (
                          <img src={editDraft.image_url} alt="" className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted" />
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text" value={editDraft.name}
                          onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                          className="field-input"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text" value={editDraft.slug}
                          onChange={(e) => setEditDraft((d) => ({ ...d, slug: e.target.value }))}
                          className="field-input"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="url" value={editDraft.image_url} placeholder="https://…"
                          onChange={(e) => setEditDraft((d) => ({ ...d, image_url: e.target.value }))}
                          className="field-input"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(c.id)}
                            disabled={saving}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            <Check size={11} /> Save
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="flex items-center gap-1 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X size={11} /> Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono-tech text-[11px] text-muted-foreground">{c.sort_order}</td>
                      <td className="px-4 py-3">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} className="w-9 h-9 rounded object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-9 h-9 rounded bg-muted flex items-center justify-center text-muted-foreground text-[10px]">–</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-3 font-mono-tech text-[11px] text-muted-foreground">{c.slug}</td>
                      <td className="px-4 py-3 font-mono-tech text-[10px] text-muted-foreground truncate max-w-xs" title={c.image_url ?? ""}>
                        {c.image_url ? c.image_url : <span className="opacity-40">none</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(c)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                          {confirmId === c.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDelete(c.id)}
                                disabled={deletingId === c.id}
                                className="px-3 py-1.5 text-xs bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                              >
                                {deletingId === c.id ? "…" : "Confirm"}
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
                              onClick={() => setConfirmId(c.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:border-red-500/40 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}

            </tbody>
          </table>
        </div>

        <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mt-4">
          {categories.length} {categories.length === 1 ? "category" : "categories"} · changes appear in the site navbar immediately
        </p>
      </div>

      {/* ── Add Category Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-background border border-border-subtle w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <div>
                <p className="font-mono-tech text-[9px] text-primary tracking-[0.4em] uppercase mb-0.5">New</p>
                <h2 className="text-base font-bold text-foreground">Add Category</h2>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  value={draft.name}
                  placeholder="e.g. Cameras"
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value, slug: autoSlug(e.target.value) }))}
                  className="field-input w-full"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
                  Slug <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={draft.slug}
                  placeholder="e.g. cameras"
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                  className="field-input w-full"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
                  Image URL
                </label>
                <input
                  type="url"
                  value={draft.image_url}
                  placeholder="https://…"
                  onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
                  className="field-input w-full"
                />
                {draft.image_url && (
                  <img src={draft.image_url} alt="preview" className="mt-2 w-12 h-12 rounded object-cover border border-border-subtle" referrerPolicy="no-referrer" />
                )}
              </div>

              <div>
                <label className="block font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
                  className="field-input w-24 text-center"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle">
              <button
                onClick={closeModal}
                className="h-9 px-5 border border-border-subtle text-xs text-muted-foreground uppercase tracking-widest font-bold hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !draft.name.trim() || !draft.slug.trim()}
                className="flex items-center gap-2 h-9 px-5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Check size={12} /> {saving ? "Saving…" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
