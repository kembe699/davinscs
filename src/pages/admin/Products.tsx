import { useEffect, useState, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useTenantPath } from "@/contexts/TenantContext";
import { api, ApiProduct, ApiCategory } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, Trash2, Search, RefreshCw, Upload, Download, Edit } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";

export default function Products() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { baseCurrency } = useCurrency();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categoryList, setCategoryList] = useState<ApiCategory[]>([]);
  const [filtered, setFiltered] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<ApiProduct | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.products.list(), api.categories.list()])
      .then(([p, cats]) => {
        setProducts(p);
        setFiltered(p);
        setCategoryList(cats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    let list = products;
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (search) list = list.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      ((p as any).barcode && (p as any).barcode.toLowerCase().includes(search.toLowerCase()))
    );
    setFiltered(list);
  }, [search, category, products]);

  const handleDelete = async (id: number) => {
    try {
      await api.products.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelectedProduct(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Delete failed";
      toast(errorMessage, "error", "Delete Failed");
    } finally {
      setConfirmId(null);
    }
  };

  const toggleSelectAll = () => {
    if (filtered.every((p) => selectedIds.has(p.id))) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    let deleted = 0, failed = 0;
    for (const id of ids) {
      try {
        await api.products.delete(id);
        deleted++;
      } catch {
        failed++;
      }
    }
    await load();
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
    setBulkDeleting(false);
    if (failed === 0) {
      toast(`Deleted ${deleted} product(s).`, "success", "Deleted");
    } else {
      toast(`Deleted ${deleted} product(s), ${failed} skipped — still linked to sales, orders, or other records.`, "warning", "Partially Deleted");
    }
  };

  const openEditForm = (product: ApiProduct) => {
    navigate(tp(`/admin/products/${product.id}/edit`));
  };

  const openNewForm = () => {
    navigate(tp('/admin/products/new'));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Auto-create any categories referenced in the file that don't exist yet
      const existingSlugs = new Set(categoryList.map((c) => c.slug));
      const seenCategories = new Set<string>();
      for (const row of rows) {
        const rawCategory = String(row["category"] ?? row["Category"] ?? "").trim();
        const categorySlug = rawCategory.toLowerCase();
        if (!categorySlug || existingSlugs.has(categorySlug) || seenCategories.has(categorySlug)) continue;
        seenCategories.add(categorySlug);
        try {
          await api.categories.create({ slug: categorySlug, name: rawCategory, sort_order: 0 });
          existingSlugs.add(categorySlug);
        } catch {
          // likely already exists (409) — product import proceeds regardless
        }
      }

      // Skip rows that duplicate a product already in the store or another row in this file
      const existingProductKeys = new Set(products.map((p) => `${p.name.trim().toLowerCase()}|${p.brand.trim().toLowerCase()}`));
      const seenInFile = new Set<string>();

      let created = 0, skipped = 0, duplicates = 0;
      for (const row of rows) {
        const name     = String(row["name"] ?? row["Name"] ?? "").trim();
        const brand    = String(row["brand"] ?? row["Brand"] ?? "").trim();
        const category = String(row["category"] ?? row["Category"] ?? "").trim().toLowerCase();
        const rawPrice = row["price"] ?? row["Price"] ?? "";
        const price    = Number(String(rawPrice).replace(/,/g, "").trim());

        if (!name || !price) { skipped++; continue; }

        const dedupeKey = `${name.toLowerCase()}|${brand.toLowerCase()}`;
        if (existingProductKeys.has(dedupeKey) || seenInFile.has(dedupeKey)) { duplicates++; continue; }
        seenInFile.add(dedupeKey);

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();
        const cost_price = Number(String(row["cost_price"] ?? row["Cost Price"] ?? 0).replace(/,/g, ""));
        const barcode    = String(row["barcode"] ?? row["Barcode"] ?? "").trim();
        const description = String(row["description"] ?? row["Description"] ?? "").trim();
        const quantity_on_hand = Number(row["quantity"] ?? row["quantity_on_hand"] ?? row["Quantity"] ?? 0);
        const reorder_level   = Number(row["reorder_level"] ?? row["Reorder Level"] ?? 0);
        const in_stock = quantity_on_hand > 0 || String(row["in_stock"] ?? row["In Stock"] ?? "true").toLowerCase() !== "false";
        // Both optional — uom falls back to the same "pcs" default the DB column has,
        // expiry_date stays null (no expiry) when the cell is left blank.
        const uom = String(row["uom"] ?? row["UOM"] ?? row["Unit of Measure"] ?? "").trim().toLowerCase() || "pcs";
        const rawExpiry = String(row["expiry_date"] ?? row["Expiry Date"] ?? "").trim();
        const parsedExpiry = rawExpiry ? new Date(rawExpiry) : null;
        const expiry_date = parsedExpiry && !isNaN(parsedExpiry.getTime()) ? parsedExpiry.toISOString().slice(0, 10) : null;

        try {
          await api.products.create({
            slug, name, brand, category,
            price,
            cost_price,
            barcode, description,
            quantity_on_hand, reorder_level,
            in_stock,
            uom, expiry_date,
            tag: "", specs: [], image_url: "", is_featured: false,
          } as any);
          existingProductKeys.add(dedupeKey);
          created++;
        } catch {
          skipped++;
        }
      }
      load();
      const parts = [`Imported ${created} product(s)`];
      if (duplicates) parts.push(`${duplicates} duplicate(s) skipped`);
      if (skipped) parts.push(`${skipped} skipped (missing required fields or error)`);
      setImportMsg({ type: "ok", text: parts.join(", ") + "." });
    } catch (err: any) {
      setImportMsg({ type: "err", text: err?.message || "Import failed — check file format." });
    } finally {
      setImporting(false);
    }
  };

  const handleExportTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["name","brand","category","price","cost_price","barcode","description","quantity","reorder_level","in_stock","uom","expiry_date"],
      ["Example Product","Example Brand",categoryList[0]?.slug ?? "beverages","100000","80000","123456789","A great product","10","2","true","pcs",""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products_import_template.xlsx");
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Inventory</p>
              <h1 className="text-2xl font-bold text-foreground">Products</h1>
            </div>
          </div>

          <div className="flex gap-2 mb-4 p-3 bg-chassis border border-border-subtle">
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={openNewForm} className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg">
              <Plus size={14} /> New product
            </button>
            <button disabled={!selectedProduct} onClick={() => selectedProduct && openEditForm(selectedProduct)} className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg disabled:opacity-50">
              <Edit size={14} /> Edit
            </button>
            <button disabled={!selectedProduct} onClick={() => selectedProduct && setConfirmId(selectedProduct.id)} className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-danger text-xs hover:bg-admin-bg disabled:opacity-50">
              <Trash2 size={14} /> Delete
            </button>
            <button disabled={selectedIds.size === 0} onClick={() => setConfirmBulkDelete(true)} className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-danger text-xs hover:bg-admin-bg disabled:opacity-50">
              <Trash2 size={14} /> Delete Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
            </button>
            <button
              onClick={() => { const csv = 'name,brand,category,price,cost_price,barcode,description,quantity,reorder_level\n' + filtered.map(p => `"${p.name}","${p.brand}",${p.category},${p.price},${p.cost_price||0},${(p as any).barcode||''},,${(p as any).quantity_on_hand||0},${(p as any).reorder_level||0}`).join('\n'); const link = document.createElement('a'); link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv); link.download = 'products.csv'; link.click(); }}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => importRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg disabled:opacity-50"
            >
              <Upload size={14} /> {importing ? "Importing…" : "Import"}
            </button>
            <button
              onClick={handleExportTemplate}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="Download blank import template"
            >
              <Download size={14} /> Template
            </button>
            <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
          </div>

          {importMsg && (
            <div className={`mb-3 px-4 py-2 text-xs border ${
              importMsg.type === "ok"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            } flex items-center justify-between`}>
              <span>{importMsg.text}</span>
              <button onClick={() => setImportMsg(null)} className="ml-4 opacity-60 hover:opacity-100">×</button>
            </div>
          )}
          <div className="mb-6">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 bg-chassis border border-border-subtle pl-9 pr-4 text-sm text-foreground" />
            </div>
          </div>
        </div>

        <div className="flex border border-border-subtle">
          <div className="w-64 bg-chassis border-r border-border-subtle">
            <div className="p-4 border-b border-border-subtle">
              <h3 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Categories</h3>
            </div>
            <div className="divide-y divide-border-subtle">
              <button
                onClick={() => setCategory("all")}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-2 ${
                  category === "all" ? "bg-primary text-white font-medium" : "text-foreground hover:bg-chassis-hover"
                }`}
              >
                <span className="flex-1">All Products</span>
                <span className={`text-xs ${category === "all" ? "text-white/70" : "text-muted-foreground"}`}>({products.length})</span>
              </button>
              {categoryList.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => setCategory(c.slug)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                    category === c.slug ? "bg-primary text-white font-medium" : "text-foreground hover:bg-chassis-hover"
                  }`}
                >
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="w-7 h-7 rounded object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-7 h-7 rounded bg-muted flex-shrink-0" />
                  )}
                  <span className="flex-1 capitalize">{c.name}</span>
                  <span className={`text-xs ${category === c.slug ? "text-white/70" : "text-muted-foreground"}`}>
                    ({products.filter(p => p.category === c.slug).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading…</div>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: 'calc(11 * 3rem)', minHeight: 'calc(11 * 3rem)' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-chassis">
                    <tr className="border-b border-border-subtle">
                      <th className="w-8 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id))}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Name</th>
                      <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Category</th>
                      <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Brand</th>
                      <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Price</th>
                      <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedProduct(p)}
                        onDoubleClick={() => openEditForm(p)}
                        className={`cursor-pointer transition-colors ${selectedProduct?.id === p.id ? 'bg-primary/10' : 'hover:bg-chassis'}`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelectOne(p.id)} />
                        </td>
                        <td className="px-4 py-3">{p.name}</td>
                        <td className="px-4 py-3 capitalize">{p.category}</td>
                        <td className="px-4 py-3">{p.brand}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrencySync(p.price, baseCurrency?.symbol || 'UGX', false)}</td>
                        <td className="px-4 py-3"><span className={p.in_stock ? "text-green-600" : "text-red-600"}>{p.in_stock ? "In Stock" : "Out"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {confirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-admin-surface border border-admin-border p-6 max-w-md">
              <h3 className="text-lg font-bold text-admin-text mb-4">Confirm Delete</h3>
              <p className="text-admin-text-secondary mb-6">Delete this product?</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmId(null)} className="px-4 py-2 border border-admin-border text-admin-text">Cancel</button>
                <button onClick={() => handleDelete(confirmId)} className="px-4 py-2 bg-admin-danger text-white">Delete</button>
              </div>
            </div>
          </div>
        )}

        {confirmBulkDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-admin-surface border border-admin-border p-6 max-w-md">
              <h3 className="text-lg font-bold text-admin-text mb-4">Confirm Delete</h3>
              <p className="text-admin-text-secondary mb-6">
                Delete {selectedIds.size} selected product{selectedIds.size === 1 ? "" : "s"}? Any still linked to sales, orders, or other records will be skipped.
              </p>
              <div className="flex gap-3 justify-end">
                <button disabled={bulkDeleting} onClick={() => setConfirmBulkDelete(false)} className="px-4 py-2 border border-admin-border text-admin-text disabled:opacity-50">Cancel</button>
                <button disabled={bulkDeleting} onClick={handleBulkDelete} className="px-4 py-2 bg-admin-danger text-white disabled:opacity-50">
                  {bulkDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
