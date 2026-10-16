import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenantPath } from "@/contexts/TenantContext";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrencySync } from "@/utils/currency";
import { CashDrawerSession } from "@/lib/api";

export default function CashManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { baseCurrency } = useCurrency();
  const { user } = useAuth();

  // Waiters never open/close the drawer or move cash — a Waiter who reaches
  // this screen by direct URL (ProtectedRoute only checks for a token, not
  // role) gets bounced straight back to the POS cart, same defense-in-depth
  // pattern as AdminLayout's cashier redirect.
  useEffect(() => {
    if (user?.role_name?.toLowerCase() === 'waiter') {
      navigate(tp("/pos"), { replace: true });
    }
  }, [user, navigate, tp]);
  const [currentSession, setCurrentSession] = useState<CashDrawerSession | null>(null);
  const [sessions, setSessions] = useState<CashDrawerSession[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [showCashInModal, setShowCashInModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [openingCash, setOpeningCash] = useState(0);
  const [closingCash, setClosingCash] = useState(0);
  const [sessionLoading, setSessionLoading] = useState(false);

  useEffect(() => {
    loadData();
    const intervalId = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(intervalId);
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
    const parsed = Number(amount);
    if (!amount || !(parsed > 0)) { toast("Enter an amount", "warning", "Required"); return; }
    try {
      await api.cashDrawer.cashIn(parsed, reason);
      setShowCashInModal(false);
      setAmount("");
      setReason("");
      await loadData();
    } catch (err: any) {
      toast(err.message || "Failed to record cash in", "error", "Error");
    }
  };

  const handleCashOut = async () => {
    const parsed = Number(amount);
    if (!amount || !(parsed > 0)) { toast("Enter an amount", "warning", "Required"); return; }
    try {
      await api.cashDrawer.cashOut(parsed, reason);
      setShowCashOutModal(false);
      setAmount("");
      setReason("");
      await loadData();
    } catch (err: any) {
      toast(err.message || "Failed to record cash out", "error", "Error");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(tp("/pos"))}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 hover:bg-[#F8F9FA] dark:bg-gray-900 flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to POS
        </button>
        <h1 className="text-2xl font-bold text-[#1A1A2E] dark:text-gray-100">Cash Management</h1>
      </div>

      {/* Open Session — shown when no active session */}
      {!currentSession && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-gray-100 mb-1">Open Cash Drawer Session</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Enter the opening float to start a new session.</p>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Opening Cash Amount</label>
              <input
                type="number"
                min="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 text-lg font-mono focus:outline-none focus:border-primary"
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
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-gray-100">Current Session</h2>
            <span className="px-3 py-1 text-xs font-bold bg-admin-success text-white uppercase tracking-widest">Open</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Opening Cash</p>
              <p className="text-xl font-mono text-[#1A1A2E] dark:text-gray-100">{formatCurrencySync(currentSession.opening_cash, baseCurrency?.symbol || 'UGX', true)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Opened At</p>
              <p className="text-sm text-[#1A1A2E] dark:text-gray-100">{new Date(currentSession.opened_at).toLocaleString()}</p>
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
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 hover:bg-[#F8F9FA] dark:bg-gray-900 ml-auto"
            >
              Close Session
            </button>
          </div>

          {/* Movements log for this session */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-[#1A1A2E] dark:text-gray-100 mb-3 uppercase tracking-widest">Cash Movements</h3>
            {movements.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No movements recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Time</th>
                    <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Type</th>
                    <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Reason</th>
                    <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m: any) => (
                    <tr key={m.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{new Date(m.created_at).toLocaleTimeString()}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 text-xs font-bold ${m.type === 'in' ? 'bg-admin-success/20 text-admin-success' : 'bg-admin-danger/20 text-admin-danger'}`}>
                          {m.type === 'in' ? '▲ IN' : '▼ OUT'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-[#1A1A2E] dark:text-gray-100">{m.reason || '—'}</td>
                      <td className={`py-2 text-right font-mono font-semibold ${m.type === 'in' ? 'text-admin-success' : 'text-admin-danger'}`}>
                        {m.type === 'out' ? '-' : '+'}{formatCurrencySync(m.amount, baseCurrency?.symbol || 'UGX', true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sessions History */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-gray-100">Session History</h2>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F8F9FA] dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-[#1A1A2E] dark:text-gray-100">Opened</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[#1A1A2E] dark:text-gray-100">Closed</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-[#1A1A2E] dark:text-gray-100">Opening</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-[#1A1A2E] dark:text-gray-100">Closing</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-[#1A1A2E] dark:text-gray-100">Difference</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[#1A1A2E] dark:text-gray-100">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-[#F8F9FA] dark:bg-gray-900">
                <td className="px-4 py-3 text-sm text-[#1A1A2E] dark:text-gray-100">
                  {new Date(session.opened_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-[#1A1A2E] dark:text-gray-100">
                  {session.closed_at ? new Date(session.closed_at).toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-[#1A1A2E] dark:text-gray-100 text-right font-mono">
                  {formatCurrencySync(session.opening_cash, baseCurrency?.symbol || 'UGX', true)}
                </td>
                <td className="px-4 py-3 text-sm text-[#1A1A2E] dark:text-gray-100 text-right font-mono">
                  {session.closing_cash ? formatCurrencySync(session.closing_cash, baseCurrency?.symbol || 'UGX', true) : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {session.cash_difference ? (
                    <span className={session.cash_difference >= 0 ? 'text-admin-success' : 'text-admin-danger'}>
                      {formatCurrencySync(session.cash_difference, baseCurrency?.symbol || 'UGX', true)}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 text-xs ${
                    session.status === 'open' 
                      ? 'bg-admin-success text-white' 
                      : 'bg-admin-border text-gray-500 dark:text-gray-400'
                  }`}>
                    {session.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Close Session Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 w-96">
            <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-gray-100 mb-4">Close Cash Drawer Session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Closing Cash Amount</label>
                <input
                  type="number"
                  min="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 text-lg font-mono focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-4 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 hover:bg-white dark:bg-gray-800"
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 w-96">
            <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-gray-100 mb-4">Cash In</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Amount (in cents)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCashInModal(false)}
                className="flex-1 px-4 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 hover:bg-white dark:bg-gray-800"
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 w-96">
            <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-gray-100 mb-4">Cash Out</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Amount (in cents)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCashOutModal(false)}
                className="flex-1 px-4 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 hover:bg-white dark:bg-gray-800"
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
