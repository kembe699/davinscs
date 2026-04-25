import { createContext, useContext, useEffect, useState } from "react";
import { useParams, useLocation, Outlet, Navigate } from "react-router-dom";
import { setTenantSchema } from "@/lib/api";
import { LayoutProvider } from "./LayoutContext";

interface TenantInfo {
  tenantSlug: string;
  schemaName: string;
  businessName: string;
  needsSetup: boolean;
}

const TenantContext = createContext<TenantInfo | null>(null);

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

  useEffect(() => {
    if (!tenantSlug) {
      setTenantSchema(null);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/saas/tenant/${encodeURIComponent(tenantSlug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error === "LICENSE_EXPIRED") {
          window.location.replace("/license-expired");
          return;
        }
        if (d.error) { 
          setError(d.error); 
          setTenantSchema(null);
          return; 
        }

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

        setTenantSchema(d.schemaName);
        setTenant({
          tenantSlug: d.tenantSlug,
          schemaName: d.schemaName,
          businessName: d.businessName,
          needsSetup: d.needsSetup,
        });
      })
      .catch(() => {
        setError("Failed to load instance");
        setTenantSchema(null);
      })
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl font-bold text-slate-600 mb-4">404</p>
          <p className="text-white text-lg font-semibold mb-2">Instance not found</p>
          <p className="text-slate-400 text-sm mb-6">{error || `No instance exists for "${tenantSlug}"`}</p>
          <a href="/portal" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
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
      <LayoutProvider>
        <Outlet />
      </LayoutProvider>
    </TenantContext.Provider>
  );
}
