import cron from "node-cron";
import pool from "../db.js";
import { tenantStorage } from "../tenantStorage.js";
import { notifyAdmins } from "../utils/notifications.js";

// Once-a-day summary push for admins who'd rather get one digest than a push
// per shift. Runs at 21:00 server time — no per-tenant schedule/opt-out yet,
// so this is intentionally "on for everyone" for v1.
async function runDailyDigest() {
  const { rows: tenants } = await pool.query(
    "SELECT schema_name FROM public.tenants WHERE status = 'active' OR status = 'trial'"
  );

  for (const { schema_name } of tenants) {
    try {
      await tenantStorage.run(schema_name, async () => {
        const { rows } = await pool.query(
          `SELECT COUNT(*) AS transactions, COALESCE(SUM(total_amount), 0) AS total_sales
           FROM pos_sales
           WHERE DATE(created_at) = CURRENT_DATE AND voided = false AND status != 'held'`
        );
        const { transactions, total_sales } = rows[0];
        if (Number(transactions) === 0) return; // nothing sold — skip the noise

        await notifyAdmins({
          type: 'daily_digest',
          title: "Today's summary",
          body: `${transactions} sale(s) · ${Number(total_sales).toLocaleString()} total`,
          referenceType: 'daily_digest',
          referenceId: null,
        });
      });
    } catch (err) {
      console.error(`Daily digest failed for ${schema_name}:`, err.message);
    }
  }
}

export function startDailyDigestJob() {
  cron.schedule("0 21 * * *", runDailyDigest);
}
