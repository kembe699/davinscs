import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "./AdminLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import { api, ApiCurrency, ApiProduct, PriceList, PriceListItem } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { Check, Download, FileUp, Pencil, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";

type TabId = "schemes" | "pricelist";

export default function PriceLists() {
  const { toast } = useToast();
  const { baseCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<TabId>("schemes");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [currencies, setCurrencies] = useState<ApiCurrency[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);

  // ── Schemes tab ──────────────────────────────────────────────────────────
  const emptyAdd = { name: "", contact: "", currency_id: "" as string, is_active: true };
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyAdd);

  // ── Price list tab ───────────────────────────────────────────────────────
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(null);
  const selectedScheme = useMemo(
    () => (priceLists as any[]).find((p) => p.id === selectedSchemeId) ?? null,
    [priceLists, selectedSchemeId],
  );
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; action: () => void } | null>(null);

  const itemMap = useMemo(() => {
    const m = new Map<number, PriceListItem>();
    items.forEach((it) => m.set(it.product_id, it));
    return m;
  }, [items]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q),
    );
  }, [products, search]);

  // ── Data loaders ─────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [pl, cur, prod] = await Promise.all([
        api.priceLists.list(),
        api.currencies.list(),
        api.products.list(),
      ]);
      setPriceLists(pl as any);
      setCurrencies(cur);
      setProducts(prod);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (id: number) => {
    try {
      const data = await api.priceLists.items(id);
      setItems(data as any);
    } catch (e: any) {
      setError(e?.message || "Failed to load items");
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (selectedSchemeId) loadItems(selectedSchemeId);
    else setItems([]);
  }, [selectedSchemeId]);

  // ── Scheme CRUD ──────────────────────────────────────────────────────────
  const createScheme = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await api.priceLists.create({
        name: addForm.name,
        description: addForm.contact,
        is_active: addForm.is_active,
        currency_id: addForm.currency_id ? Number(addForm.currency_id) : null,
      } as any);
      setPriceLists((prev) =>
        [...prev, created as any].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setAddForm(emptyAdd);
      setShowAddForm(false);
      toast("Scheme created successfully!", "success", "Saved");
    } catch (e: any) {
      setError(e?.message || "Failed to create scheme");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (pl: any) => {
    setEditingId(pl.id);
    setEditForm({
      name: pl.name,
      contact: pl.description || "",
      currency_id: pl.currency_id ? String(pl.currency_id) : "",
      is_active: pl.is_active,
    });
  };

  const saveEdit = async (id: number) => {
    setSaving(true);
    setError("");
    try {
      const updated = await api.priceLists.update(id, {
        name: editForm.name,
        description: editForm.contact,
        is_active: editForm.is_active,
        currency_id: editForm.currency_id ? Number(editForm.currency_id) : null,
      } as any);
      setPriceLists((prev) => prev.map((p) => (p.id === id ? { ...p, ...(updated as any) } : p)));
      setEditingId(null);
      toast("Scheme updated!", "success", "Saved");
    } catch (e: any) {
      setError(e?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const deleteScheme = (id: number) => {
    setPendingConfirm({
      message: "Delete this scheme and all its price overrides? This cannot be undone.",
      action: async () => {
        setSaving(true);
        setError("");
        try {
          await api.priceLists.delete(id);
          setPriceLists((prev) => prev.filter((p) => p.id !== id));
          if (selectedSchemeId === id) { setSelectedSchemeId(null); setItems([]); }
          toast("Scheme deleted.", "success", "Deleted");
        } catch (e: any) {
          setError(e?.message || "Failed to delete");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // ── Price overrides ──────────────────────────────────────────────────────
  const saveOverride = async (productId: number, raw: string) => {
    if (!selectedSchemeId) return;
    const trimmed = raw.trim();
    setSaving(true);
    setError("");
    try {
      if (!trimmed) {
        await api.priceLists.deleteItem(selectedSchemeId, productId);
        setItems((prev) => prev.filter((x) => x.product_id !== productId));
        return;
      }
      const price = Number(trimmed);
      if (Number.isNaN(price) || price < 0) { setError("Enter a valid positive number"); return; }
      const saved = await api.priceLists.upsertItem(selectedSchemeId, productId, price);
      setItems((prev) => {
        const without = prev.filter((x) => x.product_id !== productId);
        const product = products.find((p) => p.id === productId);
        return [...without, { ...(saved as any), product_name: (saved as any).product_name || product?.name || "" }];
      });
    } catch (e: any) {
      setError(e?.message || "Failed to save price");
    } finally {
      setSaving(false);
    }
  };

  // ── Import CSV / XLSX ────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSchemeId) return;
    e.target.value = "";
    setImporting(true);
    setError("");
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      let count = 0;
      for (const row of rows) {
        const pid = Number(row["product_id"] ?? row["Product ID"] ?? 0);
        const rawPrice = row["scheme_price"] ?? row["Scheme Price"] ?? row["price"] ?? "";
        const price = Number(String(rawPrice).replace(/,/g, "").trim());
        if (!pid || !price || price <= 0) continue;
        await api.priceLists.upsertItem(selectedSchemeId, pid, price);
        count++;
      }
      await loadItems(selectedSchemeId);
      toast(`Imported ${count} price override(s) successfully!`, "success", "Import Complete");
    } catch (e: any) {
      setError(e?.message || "Import failed — check that the file matches the template format");
    } finally {
      setImporting(false);
    }
  };

  // ── Export XLSX ──────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!selectedScheme) return;
    const currCode = selectedScheme.currency_code || baseCurrency?.code || "UGX";
    const rows = products.map((p) => ({
      "product_id": p.id,
      "product_name": p.name,
      [`base_price_${baseCurrency?.code || "UGX"}`]: p.price,
      [`scheme_price_${currCode}`]: itemMap.has(p.id) ? itemMap.get(p.id)!.price : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 36 }, { wch: 20 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prices");
    XLSX.writeFile(wb, `scheme_${selectedScheme.name.replace(/\s+/g, "_")}_prices.xlsx`);
  };

  // ── Download import template ─────────────────────────────────────────────
  const downloadTemplate = () => {
    const rows = products.map((p) => ({
      "product_id": p.id,
      "product_name": p.name,
      [`base_price_${baseCurrency?.code || "UGX"}`]: p.price,
      "scheme_price": "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 36 }, { wch: 20 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const name = selectedScheme
      ? `scheme_${selectedScheme.name.replace(/\s+/g, "_")}_template.xlsx`
      : `scheme_price_template.xlsx`;
    XLSX.writeFile(wb, name);
  };

  const schemeCurrLabel = (pl: any) =>
    pl?.currency_code ? `${pl.currency_code} (${pl.currency_symbol})` : `${baseCurrency?.code || "UGX"} (base)`;

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-admin-text">Price Lists</h1>
            <p className="text-sm text-admin-text-secondary mt-1">
              Create pricing schemes (insurance, company, export) and assign per-product prices.
            </p>
          </div>
          <button
            onClick={load}
            className="px-4 py-2 bg-admin-surface border border-admin-border text-admin-text text-sm hover:bg-admin-bg flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 border border-admin-danger text-admin-danger bg-admin-danger/10 text-sm flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")}><X size={14} /></button>
          </div>
        )}
        {/* Tabs */}
        <div className="flex border-b border-admin-border mb-6">
          {(["schemes", "pricelist"] as TabId[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-admin-text text-admin-text"
                  : "border-transparent text-admin-text-secondary hover:text-admin-text"
              }`}
            >
              {tab === "schemes" ? "Schemes" : "Price List"}
            </button>
          ))}
        </div>

        {/* ═══════════════════════ TAB 1 — SCHEMES ═══════════════════════ */}
        {activeTab === "schemes" && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setShowAddForm((v) => !v); setAddForm(emptyAdd); }}
                className="px-4 py-2 bg-admin-text text-admin-bg text-sm hover:opacity-90 flex items-center gap-2"
              >
                <Plus size={16} />
                {showAddForm ? "Cancel" : "Add Scheme"}
              </button>
            </div>

            {/* ── Add form ── */}
            {showAddForm && (
              <div className="mb-6 bg-admin-surface border border-admin-border p-5">
                <p className="text-sm font-semibold text-admin-text mb-4">New Scheme</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-admin-text-secondary mb-1">Scheme Name *</label>
                    <input
                      value={addForm.name}
                      onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Insert price list name"
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-admin-text-secondary mb-1">Contact</label>
                    <input
                      value={addForm.contact}
                      onChange={(e) => setAddForm((p) => ({ ...p, contact: e.target.value }))}
                      placeholder="Person or company name"
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-admin-text-secondary mb-1">Currency</label>
                    <select
                      value={addForm.currency_id}
                      onChange={(e) => setAddForm((p) => ({ ...p, currency_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                    >
                      <option value="">Base — {baseCurrency?.code || "UGX"}</option>
                      {currencies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <label className="flex items-center gap-2 text-sm text-admin-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.is_active}
                      onChange={(e) => setAddForm((p) => ({ ...p, is_active: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    Active (visible in POS)
                  </label>
                  <div className="flex-1" />
                  <button
                    onClick={createScheme}
                    disabled={saving || !addForm.name.trim()}
                    className="px-5 py-2 bg-admin-text text-admin-bg text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Creating…" : "Create Scheme"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Schemes table ── */}
            <div className="bg-admin-surface border border-admin-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-admin-bg border-b border-admin-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-admin-text">Scheme Name</th>
                    <th className="text-left px-4 py-3 text-admin-text">Contact</th>
                    <th className="text-left px-4 py-3 text-admin-text">Currency</th>
                    <th className="text-center px-4 py-3 text-admin-text">Status</th>
                    <th className="text-right px-4 py-3 text-admin-text">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-admin-text-secondary">
                        Loading…
                      </td>
                    </tr>
                  ) : priceLists.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-admin-text-secondary">
                        No schemes yet. Click "Add Scheme" to get started.
                      </td>
                    </tr>
                  ) : (
                    (priceLists as any[]).map((pl) =>
                      editingId === pl.id ? (
                        /* ── Inline edit row ── */
                        <tr key={pl.id} className="bg-admin-bg">
                          <td className="px-2 py-2">
                            <input
                              value={editForm.name}
                              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                              className="w-full px-2 py-1 bg-admin-surface border border-admin-border text-admin-text text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={editForm.contact}
                              onChange={(e) => setEditForm((p) => ({ ...p, contact: e.target.value }))}
                              className="w-full px-2 py-1 bg-admin-surface border border-admin-border text-admin-text text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={editForm.currency_id}
                              onChange={(e) => setEditForm((p) => ({ ...p, currency_id: e.target.value }))}
                              className="w-full px-2 py-1 bg-admin-surface border border-admin-border text-admin-text text-sm"
                            >
                              <option value="">Base ({baseCurrency?.code || "UGX"})</option>
                              {currencies.map((c) => (
                                <option key={c.id} value={c.id}>{c.code}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <label className="flex items-center justify-center gap-1 text-xs text-admin-text-secondary cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editForm.is_active}
                                onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))}
                              />
                              Active
                            </label>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveEdit(pl.id)}
                                disabled={saving}
                                className="p-1.5 bg-green-600 text-white hover:opacity-80 disabled:opacity-50"
                                title="Save"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        /* ── Normal row ── */
                        <tr key={pl.id} className="hover:bg-admin-bg/50">
                          <td className="px-4 py-3 font-medium text-admin-text">{pl.name}</td>
                          <td className="px-4 py-3 text-admin-text-secondary">{pl.description || "—"}</td>
                          <td className="px-4 py-3 text-admin-text-secondary">{schemeCurrLabel(pl)}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded ${
                                pl.is_active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {pl.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEdit(pl)}
                                className="p-1.5 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => deleteScheme(pl.id)}
                                disabled={saving}
                                className="p-1.5 border border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════ TAB 2 — PRICE LIST ════════════════════ */}
        {activeTab === "pricelist" && (
          <div>
            {/* ── Toolbar ── */}
            <div className="flex flex-wrap items-end gap-3 mb-5">
              <div className="min-w-[220px]">
                <label className="block text-xs text-admin-text-secondary mb-1">Scheme</label>
                <select
                  value={selectedSchemeId ?? ""}
                  onChange={(e) =>
                    setSelectedSchemeId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-sm"
                >
                  <option value="">— Select a scheme —</option>
                  {(priceLists as any[]).map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}{pl.currency_code ? ` (${pl.currency_code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs text-admin-text-secondary mb-1">Search Products</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or barcode…"
                  className="w-full px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-sm"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={downloadTemplate}
                  className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-1.5"
                  title="Download import template (XLSX) — fill 'scheme_price' column then import"
                >
                  <Download size={15} />
                  Template
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={!selectedSchemeId || importing}
                  className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-1.5 disabled:opacity-40"
                  title="Import prices from CSV or XLSX"
                >
                  <Upload size={15} />
                  {importing ? "Importing…" : "Import"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={handleExport}
                  disabled={!selectedSchemeId}
                  className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-1.5 disabled:opacity-40"
                  title="Export scheme prices to XLSX"
                >
                  <FileUp size={15} />
                  Export
                </button>
              </div>
            </div>

            {/* Import hint */}
            {!selectedSchemeId && (
              <div className="mb-3 px-4 py-2 bg-admin-surface border border-admin-border text-xs text-admin-text-secondary">
                💡 Click <strong>Template</strong> to download a pre-filled XLSX with all products. Fill the <code>scheme_price</code> column, then click <strong>Import</strong> with a scheme selected.
              </div>
            )}

            {/* Scheme info bar */}
            {selectedScheme && (
              <div className="mb-4 px-4 py-2 bg-admin-surface border border-admin-border text-xs text-admin-text-secondary flex flex-wrap gap-6">
                <span>Scheme: <strong className="text-admin-text">{selectedScheme.name}</strong></span>
                <span>Contact: <strong className="text-admin-text">{selectedScheme.description || "—"}</strong></span>
                <span>Currency: <strong className="text-admin-text">{schemeCurrLabel(selectedScheme)}</strong></span>
                <span>Prices set: <strong className="text-admin-text">{items.length} / {products.length}</strong></span>
              </div>
            )}

            {!selectedSchemeId ? (
              <div className="bg-admin-surface border border-admin-border p-14 text-center text-admin-text-secondary text-sm">
                Select a scheme above to view and edit prices.
              </div>
            ) : (
              <div className="bg-admin-surface border border-admin-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-admin-bg border-b border-admin-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-admin-text">Product</th>
                      <th className="text-right px-4 py-3 text-admin-text">
                        Base Price ({baseCurrency?.code || "UGX"})
                      </th>
                      <th className="text-right px-4 py-3 text-admin-text">
                        Scheme Price ({selectedScheme?.currency_code || baseCurrency?.code || "UGX"})
                      </th>
                      <th className="text-center px-4 py-3 text-admin-text w-24">Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-admin-text-secondary">
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const it = itemMap.get(p.id);
                        return (
                          <tr key={p.id} className={it ? "bg-green-50/30" : ""}>
                            <td className="px-4 py-2 text-admin-text">{p.name}</td>
                            <td className="px-4 py-2 text-right font-mono text-admin-text-secondary text-xs">
                              {formatCurrencySync(p.price, baseCurrency?.symbol || "UGX", true)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input
                                key={`${selectedSchemeId}-${p.id}-${it?.price ?? "x"}`}
                                defaultValue={it ? String(it.price) : ""}
                                placeholder="leave blank = base price"
                                className="w-48 text-right px-2 py-1 bg-admin-bg border border-admin-border text-admin-text font-mono text-sm focus:outline-none focus:border-admin-text"
                                onBlur={(e) => saveOverride(p.id, e.target.value)}
                                disabled={saving}
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              {it ? (
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 font-medium rounded">
                                  ✓ Set
                                </span>
                              ) : (
                                <span className="text-xs text-admin-text-secondary">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <div className="px-4 py-2 border-t border-admin-border text-xs text-admin-text-secondary">
                  Tip: type a price and click outside the field to save. Clear the field and click outside to remove the override (POS will fall back to base price).
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!pendingConfirm}
        title="Delete Scheme"
        message={pendingConfirm?.message || ""}
        confirmLabel="Delete"
        onConfirm={() => pendingConfirm?.action()}
        onCancel={() => setPendingConfirm(null)}
      />
    </AdminLayout>
  );
}
