import { useState, useEffect } from "react";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { CashDrawerSession } from "@/lib/api";

export default function CashManagement() {
  const navigate = useNavigate();
  const { baseCurrency } = useCurrency();
  const [currentSession, setCurrentSession] = useState<CashDrawerSession | null>(null);
  const [sessions, setSessions] = useState<CashDrawerSession[]>([]);
  const [showCashInModal, setShowCashInModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [current, allSessions] = await Promise.all([
        api.cashDrawer.getCurrent().catch(() => null),
        api.cashDrawer.getSessions(),
      ]);
      setCurrentSession(current);
      setSessions(allSessions);
    } catch (err) {
      console.error("Failed to load cash drawer data:", err);
    }
  };

  const handleCashIn = async () => {
    try {
      await api.cashDrawer.cashIn(amount, reason);
      setShowCashInModal(false);
      setAmount(0);
      setReason("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record cash in");
    }
  };

  const handleCashOut = async () => {
    try {
      await api.cashDrawer.cashOut(amount, reason);
      setShowCashOutModal(false);
      setAmount(0);
      setReason("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record cash out");
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
        <h1 className="text-2xl font-bold text-admin-text">Cash Management</h1>
      </div>

      {/* Current Session */}
      {currentSession && (
        <div className="bg-admin-surface border border-admin-border p-6 mb-6">
          <h2 className="text-lg font-bold text-admin-text mb-4">Current Session</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-admin-text-secondary">Opening Cash</p>
              <p className="text-xl font-mono text-admin-text">{formatCurrencySync(currentSession.opening_cash, baseCurrency?.symbol || 'UGX', false)}</p>
            </div>
            <div>
              <p className="text-sm text-admin-text-secondary">Opened At</p>
              <p className="text-sm text-admin-text">{new Date(currentSession.opened_at).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowCashInModal(true)}
              className="px-4 py-2 bg-admin-success text-white hover:opacity-90"
            >
              Cash In
            </button>
            <button
              onClick={() => setShowCashOutModal(true)}
              className="px-4 py-2 bg-admin-danger text-white hover:opacity-90"
            >
              Cash Out
            </button>
          </div>
        </div>
      )}

      {/* Sessions History */}
      <div className="bg-admin-surface border border-admin-border">
        <div className="p-4 border-b border-admin-border">
          <h2 className="text-lg font-bold text-admin-text">Session History</h2>
        </div>
        <table className="w-full">
          <thead className="bg-admin-bg border-b border-admin-border">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Opened</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Closed</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-admin-text">Opening</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-admin-text">Closing</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-admin-text">Difference</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-admin-text">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-admin-border hover:bg-admin-bg">
                <td className="px-4 py-3 text-sm text-admin-text">
                  {new Date(session.opened_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-admin-text">
                  {session.closed_at ? new Date(session.closed_at).toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-admin-text text-right font-mono">
                  {formatCurrencySync(session.opening_cash, baseCurrency?.symbol || 'UGX', false)}
                </td>
                <td className="px-4 py-3 text-sm text-admin-text text-right font-mono">
                  {session.closing_cash ? formatCurrencySync(session.closing_cash, baseCurrency?.symbol || 'UGX', false) : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {session.cash_difference ? (
                    <span className={session.cash_difference >= 0 ? 'text-admin-success' : 'text-admin-danger'}>
                      {formatCurrencySync(session.cash_difference, baseCurrency?.symbol || 'UGX', false)}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 text-xs ${
                    session.status === 'open' 
                      ? 'bg-admin-success text-white' 
                      : 'bg-admin-border text-admin-text-secondary'
                  }`}>
                    {session.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cash In Modal */}
      {showCashInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border p-6 w-96">
            <h2 className="text-xl font-bold text-admin-text mb-4">Cash In</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">Amount (in cents)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                />
              </div>
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCashInModal(false)}
                className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleCashIn}
                className="flex-1 px-4 py-2 bg-admin-success text-white hover:opacity-90"
              >
                Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Out Modal */}
      {showCashOutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border p-6 w-96">
            <h2 className="text-xl font-bold text-admin-text mb-4">Cash Out</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">Amount (in cents)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                />
              </div>
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCashOutModal(false)}
                className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleCashOut}
                className="flex-1 px-4 py-2 bg-admin-danger text-white hover:opacity-90"
              >
                Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
