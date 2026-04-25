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
  let schemaName = req.query.schema || 'public';

  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (payload.schema_name) schemaName = payload.schema_name;
    } catch (_) {}
  }

  tenantStorage.run(schemaName, () => next());
}

export async function requireAuth(req, res, next) {
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
        const isOffline = process.env.OFFLINE_MODE === 'true';
        const errorType = isOffline ? 'LICENSE_EXPIRED' : 'TENANT_SUSPENDED';

        if (tenant.status === 'suspended') {
          return res.status(403).json({ error: errorType });
        }
        if (tenant.status === 'trial' && new Date(tenant.trial_ends_at) < now) {
          // Lazy suspend
          await pool.query(`UPDATE public.tenants SET status='suspended' WHERE schema_name=$1`, [schemaName]);
          clearTenantCache(schemaName);
          return res.status(403).json({ error: isOffline ? 'LICENSE_EXPIRED' : 'TRIAL_EXPIRED' });
        }
        if (tenant.status === 'active' && tenant.subscription_end && new Date(tenant.subscription_end) < now) {
          // Lazy suspend on subscription expiry
          await pool.query(`UPDATE public.tenants SET status='suspended' WHERE schema_name=$1`, [schemaName]);
          clearTenantCache(schemaName);
          return res.status(403).json({ error: errorType });
        }
      }
    }

    // Verify the user still exists in this tenant's schema
    let userValid = false;
    await tenantStorage.run(schemaName, async () => {
      const { rows } = await pool.query("SELECT id FROM users WHERE id = $1", [payload.id]);
      userValid = !!rows[0];
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
