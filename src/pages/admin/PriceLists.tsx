import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { api, ApiCurrency, ApiProduct, PriceList } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";

type PriceListItem = {
  id: number;
  price_list_id: number;
  product_id: number;
  product_name: string;
  price: number;
};

export default function PriceLists() {
  const { baseCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [currencies, setCurrencies] = useState<ApiCurrency[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    discount_percent: 0,
    is_active: true,
    currency_id: null as number | null,
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(() => priceLists.find((p) => p.id === selectedId) || null, [priceLists, selectedId]);

  const [items, setItems] = useState<PriceListItem[]>([]);
  const itemMap = useMemo(() => {
    const m = new Map<number, PriceListItem>();
    for (const it of items) m.set(it.product_id, it);
    return m;
  }, [items]);

  const [search, setSearch] = useState("");

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
      if (!selectedId && pl.length > 0) setSelectedId(pl[0].id);
    } catch (e: any) {
      setError(e?.message || "Failed to load price lists");
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (id: number) => {
    try {
      const data = await api.priceLists.items(id);
      setItems(data as any);
    } catch (e: any) {
      setError(e?.message || "Failed to load price list items");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadItems(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const currencyLabel = (pl: any) => {
    if (!pl?.currency_code) return baseCurrency?.code || "";
    return pl.currency_code;
  };

  const currencySymbol = (pl: any) => {
    if (!pl?.currency_symbol) return baseCurrency?.symbol || "UGX";
    return pl.currency_symbol;
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q));
  }, [products, search]);

  const createPriceList = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await api.priceLists.create({
        name: form.name,
        description: form.description,
        discount_percent: form.discount_percent,
        is_active: form.is_active,
        currency_id: form.currency_id,
      } as any);
      setPriceLists((prev) => [...prev, created as any].sort((a, b) => a.name.localeCompare(b.name)));
      setCreating(false);
      setForm({ name: "", description: "", discount_percent: 0, is_active: true, currency_id: null });
      setSelectedId((created as any).id);
    } catch (e: any) {
      setError(e?.message || "Failed to create price list");
    } finally {
      setSaving(false);
    }
  };

  const deletePriceList = async (id: number) => {
    if (!confirm("Delete this price list?")) return;
    setSaving(true);
    setError("");
    try {
      await api.priceLists.delete(id);
      setPriceLists((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
      setItems([]);
    } catch (e: any) {
      setError(e?.message || "Failed to delete price list");
    } finally {
      setSaving(false);
    }
  };

  const saveOverride = async (productId: number, raw: string) => {
    if (!selectedId) return;
    const trimmed = raw.trim();

    setSaving(true);
    setError("");
    try {
      if (!trimmed) {
        await api.priceLists.deleteItem(selectedId, productId);
        setItems((prev) => prev.filter((x) => x.product_id !== productId));
        return;
      }

      const price = Number(trimmed);
      if (Number.isNaN(price)) {
        setError("Enter a valid number");
        return;
      }

      const saved = await api.priceLists.upsertItem(selectedId, productId, price);
      setItems((prev) => {
        const without = prev.filter((x) => x.product_id !== productId);
        const product = products.find((p) => p.id === productId);
        return [
          ...without,
          {
            ...(saved as any),
            product_name: (saved as any).product_name || product?.name || "",
          },
        ];
      });
    } catch (e: any) {
      setError(e?.message || "Failed to save override");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-admin-text">Price Lists / Schemes</h1>
            <p className="text-sm text-admin-text-secondary mt-1">Create schemes (Cash, Insurance, Company) and set product-specific prices.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="px-4 py-2 bg-admin-surface border border-admin-border text-admin-text text-sm hover:bg-admin-bg flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={() => setCreating(true)}
              className="px-4 py-2 bg-admin-text text-admin-bg text-sm hover:opacity-90 flex items-center gap-2"
            >
              <Plus size={16} />
              New Scheme
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 border border-admin-danger text-admin-danger bg-admin-danger/10 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-4 bg-admin-surface border border-admin-border">
            <div className="p-4 border-b border-admin-border">
              <div className="text-sm font-medium text-admin-text">Schemes</div>
              <div className="text-xs text-admin-text-secondary mt-1">Default for POS is Cash (use Standard if you want).</div>
            </div>
            <div className="divide-y divide-admin-border">
              {loading ? (
                <div className="p-4 text-sm text-admin-text-secondary">Loading...</div>
              ) : priceLists.length === 0 ? (
                <div className="p-4 text-sm text-admin-text-secondary">No schemes yet.</div>
              ) : (
                priceLists.map((pl: any) => (
                  <div key={pl.id} className="p-3 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedId(pl.id)}
                      className={`text-left flex-1 pr-3 ${selectedId === pl.id ? "text-admin-text" : "text-admin-text-secondary hover:text-admin-text"}`}
                    >
                      <div className="text-sm font-medium">{pl.name}</div>
                      <div className="text-xs opacity-80">{currencyLabel(pl)} {pl.is_active ? "" : "(inactive)"}</div>
                    </button>
                    <button
                      onClick={() => deletePriceList(pl.id)}
                      disabled={saving}
                      className="text-admin-danger hover:opacity-80 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-span-12 md:col-span-8 bg-admin-surface border border-admin-border">
            <div className="p-4 border-b border-admin-border flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-admin-text">{selected ? `${selected.name} Prices` : "Select a scheme"}</div>
                {selected && (
                  <div className="text-xs text-admin-text-secondary mt-1">
                    Currency: {(selected as any).currency_code || baseCurrency?.code || ""} ({currencySymbol(selected as any)})
                  </div>
                )}
              </div>
              <div className="w-64">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products"
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                />
              </div>
            </div>

            {!selected ? (
              <div className="p-6 text-sm text-admin-text-secondary">Choose a scheme to start setting prices.</div>
            ) : (
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm border border-admin-border">
                  <thead className="bg-admin-bg border-b border-admin-border">
                    <tr>
                      <th className="text-left px-3 py-2 text-admin-text">Product</th>
                      <th className="text-right px-3 py-2 text-admin-text">Base Price ({baseCurrency?.code || ""})</th>
                      <th className="text-right px-3 py-2 text-admin-text">Scheme Price ({currencyLabel(selected as any)})</th>
                      <th className="text-right px-3 py-2 text-admin-text">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const it = itemMap.get(p.id);
                      return (
                        <tr key={p.id} className="border-b border-admin-border">
                          <td className="px-3 py-2 text-admin-text">{p.name}</td>
                          <td className="px-3 py-2 text-right font-mono text-admin-text">
                            {formatCurrencySync(p.price, baseCurrency?.symbol || "UGX", false)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              key={`${selectedId ?? "none"}-${p.id}-${it ? it.price : "base"}`}
                              defaultValue={it ? String(it.price) : ""}
                              placeholder="(empty = use base)"
                              className="w-40 text-right px-2 py-1 bg-admin-bg border border-admin-border text-admin-text font-mono"
                              onBlur={(e) => saveOverride(p.id, e.target.value)}
                              disabled={saving}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              className="inline-flex items-center gap-2 px-3 py-1 bg-admin-text text-admin-bg text-xs hover:opacity-90 disabled:opacity-50"
                              disabled
                            >
                              <Save size={14} />
                              Saved on blur
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="text-xs text-admin-text-secondary mt-3">
                  Tip: edit a scheme price then click outside the field to save. Leave empty to remove override.
                </div>
              </div>
            )}
          </div>
        </div>

        {creating && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-admin-surface border border-admin-border p-6 w-[520px]">
              <div className="text-lg font-bold text-admin-text mb-4">New Scheme</div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-admin-text-secondary mb-1">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-admin-text-secondary mb-1">Description</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                  />
                </div>
                <div>
                  <label className="block text-xs text-admin-text-secondary mb-1">Discount % (optional)</label>
                  <input
                    type="number"
                    value={form.discount_percent}
                    onChange={(e) => setForm((p) => ({ ...p, discount_percent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                  />
                </div>
                <div>
                  <label className="block text-xs text-admin-text-secondary mb-1">Currency (optional)</label>
                  <select
                    value={form.currency_id ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, currency_id: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                  >
                    <option value="">(Use base currency)</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setCreating(false)}
                  className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text"
                >
                  Cancel
                </button>
                <button
                  onClick={createPriceList}
                  disabled={saving || !form.name.trim()}
                  className="px-4 py-2 bg-admin-text text-admin-bg disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
