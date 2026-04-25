import { useState } from "react";
import { AlertTriangle, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LicenseExpired() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { logout } = useAuth();

  const handleSync = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/offline/sync", {
        method: "POST",
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync license.");
      }

      setSuccess("License successfully synchronized! Returning to login...");
      
      // Force user to login again after license refresh
      setTimeout(() => {
        logout();
        window.location.replace("/portal");
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-chassis border border-red-500/30 p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        
        <div>
          <h1 className="text-xl font-bold text-red-500 uppercase tracking-widest mb-2">License Suspended</h1>
          <p className="text-sm text-muted-foreground">
            This local installation's license has expired or is suspended. Please pay for your subscription online, and then sync this machine to restore access.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-left">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {success}
          </div>
        )}

        <button
          onClick={handleSync}
          disabled={loading || !!success}
          className="w-full h-12 bg-primary text-background font-bold uppercase tracking-widest text-xs hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {loading ? "Syncing with Master Server..." : "Sync License Online"}
        </button>

        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          Internet connection required to sync.
        </p>
      </div>
    </div>
  );
}
