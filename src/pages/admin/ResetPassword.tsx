import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTenantPath, useTenant } from "@/contexts/TenantContext";
import { api } from "@/lib/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { schemaName } = useTenant();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError("");
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password, schemaName);
      setSuccess(true);
      setTimeout(() => navigate(tp("/admin/login")), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-mono-tech text-[10px] text-red-400 uppercase tracking-widest">Invalid reset link</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <img src="/logo.jpeg" alt="Davin's" className="h-14 mx-auto mb-4 object-contain" />
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase">Reset Password</p>
        </div>

        <div className="border border-border-subtle p-8 space-y-5 bg-chassis">
          {success ? (
            <div className="text-center space-y-3">
              <p className="text-green-400 font-mono-tech text-[11px] uppercase tracking-widest">✅ Password updated</p>
              <p className="text-xs text-muted-foreground">Redirecting to login…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h1 className="text-lg font-bold text-foreground tracking-tight">Set New Password</h1>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech">
                  {error}
                </div>
              )}

              <div>
                <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full h-11 bg-background border border-border-subtle px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>

              <div>
                <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full h-11 bg-background border border-border-subtle px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-background font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
