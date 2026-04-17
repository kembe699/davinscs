import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, DollarSign, ShoppingBag, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";

export default function EndOfDay() {
  const navigate = useNavigate();
  const { baseCurrency } = useCurrency();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await api.posReports.endOfDay({ date: selectedDate });
      setReport(data);
    } catch (err) {
      console.error("Failed to load end of day report:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-admin-bg p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate("/pos")}
          className="px-4 py-2 bg-admin-surface border border-admin-border text-admin-text hover:bg-admin-bg flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to POS
        </button>
        <h1 className="text-2xl font-bold text-admin-text">End of Day Report</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 bg-admin-surface border border-admin-border text-admin-text ml-auto"
        />
      </div>

      {loading ? (
        <div className="bg-admin-surface border border-admin-border p-8 text-center text-admin-text-secondary">
          Loading...
        </div>
      ) : !report ? (
        <div className="bg-admin-surface border border-admin-border p-8 text-center text-admin-text-secondary">
          No data available for this date
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-admin-surface border border-admin-border p-4">
              <p className="text-sm text-admin-text-secondary mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-admin-text">{report.total_sales || 0}</p>
            </div>
            <div className="bg-admin-surface border border-admin-border p-4">
              <p className="text-sm text-admin-text-secondary mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-admin-text font-mono">
                {formatCurrencySync(report.total_revenue || 0, baseCurrency?.symbol || 'UGX', false)}
              </p>
            </div>
            <div className="bg-admin-surface border border-admin-border p-4">
              <p className="text-sm text-admin-text-secondary mb-1">Tax Collected</p>
              <p className="text-2xl font-bold text-admin-text font-mono">
                {formatCurrencySync(report.total_tax || 0, baseCurrency?.symbol || 'UGX', false)}
              </p>
            </div>
            <div className="bg-admin-surface border border-admin-border p-4">
              <p className="text-sm text-admin-text-secondary mb-1">Discounts Given</p>
              <p className="text-2xl font-bold text-admin-danger font-mono">
                {formatCurrencySync(report.total_discounts || 0, baseCurrency?.symbol || 'UGX', false)}
              </p>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="bg-admin-surface border border-admin-border">
            <div className="p-4 border-b border-admin-border">
              <h2 className="text-lg font-bold text-admin-text">Payment Methods</h2>
            </div>
            <table className="w-full">
              <thead className="bg-admin-bg border-b border-admin-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Method</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-admin-text">Count</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-admin-text">Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.payment_methods?.map((pm: any, idx: number) => (
                  <tr key={idx} className="border-b border-admin-border">
                    <td className="px-4 py-3 text-sm text-admin-text">{pm.payment_type || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-admin-text text-right">{pm.count}</td>
                    <td className="px-4 py-3 text-sm text-admin-text text-right font-mono">
                      {formatCurrencySync(pm.total || 0, baseCurrency?.symbol || 'UGX', false)}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm text-admin-text-secondary text-center">
                      No payment data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Hourly Sales */}
          <div className="bg-admin-surface border border-admin-border">
            <div className="p-4 border-b border-admin-border">
              <h2 className="text-lg font-bold text-admin-text">Hourly Breakdown</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-6 gap-2">
                {report.hourly_sales?.map((hour: any, idx: number) => (
                  <div key={idx} className="bg-admin-bg border border-admin-border p-3 text-center">
                    <p className="text-xs text-admin-text-secondary">{hour.hour}:00</p>
                    <p className="text-sm font-bold text-admin-text">{hour.count}</p>
                    <p className="text-xs text-admin-text font-mono">
                      {((hour.total || 0) / 100).toFixed(0)}
                    </p>
                  </div>
                )) || (
                  <p className="col-span-6 text-sm text-admin-text-secondary text-center">No hourly data</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-admin-text text-admin-bg hover:opacity-90"
            >
              Print Report
            </button>
            <button
              onClick={loadReport}
              className="px-6 py-2 bg-admin-surface border border-admin-border text-admin-text hover:bg-admin-bg"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
