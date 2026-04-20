import { useEffect, useState } from "react";
import { api, ApiCurrency, ApiExchangeRate } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, Globe, Trash2, Check, Edit2, X, ArrowRight, Lock, Unlock } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function CurrenciesEnhanced() {
  const { refreshCurrencies } = useCurrency();
  const [activeTab, setActiveTab] = useState<"currencies" | "rates">("currencies");
  const [currencies, setCurrencies] = useState<ApiCurrency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ApiExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Currency form state
  const [creatingCurrency, setCreatingCurrency] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<number | null>(null);
  const [currencyForm, setCurrencyForm] = useState({
    code: "",
    name: "",
    symbol: "",
    exchange_rate: "",
    is_active: true,
  });

  // Exchange rate form state
  const [creatingRate, setCreatingRate] = useState(false);
  const [editingRate, setEditingRate] = useState<number | null>(null);
  const [rateForm, setRateForm] = useState({
    from_currency_id: "",
    to_currency_id: "",
    rate: "",
    effective_date: new Date().toISOString().split('T')[0],
    expiry_date: "",
  });

  // Conversion state
  const [convertFrom, setConvertFrom] = useState("");
  const [convertTo, setConvertTo] = useState("");
  const [convertAmount, setConvertAmount] = useState("");
  const [convertResult, setConvertResult] = useState<any>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'currency' | 'rate', id: number } | null>(null);
  const [unlockedRates, setUnlockedRates] = useState<Set<number>>(new Set());

  const toggleUnlock = (id: number) => {
    setUnlockedRates(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currenciesData = await api.currencies.list();
      setCurrencies(currenciesData);
      
      if (activeTab === "rates") {
        const ratesData = await api.exchangeRates.list();
        setExchangeRates(ratesData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Currency CRUD operations
  const handleCreateCurrency = async () => {
    if (!currencyForm.code || !currencyForm.name || !currencyForm.symbol || !currencyForm.exchange_rate) {
      setError("All fields are required");
      return;
    }

    if (parseFloat(currencyForm.exchange_rate) <= 0) {
      setError("Exchange rate must be positive");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.currencies.create({
        code: currencyForm.code.toUpperCase(),
        name: currencyForm.name,
        symbol: currencyForm.symbol,
        exchange_rate: parseFloat(currencyForm.exchange_rate),
        is_active: currencyForm.is_active,
      });
      await loadData();
      await refreshCurrencies();
      setCreatingCurrency(false);
      setCurrencyForm({ code: "", name: "", symbol: "", exchange_rate: "", is_active: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCurrency = async () => {
    if (!editingCurrency) return;

    setSaving(true);
    setError("");
    try {
      await api.currencies.update(editingCurrency, {
        name: currencyForm.name,
        symbol: currencyForm.symbol,
        exchange_rate: parseFloat(currencyForm.exchange_rate),
        is_active: currencyForm.is_active,
      });
      await loadData();
      await refreshCurrencies();
      setEditingCurrency(null);
      setCurrencyForm({ code: "", name: "", symbol: "", exchange_rate: "", is_active: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const startEditCurrency = (currency: ApiCurrency) => {
    setEditingCurrency(currency.id);
    setCurrencyForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchange_rate: currency.exchange_rate.toString(),
      is_active: currency.is_active,
    });
  };

  const handleSetBase = async (id: number) => {
    setSaving(true);
    setError("");
    try {
      await api.currencies.setBase(id);
      await loadData();
      await refreshCurrencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set base currency");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCurrency = async (id: number) => {
    setSaving(true);
    setError("");
    try {
      await api.currencies.delete(id);
      await loadData();
      await refreshCurrencies();
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  // Exchange rate CRUD operations
  const handleCreateRate = async () => {
    if (!rateForm.from_currency_id || !rateForm.to_currency_id || !rateForm.rate || !rateForm.effective_date) {
      setError("From currency, to currency, rate, and effective date are required");
      return;
    }

    if (parseFloat(rateForm.rate) <= 0) {
      setError("Rate must be positive");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.exchangeRates.create({
        from_currency_id: parseInt(rateForm.from_currency_id),
        to_currency_id: parseInt(rateForm.to_currency_id),
        rate: parseFloat(rateForm.rate),
        effective_date: rateForm.effective_date,
        expiry_date: rateForm.expiry_date || null,
      });
      await loadData();
      setCreatingRate(false);
      setRateForm({
        from_currency_id: "",
        to_currency_id: "",
        rate: "",
        effective_date: new Date().toISOString().split('T')[0],
        expiry_date: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create rate failed");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRate = async () => {
    if (!editingRate) return;

    setSaving(true);
    setError("");
    try {
      await api.exchangeRates.update(editingRate, {
        rate: parseFloat(rateForm.rate),
        effective_date: rateForm.effective_date,
        expiry_date: rateForm.expiry_date || null,
      });
      await loadData();
      setEditingRate(null);
      setRateForm({
        from_currency_id: "",
        to_currency_id: "",
        rate: "",
        effective_date: new Date().toISOString().split('T')[0],
        expiry_date: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update rate failed");
    } finally {
      setSaving(false);
    }
  };

  const startEditRate = (rate: ApiExchangeRate) => {
    setEditingRate(rate.id);
    setRateForm({
      from_currency_id: rate.from_currency_id.toString(),
      to_currency_id: rate.to_currency_id.toString(),
      rate: rate.rate.toString(),
      effective_date: rate.effective_date,
      expiry_date: rate.expiry_date || "",
    });
  };

  const handleDeleteRate = async (id: number) => {
    setSaving(true);
    setError("");
    try {
      await api.exchangeRates.delete(id);
      await loadData();
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete rate failed");
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!convertFrom || !convertTo || !convertAmount) {
      setError("Please select currencies and enter amount");
      return;
    }

    setError("");
    try {
      const result = await api.exchangeRates.convert({
        from_currency_id: parseInt(convertFrom),
        to_currency_id: parseInt(convertTo),
        amount: parseFloat(convertAmount) * 100, // Convert to cents
      });
      setConvertResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
      setConvertResult(null);
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
            Manage currencies, exchange rates, and conversions
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border-subtle">
          <button
            onClick={() => setActiveTab("currencies")}
            className={`px-6 py-3 font-mono-tech text-xs uppercase tracking-widest transition-colors ${
              activeTab === "currencies"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe size={14} className="inline mr-2" />
            Currencies
          </button>
          <button
            onClick={() => setActiveTab("rates")}
            className={`px-6 py-3 font-mono-tech text-xs uppercase tracking-widest transition-colors ${
              activeTab === "rates"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowRight size={14} className="inline mr-2" />
            Exchange Rates
          </button>
        </div>

        {/* Currencies Tab */}
        {activeTab === "currencies" && (
          <div>
            <div className="flex justify-end mb-4">
              {!creatingCurrency && !editingCurrency && (
                <button
                  onClick={() => setCreatingCurrency(true)}
                  className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90"
                >
                  <Plus size={14} /> Add Currency
                </button>
              )}
            </div>

            {(creatingCurrency || editingCurrency) && (
              <div className="border border-primary/40 bg-primary/5 p-4 mb-4">
                <h3 className="font-bold text-foreground mb-3">
                  {editingCurrency ? "Edit Currency" : "New Currency"}
                </h3>
                <div className="grid grid-cols-5 gap-3">
                  <input
                    type="text"
                    placeholder="Code (e.g., USD) *"
                    value={currencyForm.code}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })}
                    maxLength={3}
                    disabled={!!editingCurrency}
                    className="field-input uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Name *"
                    value={currencyForm.name}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                    className="field-input"
                  />
                  <input
                    type="text"
                    placeholder="Symbol *"
                    value={currencyForm.symbol}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                    className="field-input"
                  />
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Exchange Rate *"
                    value={currencyForm.exchange_rate}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, exchange_rate: e.target.value })}
                    className="field-input"
                  />
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={currencyForm.is_active}
                      onChange={(e) => setCurrencyForm({ ...currencyForm, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Active
                  </label>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={editingCurrency ? handleUpdateCurrency : handleCreateCurrency}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : editingCurrency ? "Update" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setCreatingCurrency(false);
                      setEditingCurrency(null);
                      setCurrencyForm({ code: "", name: "", symbol: "", exchange_rate: "", is_active: true });
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
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Code</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Name</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Symbol</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Exchange Rate</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Base</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                        Loading…
                      </td>
                    </tr>
                  ) : (
                    currencies.map((currency) => (
                      <tr key={currency.id} className="hover:bg-chassis/50 transition-colors">
                        <td className="px-4 py-3 font-mono-tech font-bold text-foreground">{currency.code}</td>
                        <td className="px-4 py-3 text-foreground">{currency.name}</td>
                        <td className="px-4 py-3 font-mono-tech text-foreground">{currency.symbol}</td>
                        <td className="px-4 py-3 text-right font-mono-tech text-foreground">
                          {Number(currency.exchange_rate).toFixed(6)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border ${
                            currency.is_active
                              ? "border-green-500/30 text-green-500 bg-green-500/5"
                              : "border-red-500/30 text-red-500 bg-red-500/5"
                          }`}>
                            {currency.is_active ? "Active" : "Inactive"}
                          </span>
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
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => startEditCurrency(currency)}
                              disabled={saving}
                              className="text-primary hover:text-primary/80 disabled:opacity-50"
                              title="Edit currency"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ type: 'currency', id: currency.id })}
                              disabled={saving || currency.is_base}
                              className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={currency.is_base ? "Cannot delete base currency" : "Delete currency"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Exchange Rates Tab */}
        {activeTab === "rates" && (
          <div>
            {/* Currency Converter */}
            <div className="border border-border-subtle bg-chassis p-6 mb-6">
              <h3 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">
                Currency Converter
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <select
                  value={convertFrom}
                  onChange={(e) => setConvertFrom(e.target.value)}
                  className="field-input"
                >
                  <option value="">From Currency</option>
                  {currencies.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
                <select
                  value={convertTo}
                  onChange={(e) => setConvertTo(e.target.value)}
                  className="field-input"
                >
                  <option value="">To Currency</option>
                  {currencies.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className="field-input"
                />
                <button
                  onClick={handleConvert}
                  className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90"
                >
                  Convert
                </button>
              </div>
              {convertResult && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/30">
                  <p className="text-sm text-foreground">
                    <span className="font-mono-tech">{Number(convertResult.original_amount).toLocaleString()}</span>
                    {' '} at rate {' '}
                    <span className="font-mono-tech text-primary">{convertResult.rate.toFixed(6)}</span>
                    {' '} = {' '}
                    <span className="font-mono-tech font-bold text-primary">{Number(convertResult.converted_amount).toLocaleString()}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end mb-4">
              {!creatingRate && !editingRate && (
                <button
                  onClick={() => setCreatingRate(true)}
                  className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90"
                >
                  <Plus size={14} /> Add Exchange Rate
                </button>
              )}
            </div>

            {(creatingRate || editingRate) && (
              <div className="border border-primary/40 bg-primary/5 p-4 mb-4">
                <h3 className="font-bold text-foreground mb-3">
                  {editingRate ? "Edit Exchange Rate" : "New Exchange Rate"}
                </h3>
                <div className="grid grid-cols-5 gap-3">
                  <select
                    value={rateForm.from_currency_id}
                    onChange={(e) => setRateForm({ ...rateForm, from_currency_id: e.target.value })}
                    disabled={!!editingRate}
                    className="field-input"
                  >
                    <option value="">From Currency *</option>
                    {currencies.filter(c => c.is_active).map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                  <select
                    value={rateForm.to_currency_id}
                    onChange={(e) => setRateForm({ ...rateForm, to_currency_id: e.target.value })}
                    disabled={!!editingRate}
                    className="field-input"
                  >
                    <option value="">To Currency *</option>
                    {currencies.filter(c => c.is_active).map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Rate *"
                    value={rateForm.rate}
                    onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                    className="field-input"
                  />
                  <input
                    type="date"
                    value={rateForm.effective_date}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setRateForm({ ...rateForm, effective_date: e.target.value })}
                    className="field-input"
                  />
                  <input
                    type="date"
                    placeholder="Expiry Date (optional)"
                    value={rateForm.expiry_date}
                    onChange={(e) => setRateForm({ ...rateForm, expiry_date: e.target.value })}
                    className="field-input"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={editingRate ? handleUpdateRate : handleCreateRate}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : editingRate ? "Update" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setCreatingRate(false);
                      setEditingRate(null);
                      setRateForm({
                        from_currency_id: "",
                        to_currency_id: "",
                        rate: "",
                        effective_date: new Date().toISOString().split('T')[0],
                        expiry_date: "",
                      });
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
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">From</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">To</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Rate</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Effective Date</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Expiry Date</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Set By</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                        Loading…
                      </td>
                    </tr>
                  ) : exchangeRates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No exchange rates found. Add your first rate above.
                      </td>
                    </tr>
                  ) : (
                    exchangeRates.map((rate) => {
                      const today = new Date().toISOString().split('T')[0];
                      const effDate = rate.effective_date.split('T')[0];
                      const isPast = effDate <= today;
                      return (
                        <tr key={rate.id} className="hover:bg-chassis/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono-tech font-bold text-foreground">{rate.from_currency_code}</span>
                            <span className="text-xs text-muted-foreground ml-2">{rate.from_currency_name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono-tech font-bold text-foreground">{rate.to_currency_code}</span>
                            <span className="text-xs text-muted-foreground ml-2">{rate.to_currency_name}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono-tech text-foreground">
                            {Number(rate.rate).toFixed(6)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono-tech text-xs text-foreground">
                            {new Date(rate.effective_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-center font-mono-tech text-xs text-foreground">
                            {rate.expiry_date ? new Date(rate.expiry_date).toLocaleDateString() : "No expiry"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border ${
                              rate.is_active
                                ? "border-green-500/30 text-green-500 bg-green-500/5"
                                : "border-red-500/30 text-red-500 bg-red-500/5"
                            }`}>
                              {rate.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono-tech text-[10px] text-muted-foreground">
                            {rate.created_by_email || <span className="opacity-40">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isPast && !unlockedRates.has(rate.id) ? (
                              <button
                                onClick={() => toggleUnlock(rate.id)}
                                className="flex items-center gap-1 font-mono-tech text-[9px] text-muted-foreground/60 uppercase tracking-widest px-2 py-1 border border-border-subtle/40 hover:border-yellow-500/60 hover:text-yellow-500 transition-colors"
                                title="Unlock to edit or delete"
                              >
                                <Lock size={10} /> Locked
                              </button>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                {isPast && (
                                  <button
                                    onClick={() => toggleUnlock(rate.id)}
                                    className="text-yellow-500 hover:text-yellow-400"
                                    title="Re-lock"
                                  >
                                    <Unlock size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={() => startEditRate(rate)}
                                  disabled={saving}
                                  className="text-primary hover:text-primary/80 disabled:opacity-50"
                                  title="Edit rate"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({ type: 'rate', id: rate.id })}
                                  disabled={saving}
                                  className="text-red-500 hover:text-red-400 disabled:opacity-50"
                                  title="Delete rate"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-admin-surface border border-admin-border p-6 max-w-md">
              <h3 className="text-lg font-bold text-admin-text mb-4">Confirm Delete</h3>
              <p className="text-admin-text-secondary mb-6">
                Are you sure you want to delete this {confirmDelete.type}? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 border border-admin-border text-admin-text"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDelete.type === 'currency') {
                      handleDeleteCurrency(confirmDelete.id);
                    } else {
                      handleDeleteRate(confirmDelete.id);
                    }
                  }}
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
