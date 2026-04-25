import { useState, useEffect } from "react";
import { ArrowRight, AlertCircle, CheckCircle2, Building2, Globe, RotateCcw } from "lucide-react";

export default function Portal() {
  const [customerCode, setCustomerCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<{ businessName: string; needsSetup: boolean; schemaName: string; tenantSlug: string } | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (import.meta.env.VITE_OFFLINE_MODE === "true") {
      fetch("/api/offline/status")
        .then(res => res.json())
        .then(data => {
          if (data.configured && data.license?.tenant_slug) {
            window.location.replace(`/${data.license.tenant_slug}/admin/login`);
          }
        })
        .catch(console.error);
      return;
    }

    const savedSlug = localStorage.getItem("saved_tenant_slug");
    if (savedSlug) {
      window.location.replace(`/${savedSlug}/admin/login`);
    }
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFound(null);

    try {
      const res = await fetch("/api/saas/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerCode: customerCode.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Lookup failed");
      }

      setFound(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!found) return;
    if (!found.tenantSlug) {
      setError("Instance URL not available. Please contact support.");
      return;
    }
    
    if (rememberMe) {
      localStorage.setItem("saved_tenant_slug", found.tenantSlug);
    }

    if (import.meta.env.VITE_OFFLINE_MODE === "true" && found.needsSetup) {
      window.location.href = `/offline-setup?code=${customerCode}`;
      return;
    }
    
    const dest = found.needsSetup
      ? `/${found.tenantSlug}/setup`
      : `/${found.tenantSlug}/admin/login`;
    window.location.href = dest;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">

      {/* Logo & branding */}
      <div className="text-center mb-8">
        <img
          src="/logo.png"
          alt="FlippedPOS"
          className="h-20 w-auto mx-auto mb-5 object-contain"
        />
        <p className="font-mono-tech text-[10px] text-primary tracking-[0.5em] uppercase mb-1">
          Instance Portal
        </p>
        <p className="text-xs text-white">
          Enter your customer code to access your POS instance
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-xs bg-chassis border border-border-subtle p-6">

        {!found ? (
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="font-mono-tech text-[10px] text-white uppercase tracking-widest block mb-2">
                Customer Code
              </label>
              <input
                type="text"
                required
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value.toUpperCase())}
                placeholder="FP-XXXX-XXXX"
                className="w-full h-11 bg-background border border-border-subtle px-4 text-foreground font-mono text-sm tracking-widest text-center placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors uppercase"
                spellCheck={false}
                autoComplete="off"
              />
              <p className="mt-1.5 text-[10px] text-white/70 text-center font-mono-tech">
                Received after registering at flippedpos.com
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono-tech">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || customerCode.trim().length < 3}
              className="w-full h-11 bg-primary text-background font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Validating…
                </>
              ) : (
                <>Find My Instance <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Found banner */}
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-mono-tech text-[10px] text-primary uppercase tracking-widest">Instance Found</p>
                <p className="text-sm font-bold text-foreground truncate mt-0.5">{found.businessName}</p>
                {found.tenantSlug && (
                  <p className="text-[10px] text-white/70 font-mono flex items-center gap-1 mt-0.5">
                    <Globe className="w-3 h-3" />
                    /{found.tenantSlug}/
                  </p>
                )}
              </div>
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            </div>

            {/* Status info */}
            <div className="p-3 border border-border-subtle bg-background/30 text-center">
              {found.needsSetup ? (
                <>
                  <p className="font-mono-tech text-[10px] text-yellow-400 uppercase tracking-widest mb-1">Setup Required</p>
                  <p className="text-xs text-white">
                    Your instance needs first-time configuration. The setup wizard will guide you.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-mono-tech text-[10px] text-primary uppercase tracking-widest mb-1">Instance Active</p>
                  <p className="text-xs text-white">
                    Ready to go. Proceed to login with your admin credentials.
                  </p>
                </>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2 pb-1 justify-center">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 bg-background border border-border-subtle rounded-none text-primary focus:ring-primary focus:ring-offset-background"
              />
              <span className="font-mono-tech text-[10px] text-white uppercase tracking-widest">
                Remember this device
              </span>
            </label>

            <button
              onClick={handleContinue}
              className="w-full h-11 bg-primary text-background font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {found.needsSetup ? "Start Setup Wizard" : "Go to Login"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => { setFound(null); setCustomerCode(""); }}
              className="w-full text-center text-[10px] font-mono-tech text-white/70 hover:text-white transition-colors py-1 flex items-center justify-center gap-1.5 uppercase tracking-widest"
            >
              <RotateCcw className="w-3 h-3" /> Use a different code
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] font-mono-tech text-white/70 mt-6 uppercase tracking-widest">
        No account?{" "}
        <a
          href="https://flippedpos-website.onrender.com/register"
          className="text-white underline hover:text-white/80 transition-colors"
        >
          Register at flippedpos.com
        </a>
      </p>
    </div>
  );
}
