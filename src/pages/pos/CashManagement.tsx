import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenantPath } from "@/contexts/TenantContext";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { CashDrawerSession } from "@/lib/api";

export default function CashManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { baseCurrency } = useCurrency();
  const [currentSession, setCurrentSession] = useState<CashDrawerSession | null>(null);
  const [sessions, setSessions] = useState<CashDrawerSession[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [showCashInModal, setShowCashInModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [openingCash, setOpeningCash] = useState(0);
  const [closingCash, setClosingCash] = useState(0);
  const [sessionLoading, setSessionLoading] = useState(false);

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
      if (current?.id) {
        const moves = await api.cashDrawer.getMovements(current.id).catch(() => []);
        setMovements(moves);
      } else {
        setMovements([]);
      }
    } catch (err) {
      console.error("Failed to load cash drawer data:", err);
    }
  };

  const handleOpenSession = async () => {
    setSessionLoading(true);
    try {
      await api.cashDrawer.open(openingCash);
      setOpeningCash(0);
      await loadData();
    } catch (err: any) {
      toast(err.message || "Failed to open session", "error", "Error");
    } finally {
      setSessionLoading(false);
    }
  };

  const handleCloseSession = async () => {
    setSessionLoading(true);
    try {
      await api.cashDrawer.close(closingCash);
      setShowCloseModal(false);
      setClosingCash(0);
      await loadData();
    } catch (err: any) {
      toast(err.message || "Failed to close session", "error", "Error");
    } finally {
      setSessionLoading(false);
    }
  };

  const handleCashIn = async () => {
    try {
      await api.cashDrawer.cashIn(amount, reason);
      setShowCashInModal(false);
      setAmount(0);
      setReason("");
      await loadData();
    } catch (err: any) {
      toast(err.message || "Failed to record cash in", "error", "Error");
    }
  };

  const handleCashOut = async () => {
    try {
      await api.cashDrawer.cashOut(amount, reason);
      setShowCashOutModal(false);
      setAmount(0);
      setReason("");
      await loadData();
    } catch (err: any) {
      toast(err.message || "Failed to record cash out", "error", "Error");
    }
  };

  return (
    <div className="min-h-screen bg-admin-bg p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(tp("/pos"))}
          className="px-4 py-2 bg-admin-surface border border-admin-border text-admin-text hover:bg-admin-bg flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to POS
        </button>
        <h1 className="text-2xl font-bold text-admin-text">Cash Management</h1>
      </div>

      {/* Open Session — shown when no active session */}
      {!currentSession && (
        <div className="bg-admin-surface border border-admin-border p-6 mb-6">
          <h2 className="text-lg font-bold text-admin-text mb-1">Open Cash Drawer Session</h2>
          <p className="text-sm text-admin-text-secondary mb-4">Enter the opening float to start a new session.</p>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm text-admin-text-secondary mb-2">Opening Cash Amount</label>
              <input
                type="number"
                min="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(Number(e.target.value))}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-lg font-mono focus:outline-none focus:border-primary"
                placeholder="0"
              />
            </div>
            <button
              onClick={handleOpenSession}
              disabled={sessionLoading}
              className="px-6 py-2 bg-admin-success text-white font-bold hover:opacity-90 disabled:opacity-50"
            >
              {sessionLoading ? "Opening…" : "Open Session"}
            </button>
          </div>
        </div>
      )}

      {/* Current Session — shown when active session exists */}
      {currentSession && (
        <div className="bg-admin-surface border border-admin-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-admin-text">Current Session</h2>
            <span className="px-3 py-1 text-xs font-bold bg-admin-success text-white uppercase tracking-widest">Open</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-admin-text-secondary">Opening Cash</p>
              <p className="text-xl font-mono text-admin-text">{formatCurrencySync(currentSession.opening_cash, baseCurrency?.symbol || 'UGX', false)}</p>
            </div>
            <div>
              <p className="text-sm text-admin-text-secondary">Opened At</p>
              <p className="text-sm text-admin-text">{new Date(currentSession.opened_at).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => setShowCashInModal(true)}
              className="px-4 py-2 bg-admin-success text-white hover:opacity-90 flex items-center gap-2"
            >
              <TrendingUp size={16} /> Cash In
            </button>
            <button
              onClick={() => setShowCashOutModal(true)}
              className="px-4 py-2 bg-admin-danger text-white hover:opacity-90 flex items-center gap-2"
            >
              <TrendingDown size={16} /> Cash Out
            </button>
            <button
              onClick={() => { setClosingCash(currentSession.opening_cash); setShowCloseModal(true); }}
              className="px-4 py-2 bg-admin-surface border border-admin-border text-admin-text hover:bg-admin-bg ml-auto"
            >
              Close Session
            </button>
          </div>

          {/* Movements log for this session */}
          <div className="border-t border-admin-border pt-4">
            <h3 className="text-sm font-semibold text-admin-text mb-3 uppercase tracking-widest">Cash Movements</h3>
            {movements.length === 0 ? (
              <p className="text-sm text-admin-text-secondary py-2">No movements recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-border">
                    <th className="text-left py-2 pr-4 text-admin-text-secondary font-medium">Time</th>
                    <th className="text-left py-2 pr-4 text-admin-text-secondary font-medium">Type</th>
                    <th className="text-left py-2 pr-4 text-admin-text-secondary font-medium">Reason</th>
                    <th className="text-right py-2 text-admin-text-secondary font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m: any) => (
                    <tr key={m.id} className="border-b border-admin-border last:border-0">
                      <td className="py-2 pr-4 text-admin-text-secondary">{new Date(m.created_at).toLocaleTimeString()}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 text-xs font-bold ${m.type === 'in' ? 'bg-admin-success/20 text-admin-success' : 'bg-admin-danger/20 text-admin-danger'}`}>
                          {m.type === 'in' ? '▲ IN' : '▼ OUT'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-admin-text">{m.reason || '—'}</td>
                      <td className={`py-2 text-right font-mono font-semibold ${m.type === 'in' ? 'text-admin-success' : 'text-admin-danger'}`}>
                        {m.type === 'out' ? '-' : '+'}{formatCurrencySync(m.amount, baseCurrency?.symbol || 'UGX', false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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

      {/* Close Session Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border p-6 w-96">
            <h2 className="text-xl font-bold text-admin-text mb-4">Close Cash Drawer Session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-admin-text-secondary mb-2">Closing Cash Amount</label>
                <input
                  type="number"
                  min="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-lg font-mono focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseSession}
                disabled={sessionLoading}
                className="flex-1 px-4 py-2 bg-admin-danger text-white hover:opacity-90 disabled:opacity-50"
              >
                {sessionLoading ? "Closing…" : "Close Session"}
              </button>
            </div>
          </div>
        </div>
      )}

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
