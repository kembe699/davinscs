import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AlertCircle, CheckCircle2, Server, Globe } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function OfflineSetup() {
  const [searchParams] = useSearchParams();
  const [customerCode, setCustomerCode] = useState(searchParams.get("code") || "");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tenantSlug, setTenantSlug] = useState("");

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/offline/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerCode, adminEmail, adminPassword }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Setup failed");
      }

      setTenantSlug(data.tenantSlug);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm bg-chassis border border-border-subtle p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Offline Node Configured</h2>
          <p className="text-sm text-muted-foreground">
            Your local instance has successfully synced with the master server. You can now operate entirely offline!
          </p>
          <button
            onClick={() => window.location.href = `/${tenantSlug}/admin/login`}
            className="w-full h-11 bg-primary text-background font-bold uppercase tracking-widest text-xs hover:bg-primary/90 mt-4"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <Server className="w-10 h-10 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground uppercase tracking-widest">Offline Setup</h1>
        <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
          Connect this local node to your online account to sync your license status.
        </p>
      </div>

      <div className="w-full max-w-sm bg-chassis border border-border-subtle p-6">
        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
              Customer Code
            </label>
            <input
              type="text"
              required
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value.toUpperCase())}
              placeholder="FP-XXXX-XXXX"
              className="w-full h-11 bg-background border border-border-subtle px-4 text-foreground font-mono text-sm tracking-widest uppercase focus:border-primary/60"
            />
          </div>

          <div>
            <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
              Local Admin Email
            </label>
            <input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@local.com"
              className="w-full h-11 bg-background border border-border-subtle px-4 text-foreground text-sm focus:border-primary/60"
            />
          </div>

          <div>
            <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
              Local Admin Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 bg-background border border-border-subtle px-4 text-foreground text-sm focus:border-primary/60"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Set the password you will use to log into this local machine.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary text-background font-bold uppercase tracking-widest text-xs hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            {loading ? "Syncing..." : <><Globe className="w-4 h-4"/> Connect & Setup</>}
          </button>
        </form>
      </div>
    </div>
  );
}
