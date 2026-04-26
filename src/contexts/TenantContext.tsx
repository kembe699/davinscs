import { createContext, useContext, useEffect, useState } from "react";
import { useParams, useLocation, Outlet, Navigate } from "react-router-dom";

interface TenantInfo {
  tenantSlug: string;
  schemaName: string;
  businessName: string;
  needsSetup: boolean;
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
        } catch {}

        setTenant({
          tenantSlug: d.tenantSlug,
          schemaName: d.schemaName,
          businessName: d.businessName,
          needsSetup: d.needsSetup,
        });
      })
      .catch(() => setError("Failed to load instance"))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  // If the first path segment isn't a tenant (404), try to interpret the URL as a
  // storefront path missing the tenant prefix and redirect using only the active
  // tenant from this browser tab (never cross-jump to another remembered tenant).
  useEffect(() => {
    if (loading) return;
    if (!tenantSlug) return;
    if (!error) return;
    if (redirectTried) return;

    try {
      const active = sessionStorage.getItem(LAST_ACTIVE_TENANT_STORAGE_KEY);
      const target = (active && active !== tenantSlug) ? active : null;
      if (target) {
        setRedirectTried(true);
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

  if (loading) {
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

  return (
    <TenantContext.Provider value={tenant}>
      <Outlet />
    </TenantContext.Provider>
  );
}
