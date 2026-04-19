import { useEffect, useState } from "react";
import { api, ApiAccount, ApiTransaction } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, DollarSign, FileText } from "lucide-react";

type Tab = "accounts" | "transactions";

export default function Accounting() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({ code: "", name: "", account_type: "asset" });
  const [saving, setSaving] = useState(false);
  
  const [creatingTx, setCreatingTx] = useState(false);
  const [txForm, setTxForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    reference: "",
    description: "",
    lines: [] as { account_id: number; debit: number; credit: number }[]
  });

  const loadAccounts = async () => {
    try {
      const data = await api.accounting.accounts.list();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    }
  };

  const loadTransactions = async () => {
    try {
      const data = await api.accounting.transactions.list();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadAccounts(), loadTransactions()]);
      setLoading(false);
    };
    load();
  }, []);

  const handleCreateAccount = async () => {
    if (!accountForm.code || !accountForm.name) return;
    setSaving(true);
    setError("");
    try {
      await api.accounting.accounts.create(accountForm);
      await loadAccounts();
      setCreatingAccount(false);
      setAccountForm({ code: "", name: "", account_type: "asset" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create account failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTransaction = async () => {
    if (txForm.lines.length === 0) {
      setError("At least one line required");
      return;
    }
    const totalDebit = txForm.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = txForm.lines.reduce((sum, l) => sum + l.credit, 0);
    if (totalDebit !== totalCredit) {
      setError("Debits must equal credits");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.accounting.transactions.create(txForm);
      await loadTransactions();
      setCreatingTx(false);
      setTxForm({
        transaction_date: new Date().toISOString().split('T')[0],
        reference: "",
        description: "",
        lines: []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create transaction failed");
    } finally {
      setSaving(false);
    }
  };

  const addTxLine = () => {
    setTxForm(prev => ({
      ...prev,
      lines: [...prev.lines, { account_id: 0, debit: 0, credit: 0 }]
    }));
  };

  const updateTxLine = (index: number, field: string, value: any) => {
    setTxForm(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => i === index ? { ...line, [field]: value } : line)
    }));
  };

  const removeTxLine = (index: number) => {
    setTxForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const totalDebit = txForm.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = txForm.lines.reduce((sum, l) => sum + l.credit, 0);

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Financial Management</p>
          <h1 className="text-2xl font-bold text-foreground">Accounting</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b border-border-subtle">
          <button
            onClick={() => setTab("accounts")}
            className={`px-4 py-2 text-sm font-mono-tech uppercase tracking-widest transition-colors ${
              tab === "accounts" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Chart of Accounts
          </button>
          <button
            onClick={() => setTab("transactions")}
            className={`px-4 py-2 text-sm font-mono-tech uppercase tracking-widest transition-colors ${
              tab === "transactions" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Transactions
          </button>
        </div>

        {tab === "accounts" && (
          <div>
            <div className="flex justify-end mb-4">
              {!creatingAccount && (
                <button
                  onClick={() => setCreatingAccount(true)}
                  className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90"
                >
                  <Plus size={14} /> Add Account
                </button>
              )}
            </div>

            {creatingAccount && (
              <div className="border border-primary/40 bg-primary/5 p-4 mb-4">
                <h3 className="font-bold text-foreground mb-3">New Account</h3>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Account Code *"
                    value={accountForm.code}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, code: e.target.value }))}
                    className="field-input"
                  />
                  <input
                    type="text"
                    placeholder="Account Name *"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                    className="field-input"
                  />
                  <select
                    value={accountForm.account_type}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, account_type: e.target.value }))}
                    className="field-input"
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCreateAccount}
                    disabled={saving || !accountForm.code || !accountForm.name}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setCreatingAccount(false);
                      setAccountForm({ code: "", name: "", account_type: "asset" });
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
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Type</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Debit</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Credit</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                        Loading…
                      </td>
                    </tr>
                  ) : accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-chassis/50 transition-colors">
                      <td className="px-4 py-3 font-mono-tech text-foreground">{account.code}</td>
                      <td className="px-4 py-3 text-foreground">{account.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border border-primary/30 text-primary bg-primary/5">
                          {account.account_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tech text-sm text-foreground">
                        {Number(account.total_debit) > 0 ? Number(account.total_debit).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tech text-sm text-foreground">
                        {Number(account.total_credit) > 0 ? Number(account.total_credit).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tech text-sm font-bold">
                        <span className={Number(account.balance) >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {Number(account.balance).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "transactions" && (
          <div>
            <div className="flex justify-end mb-4">
              {!creatingTx && (
                <button
                  onClick={() => setCreatingTx(true)}
                  className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90"
                >
                  <Plus size={14} /> New Entry
                </button>
              )}
            </div>

            {creatingTx && (
              <div className="border border-primary/40 bg-primary/5 p-4 mb-4">
                <h3 className="font-bold text-foreground mb-3">New Journal Entry</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <input
                    type="date"
                    value={txForm.transaction_date}
                    onChange={(e) => setTxForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                    className="field-input"
                  />
                  <input
                    type="text"
                    placeholder="Reference"
                    value={txForm.reference}
                    onChange={(e) => setTxForm(prev => ({ ...prev, reference: e.target.value }))}
                    className="field-input"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={txForm.description}
                    onChange={(e) => setTxForm(prev => ({ ...prev, description: e.target.value }))}
                    className="field-input"
                  />
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest">Lines</label>
                    <button
                      onClick={addTxLine}
                      className="text-xs text-primary hover:text-primary/80 font-mono-tech uppercase tracking-widest"
                    >
                      + Add Line
                    </button>
                  </div>
                  {txForm.lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                      <select
                        value={line.account_id}
                        onChange={(e) => updateTxLine(index, 'account_id', Number(e.target.value))}
                        className="field-input col-span-6"
                      >
                        <option value={0}>Select Account</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Debit"
                        value={line.debit || ""}
                        onChange={(e) => updateTxLine(index, 'debit', Number(e.target.value) || 0)}
                        className="field-input col-span-2"
                      />
                      <input
                        type="number"
                        placeholder="Credit"
                        value={line.credit || ""}
                        onChange={(e) => updateTxLine(index, 'credit', Number(e.target.value) || 0)}
                        className="field-input col-span-3"
                      />
                      <button
                        onClick={() => removeTxLine(index)}
                        className="col-span-1 text-red-500 hover:text-red-400 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-end gap-4 mt-2 text-sm font-mono-tech">
                    <span className={totalDebit === totalCredit && totalDebit > 0 ? "text-green-500" : "text-muted-foreground"}>
                      Debit: {totalDebit}
                    </span>
                    <span className={totalDebit === totalCredit && totalCredit > 0 ? "text-green-500" : "text-muted-foreground"}>
                      Credit: {totalCredit}
                    </span>
                    <span className={totalDebit === totalCredit && totalDebit > 0 ? "text-green-500 font-bold" : "text-red-500"}>
                      {totalDebit === totalCredit ? "Balanced ✓" : "Unbalanced"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCreateTransaction}
                    disabled={saving || txForm.lines.length === 0 || totalDebit !== totalCredit}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Posting…" : "Post Entry"}
                  </button>
                  <button
                    onClick={() => {
                      setCreatingTx(false);
                      setTxForm({
                        transaction_date: new Date().toISOString().split('T')[0],
                        reference: "",
                        description: "",
                        lines: []
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
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Date</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Reference</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Description</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Debit</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                        Loading…
                      </td>
                    </tr>
                  ) : transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-chassis/50 transition-colors">
                      <td className="px-4 py-3 font-mono-tech text-[11px] text-muted-foreground">
                        {new Date(tx.transaction_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono-tech text-foreground">{tx.reference || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{tx.description || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono-tech text-foreground">
                        {Number(tx.total_debit).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tech text-foreground">
                        {Number(tx.total_credit).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
