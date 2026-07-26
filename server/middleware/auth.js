import jwt from "jsonwebtoken";
import pool from "../db.js";
import { tenantStorage } from "../tenantStorage.js";

const tenantStatusCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function clearTenantCache(schemaName) {
  if (schemaName) tenantStatusCache.delete(schemaName);
}

async function getTenantStatus(schemaName) {
  const cached = tenantStatusCache.get(schemaName);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;
  const { rows } = await pool.query(
    'SELECT status, trial_ends_at, subscription_end, schema_name FROM public.tenants WHERE schema_name = $1',
    [schemaName]
  );
  const data = rows[0] || null;
  tenantStatusCache.set(schemaName, { data, ts: Date.now() });
  return data;
}

// Middleware for public routes that still need tenant schema context.
// Reads schema_name from Bearer token (if present) or ?schema= query param.
// Never rejects — falls back to 'public' when neither is available.
export function optionalTenantContext(req, res, next) {
  const runWith = (schema) => tenantStorage.run(schema || "public", () => next());
  const explicitSchema = typeof req.query.schema === "string" ? req.query.schema.trim() : "";
  if (explicitSchema) return runWith(explicitSchema);

  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (payload.schema_name) return runWith(payload.schema_name);
    } catch (_) {}
  }

  // For tenant-prefixed storefront routes (/:tenantSlug/...), derive schema from slug
  // before falling back to public. This keeps cart requests deterministic.
  const parts = (req.path || "").split("/").filter(Boolean);
  if (parts.length > 0 && parts[0] !== "api" && parts[0] !== "portal") {
    const tenantSlug = parts[0];
    return pool
      .query("SELECT schema_name FROM public.tenants WHERE tenant_slug = $1 LIMIT 1", [tenantSlug])
      .then(({ rows }) => runWith(rows[0]?.schema_name || "public"))
      .catch(() => runWith("public"));
  }

  return runWith("public");
}

// Shared by requireAuth and requireAuthAllowSuspended below. Always performs
// the lazy-suspend DB write when a trial/subscription has lapsed (so tenant
// status is accurate everywhere, e.g. the mobile app's license gate reading
// it back via GET /api/auth/me), but only *blocks* the request when
// `allowSuspended` is false.
async function authenticate(req, res, next, { allowSuspended = false } = {}) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;

    const schemaName = payload.schema_name || 'public';

    // Check tenant status (suspended / trial expired) with 5-min cache
    if (schemaName !== 'public') {
      const tenant = await getTenantStatus(schemaName);
      if (tenant) {
        const now = new Date();
        if (tenant.status === 'suspended') {
          if (!allowSuspended) return res.status(403).json({ error: 'TENANT_SUSPENDED' });
        } else if (tenant.status === 'trial' && new Date(tenant.trial_ends_at) < now) {
          // Lazy suspend
          await pool.query(`UPDATE public.tenants SET status='suspended' WHERE schema_name=$1`, [schemaName]);
          tenantStatusCache.delete(schemaName);
          if (!allowSuspended) return res.status(403).json({ error: 'TRIAL_EXPIRED' });
        } else if (tenant.status === 'active' && tenant.subscription_end && new Date(tenant.subscription_end) < now) {
          // Lazy suspend on subscription expiry
          await pool.query(`UPDATE public.tenants SET status='suspended' WHERE schema_name=$1`, [schemaName]);
          tenantStatusCache.delete(schemaName);
          if (!allowSuspended) return res.status(403).json({ error: 'TENANT_SUSPENDED' });
        }
      }
    }

    // Verify the user still exists — and hasn't been suspended — in this tenant's schema
    let userValid = false;
    await tenantStorage.run(schemaName, async () => {
      const { rows } = await pool.query("SELECT id, is_active FROM users WHERE id = $1", [payload.id]);
      userValid = !!rows[0] && rows[0].is_active !== false;
    });
    if (!userValid) {
      return res.status(401).json({ error: "Session invalid — please log in again" });
    }

    // Call next() inside a SYNCHRONOUS tenantStorage.run so that Promises created
    // by async route handlers inherit this schema context via async-context propagation.
    tenantStorage.run(schemaName, () => next());
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function requireAuth(req, res, next) {
  return authenticate(req, res, next, { allowSuspended: false });
}

// Same auth/user checks as requireAuth, but never blocks on tenant status —
// for the handful of routes a suspended tenant must still be able to reach
// (checking their own status, paying the license fee) so the mobile app's
// license gate has something to poll instead of 403-ing itself.
export async function requireAuthAllowSuspended(req, res, next) {
  return authenticate(req, res, next, { allowSuspended: true });
}
