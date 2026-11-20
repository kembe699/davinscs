import pool from "../db.js";
import { tenantStorage } from "../tenantStorage.js";

// One-off data changes that have to run against the hosted database. Each task
// runs once: its key is recorded in public.one_time_tasks after it succeeds, so
// later restarts skip it.

const TASKS = [
  {
    // Amazon: show the "pay within 24 hours" reminder, suspend automatically at
    // the deadline below (the subscription sweep and the auth middleware already
    // suspend a tenant whose subscription_end has passed), and add a support
    // admin to their instance.
    key: "2026-11-20-amazon-payment-notice",
    run: async () => {
      const deadline = "2026-11-21T01:00:00Z";
      const { rows } = await pool.query(
        `SELECT id, business_name, schema_name, tenant_slug, status FROM public.tenants
         WHERE business_name ILIKE '%amazon%' OR tenant_slug ILIKE '%amazon%' OR schema_name ILIKE '%amazon%'`
      );
      if (rows.length !== 1) {
        console.warn(`[One-time] Amazon tenant: expected 1 match, found ${rows.length}:`, rows.map((r) => r.tenant_slug));
        return false; // not recorded, so it is retried on the next start
      }
      const tenant = rows[0];

      await pool.query(
        `UPDATE public.tenants
         SET payment_notice_at = NOW(),
             subscription_end = CASE WHEN status = 'active' THEN LEAST(COALESCE(subscription_end, $2::timestamptz), $2::timestamptz) ELSE subscription_end END,
             trial_ends_at    = CASE WHEN status = 'trial'  THEN LEAST(trial_ends_at, $2::timestamptz) ELSE trial_ends_at END
         WHERE id = $1`,
        [tenant.id, deadline]
      );

      // Support admin. Password hash only; the plain password is not stored here.
      const email = "support@nilehc.tech";
      const passwordHash = "$2a$10$SFIqGDuB6uWlFqjLXBCCmupq.OarpXwE/ARK/kZmWu8QuIrDJo/0u";
      await tenantStorage.run(tenant.schema_name, async () => {
        const { rows: roleRows } = await pool.query("SELECT id FROM roles WHERE LOWER(name) = 'admin' ORDER BY id LIMIT 1");
        const roleId = roleRows[0]?.id ?? null;
        const { rows: existing } = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing[0]) {
          await pool.query(
            "UPDATE users SET password_hash = $1, role = 'admin', role_id = COALESCE($2, role_id), is_active = TRUE WHERE id = $3",
            [passwordHash, roleId, existing[0].id]
          );
        } else {
          await pool.query(
            "INSERT INTO users (email, password_hash, role, role_id, name) VALUES ($1, $2, 'admin', $3, 'Support')",
            [email, passwordHash, roleId]
          );
        }
      });
      // Login mapping. Left alone if this email already belongs to another tenant.
      await pool.query(
        `INSERT INTO public.tenant_users (email, tenant_id, schema_name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
        [email, tenant.id, tenant.schema_name]
      );

      console.log(`[One-time] Amazon (${tenant.tenant_slug}): payment notice on, suspends at ${deadline}, support admin added.`);
      return true;
    },
  },
];

export async function runOneTimeTasks() {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS public.one_time_tasks (key VARCHAR(100) PRIMARY KEY, ran_at TIMESTAMPTZ DEFAULT NOW())"
  );
  for (const task of TASKS) {
    try {
      const { rows } = await pool.query("SELECT 1 FROM public.one_time_tasks WHERE key = $1", [task.key]);
      if (rows.length) continue;
      if (await task.run()) {
        await pool.query("INSERT INTO public.one_time_tasks (key) VALUES ($1) ON CONFLICT DO NOTHING", [task.key]);
      }
    } catch (err) {
      console.error(`[One-time] ${task.key} failed:`, err.message);
    }
  }
}
