import { useEffect, useState } from "react";
import { api, ApiCurrency } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, Globe, Trash2, Check } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function Currencies() {
  const { refreshCurrencies } = useCurrency();
  const [currencies, setCurrencies] = useState<ApiCurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    symbol: "",
    exchange_rate: "",
    is_active: true,
  });

  const loadCurrencies = async () => {
    try {
      const data = await api.currencies.list();
      setCurrencies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load currencies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrencies();
  }, []);

  const handleCreate = async () => {
    if (!form.code || !form.name || !form.symbol || !form.exchange_rate) {
      setError("All fields are required");
      return;
    }

    if (parseFloat(form.exchange_rate) <= 0) {
      setError("Exchange rate must be positive");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.currencies.create({
        code: form.code.toUpperCase(),
        name: form.name,
        symbol: form.symbol,
        exchange_rate: parseFloat(form.exchange_rate),
        is_active: form.is_active,
      });
      await loadCurrencies();
      await refreshCurrencies();
      setCreating(false);
      setForm({ code: "", name: "", symbol: "", exchange_rate: "", is_active: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSetBase = async (id: number) => {
    setSaving(true);
    setError("");
    try {
      await api.currencies.setBase(id);
      await loadCurrencies();
      await refreshCurrencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set base currency");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSaving(true);
    setError("");
    try {
      await api.currencies.delete(id);
      await loadCurrencies();
      await refreshCurrencies();
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    setSaving(true);
    setError("");
    try {
      await api.currencies.update(id, { is_active: !currentStatus });
      await loadCurrencies();
      await refreshCurrencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">
            Financial Configuration
          </p>
          <h1 className="text-2xl font-bold text-foreground">Currency Management</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage currencies and exchange rates. Set a base currency for your system.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-end mb-4">
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90"
            >
              <Plus size={14} /> Add Currency
            </button>
          )}
        </div>

        {creating && (
          <div className="border border-primary/40 bg-primary/5 p-4 mb-4">
            <h3 className="font-bold text-foreground mb-3">New Currency</h3>
            <div className="grid grid-cols-5 gap-3">
              <input
                type="text"
                placeholder="Code (e.g., USD) *"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                maxLength={3}
                className="field-input uppercase"
              />
              <input
                type="text"
                placeholder="Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="field-input"
              />
              <input
                type="text"
                placeholder="Symbol *"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                className="field-input"
              />
              <input
                type="number"
                step="0.000001"
                placeholder="Exchange Rate *"
                value={form.exchange_rate}
                onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })}
                className="field-input"
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                Active
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setForm({ code: "", name: "", symbol: "", exchange_rate: "", is_active: true });
                }}
                className="px-4 py-2 border border-border-subtle text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="border border-border-subtle overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-chassis">
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">
                  Code
                </th>
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">
                  Symbol
                </th>
                <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">
                  Exchange Rate
                </th>
                <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">
                  Status
                </th>
                <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">
                  Base
                </th>
                <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse"
                  >
                    Loading…
                  </td>
                </tr>
              ) : (
                currencies.map((currency) => (
                  <tr key={currency.id} className="hover:bg-chassis/50 transition-colors">
                    <td className="px-4 py-3 font-mono-tech font-bold text-foreground">
                      {currency.code}
                    </td>
                    <td className="px-4 py-3 text-foreground">{currency.name}</td>
                    <td className="px-4 py-3 font-mono-tech text-foreground">{currency.symbol}</td>
                    <td className="px-4 py-3 text-right font-mono-tech text-foreground">
                      {currency.exchange_rate.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(currency.id, currency.is_active)}
                        disabled={saving || currency.is_base}
                        className={`font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border ${
                          currency.is_active
                            ? "border-green-500/30 text-green-500 bg-green-500/5"
                            : "border-red-500/30 text-red-500 bg-red-500/5"
                        } disabled:opacity-50`}
                      >
                        {currency.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {currency.is_base ? (
                        <span className="inline-flex items-center gap-1 font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border border-primary/30 text-primary bg-primary/5">
                          <Check size={12} /> Base
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetBase(currency.id)}
                          disabled={saving}
                          className="font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border border-border-subtle text-muted-foreground hover:text-primary hover:border-primary/30 disabled:opacity-50"
                        >
                          Set as Base
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setConfirmDelete(currency.id)}
                        disabled={saving || currency.is_base}
                        className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={currency.is_base ? "Cannot delete base currency" : "Delete currency"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-admin-surface border border-admin-border p-6 max-w-md">
              <h3 className="text-lg font-bold text-admin-text mb-4">Confirm Delete</h3>
              <p className="text-admin-text-secondary mb-6">
                Are you sure you want to delete this currency? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 border border-admin-border text-admin-text"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDelete && handleDelete(confirmDelete)}
                  className="px-4 py-2 bg-admin-danger text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
