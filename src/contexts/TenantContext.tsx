import { createContext, useContext, useEffect, useState } from "react";
import { useParams, useLocation, Outlet, Navigate } from "react-router-dom";
import { useLayout } from "@/contexts/LayoutContext";

interface TenantInfo {
  tenantSlug: string;
  schemaName: string;
  businessName: string;
  needsSetup: boolean;
  status: string;
}

const TenantContext = createContext<TenantInfo | null>(null);

const TENANT_SCHEMA_STORAGE_KEY = "tenant_schema_name";
const LAST_ACTIVE_TENANT_STORAGE_KEY = "last_active_tenant_slug";

export function useTenant(): TenantInfo {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside TenantRoot");
  return ctx;
}

/** Returns a function that prefixes any path with the current tenant slug. */
export function useTenantPath() {
  const { tenantSlug } = useTenant();
  return (path: string) => `/${tenantSlug}${path}`;
}

export function TenantRoot() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const location = useLocation();
  const { refreshLayout } = useLayout();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [redirectTried, setRedirectTried] = useState(false);

  useEffect(() => {
    if (!tenantSlug) return;
    setLoading(true);
    setError("");
    fetch(`/api/saas/tenant/${encodeURIComponent(tenantSlug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }

        // ── Stale-token guard ────────────────────────────────────────────────
        // If a JWT from a DIFFERENT tenant is sitting in localStorage every API
        // call will run against the wrong schema.  Detect the mismatch and
        // force a clean reload so all contexts (Auth, Layout, …) re-init fresh.
        const storedToken = localStorage.getItem("cms_token");
        if (storedToken) {
          try {
            const payload = JSON.parse(atob(storedToken.split(".")[1]));
            if (payload.schema_name && payload.schema_name !== d.schemaName) {
              localStorage.removeItem("cms_token");
              localStorage.removeItem("cms_user");
              window.location.replace(window.location.pathname);
              return;
            }
          } catch {
            localStorage.removeItem("cms_token");
            localStorage.removeItem("cms_user");
          }
        }
        // ────────────────────────────────────────────────────────────────────

        // Persist schemaName for public (non-JWT) API requests on this tenant route.
        try {
          sessionStorage.setItem(TENANT_SCHEMA_STORAGE_KEY, d.schemaName || "");
          sessionStorage.setItem(LAST_ACTIVE_TENANT_STORAGE_KEY, d.tenantSlug || "");
          refreshLayout();
        } catch {}

        setTenant({
          tenantSlug: d.tenantSlug,
          schemaName: d.schemaName,
          businessName: d.businessName,
          needsSetup: d.needsSetup,
          status: d.status,
        });
      })
      .catch(() => setError("Failed to load instance"))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  // If the first path segment isn't a tenant (404), try to interpret the URL as a
  // storefront path missing the tenant prefix and redirect using only the active
  // tenant from this browser tab (never cross-jump to another remembered tenant).
  const [willRedirect, setWillRedirect] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!tenantSlug) return;
    if (!error) return;
    if (redirectTried) return;

    try {
      const active = sessionStorage.getItem(LAST_ACTIVE_TENANT_STORAGE_KEY) || localStorage.getItem("saved_tenant_slug");
      const target = (active && active !== tenantSlug) ? active : null;
      if (target) {
        setRedirectTried(true);
        setWillRedirect(true);
        window.location.replace(`/${target}${location.pathname}`);
      }
    } catch {
      // ignore
    }
  }, [loading, error, tenantSlug, redirectTried, location.pathname]);

  // Clear stored schema if we navigated away from a tenant route.
  useEffect(() => {
    if (tenantSlug) return;
    try {
      sessionStorage.removeItem(TENANT_SCHEMA_STORAGE_KEY);
    } catch {}
  }, [tenantSlug]);

  // Listen for mid-session suspensions from API calls
  useEffect(() => {
    const handleSuspended = () => {
      setTenant(prev => prev ? { ...prev, status: "suspended" } : null);
    };
    window.addEventListener("tenant_suspended", handleSuspended);
    return () => window.removeEventListener("tenant_suspended", handleSuspended);
  }, []);

  if (loading || willRedirect) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl font-bold text-foreground mb-4">404</p>
          <p className="text-foreground text-lg font-semibold mb-2">Instance not found</p>
          <p className="text-muted-foreground text-sm mb-6">{error || `No instance exists for "${tenantSlug}"`}</p>
          <a href="/portal" className="text-primary hover:text-primary/80 text-sm transition-colors">
            ← Go to Portal
          </a>
        </div>
      </div>
    );
  }

  const isSetupPath = location.pathname === `/${tenant.tenantSlug}/setup`;

  if (tenant.needsSetup && !isSetupPath) {
    return <Navigate to={`/${tenant.tenantSlug}/setup`} replace />;
  }

  if (!tenant.needsSetup && isSetupPath) {
    return <Navigate to={`/${tenant.tenantSlug}/admin/login`} replace />;
  }

  const isAdminOrPosPath = location.pathname.startsWith(`/${tenant.tenantSlug}/admin`) || location.pathname.startsWith(`/${tenant.tenantSlug}/pos`);
  const isLoginPage = location.pathname === `/${tenant.tenantSlug}/admin/login`;

  if (tenant.status === "suspended" && isAdminOrPosPath && !isLoginPage) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full bg-[#16191f] border border-red-500/30 p-8 text-center rounded-lg shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Subscription Expired</h2>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            Your instance has been suspended due to an expired subscription. Please renew your subscription to restore access to your administration panel and POS. Your public storefront remains active.
          </p>
          <div className="flex flex-col gap-3">
            <a 
              href="https://flippedpos.com/account" 
              className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold py-3 rounded transition-colors uppercase tracking-wider text-sm flex items-center justify-center"
            >
              Renew Subscription
            </a>
            <button 
              onClick={() => {
                localStorage.removeItem("cms_token");
                localStorage.removeItem("cms_user");
                window.location.href = `/${tenant.tenantSlug}/admin/login`;
              }}
              className="w-full bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 font-bold py-3 rounded transition-colors uppercase tracking-wider text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={tenant}>
      <Outlet />
    </TenantContext.Provider>
  );
}
