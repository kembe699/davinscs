import { useState } from "react";
import { api } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { FileText, TrendingUp, DollarSign, Package } from "lucide-react";

type ReportType = "trial-balance" | "income-statement" | "balance-sheet" | "inventory-valuation";

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("trial-balance");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const generateReport = async () => {
    setLoading(true);
    setError("");
    setReportData(null);
    try {
      let data;
      switch (reportType) {
        case "trial-balance":
          data = await api.accounting.reports.trialBalance(asOfDate);
          break;
        case "income-statement":
          data = await api.accounting.reports.incomeStatement(startDate, endDate);
          break;
        case "balance-sheet":
          data = await api.accounting.reports.balanceSheet(asOfDate);
          break;
        case "inventory-valuation":
          data = await api.inventory.valuation();
          break;
      }
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Business Intelligence</p>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setReportType("trial-balance")}
            className={`p-4 border transition-colors text-left ${
              reportType === "trial-balance" ? "border-primary bg-primary/5" : "border-border-subtle hover:border-primary/40"
            }`}
          >
            <FileText className="text-primary mb-2" size={20} />
            <p className="font-bold text-foreground text-sm">Trial Balance</p>
            <p className="text-xs text-muted-foreground mt-1">Account balances</p>
          </button>

          <button
            onClick={() => setReportType("income-statement")}
            className={`p-4 border transition-colors text-left ${
              reportType === "income-statement" ? "border-primary bg-primary/5" : "border-border-subtle hover:border-primary/40"
            }`}
          >
            <TrendingUp className="text-primary mb-2" size={20} />
            <p className="font-bold text-foreground text-sm">Income Statement</p>
            <p className="text-xs text-muted-foreground mt-1">P&L report</p>
          </button>

          <button
            onClick={() => setReportType("balance-sheet")}
            className={`p-4 border transition-colors text-left ${
              reportType === "balance-sheet" ? "border-primary bg-primary/5" : "border-border-subtle hover:border-primary/40"
            }`}
          >
            <DollarSign className="text-primary mb-2" size={20} />
            <p className="font-bold text-foreground text-sm">Balance Sheet</p>
            <p className="text-xs text-muted-foreground mt-1">Financial position</p>
          </button>

          <button
            onClick={() => setReportType("inventory-valuation")}
            className={`p-4 border transition-colors text-left ${
              reportType === "inventory-valuation" ? "border-primary bg-primary/5" : "border-border-subtle hover:border-primary/40"
            }`}
          >
            <Package className="text-primary mb-2" size={20} />
            <p className="font-bold text-foreground text-sm">Inventory Valuation</p>
            <p className="text-xs text-muted-foreground mt-1">Stock value</p>
          </button>
        </div>

        <div className="border border-border-subtle p-4 mb-6 bg-chassis">
          <h3 className="font-bold text-foreground mb-3">Report Parameters</h3>
          <div className="flex gap-3 items-end">
            {(reportType === "income-statement") && (
              <>
                <div>
                  <label className="block text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="field-input"
                  />
                </div>
              </>
            )}
            {(reportType === "trial-balance" || reportType === "balance-sheet") && (
              <div>
                <label className="block text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">As of Date</label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="field-input"
                />
              </div>
            )}
            <button
              onClick={generateReport}
              disabled={loading}
              className="h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Generating…" : "Generate Report"}
            </button>
          </div>
        </div>

        {reportData && (
          <div className="border border-border-subtle p-6 bg-background">
            {reportType === "trial-balance" && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Trial Balance</h2>
                <p className="text-sm text-muted-foreground mb-4">As of {asOfDate}</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border-subtle">
                      <th className="text-left py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Account</th>
                      <th className="text-right py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Debit</th>
                      <th className="text-right py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.accounts.map((acc: any) => (
                      <tr key={acc.code} className="border-b border-border-subtle">
                        <td className="py-2">{acc.code} - {acc.name}</td>
                        <td className="text-right font-mono-tech">{(acc.total_debit / 100).toFixed(2)}</td>
                        <td className="text-right font-mono-tech">{(acc.total_credit / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border-subtle font-bold">
                      <td className="py-2">TOTAL</td>
                      <td className="text-right font-mono-tech">{(reportData.total_debit / 100).toFixed(2)}</td>
                      <td className="text-right font-mono-tech">{(reportData.total_credit / 100).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {reportType === "income-statement" && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Income Statement</h2>
                <p className="text-sm text-muted-foreground mb-4">{startDate} to {endDate}</p>
                
                <div className="mb-6">
                  <h3 className="font-bold text-foreground mb-2">Revenue</h3>
                  {reportData.revenue.map((acc: any) => (
                    <div key={acc.code} className="flex justify-between py-1 text-sm">
                      <span>{acc.name}</span>
                      <span className="font-mono-tech">${(acc.amount / 100).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t border-border-subtle font-bold">
                    <span>Total Revenue</span>
                    <span className="font-mono-tech">${(reportData.total_revenue / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold text-foreground mb-2">Expenses</h3>
                  {reportData.expenses.map((acc: any) => (
                    <div key={acc.code} className="flex justify-between py-1 text-sm">
                      <span>{acc.name}</span>
                      <span className="font-mono-tech">${(Math.abs(acc.amount) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t border-border-subtle font-bold">
                    <span>Total Expenses</span>
                    <span className="font-mono-tech">${(reportData.total_expenses / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className={`flex justify-between py-3 border-t-2 border-border-subtle text-lg font-bold ${
                  reportData.net_income >= 0 ? "text-green-500" : "text-red-500"
                }`}>
                  <span>Net Income</span>
                  <span className="font-mono-tech">${(reportData.net_income / 100).toFixed(2)}</span>
                </div>
              </div>
            )}

            {reportType === "balance-sheet" && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Balance Sheet</h2>
                <p className="text-sm text-muted-foreground mb-4">As of {asOfDate}</p>
                
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-bold text-foreground mb-2">Assets</h3>
                    {reportData.assets.map((acc: any) => (
                      <div key={acc.code} className="flex justify-between py-1 text-sm">
                        <span>{acc.name}</span>
                        <span className="font-mono-tech">${(acc.balance / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-t border-border-subtle font-bold">
                      <span>Total Assets</span>
                      <span className="font-mono-tech">${(reportData.total_assets / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-6">
                      <h3 className="font-bold text-foreground mb-2">Liabilities</h3>
                      {reportData.liabilities.map((acc: any) => (
                        <div key={acc.code} className="flex justify-between py-1 text-sm">
                          <span>{acc.name}</span>
                          <span className="font-mono-tech">${(Math.abs(acc.balance) / 100).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 border-t border-border-subtle font-bold">
                        <span>Total Liabilities</span>
                        <span className="font-mono-tech">${(reportData.total_liabilities / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-foreground mb-2">Equity</h3>
                      {reportData.equity.map((acc: any) => (
                        <div key={acc.code} className="flex justify-between py-1 text-sm">
                          <span>{acc.name}</span>
                          <span className="font-mono-tech">${(Math.abs(acc.balance) / 100).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 border-t border-border-subtle font-bold">
                        <span>Total Equity</span>
                        <span className="font-mono-tech">${(reportData.total_equity / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reportType === "inventory-valuation" && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Inventory Valuation</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border border-border-subtle p-4">
                    <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Total Products</p>
                    <p className="text-2xl font-bold text-foreground">{reportData.total_products}</p>
                  </div>
                  <div className="border border-border-subtle p-4">
                    <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Total Units</p>
                    <p className="text-2xl font-bold text-foreground">{reportData.total_units}</p>
                  </div>
                  <div className="border border-border-subtle p-4">
                    <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Total Value</p>
                    <p className="text-2xl font-bold text-primary">${(reportData.total_value / 100).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
