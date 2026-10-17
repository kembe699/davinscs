import express from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";
import { tenantStorage } from "../tenantStorage.js";
import { sendError } from "../utils/errorResponse.js";

const router = express.Router();

// Check if first-time setup is needed (no company_settings configured yet)
// Optional ?schema=<schemaName> query param for SaaS tenant context
router.get("/status", async (req, res) => {
  const schemaName = req.query.schema || "public";
  try {
    let needsSetup;
    await tenantStorage.run(schemaName, async () => {
      const { rows } = await pool.query("SELECT COUNT(*) FROM company_settings");
      needsSetup = parseInt(rows[0].count) === 0;
    });

    // Only hand back the registrant's business name / email while setup is still
    // pending, so this stays scoped to prefilling the onboarding wizard rather
    // than becoming a general way to look up a tenant's admin email.
    let businessName = null;
    let email = null;
    if (needsSetup && schemaName !== "public") {
      const { rows } = await pool.query(
        `SELECT t.business_name, tu.email
         FROM public.tenants t
         LEFT JOIN public.tenant_users tu ON tu.tenant_id = t.id
         WHERE t.schema_name = $1
         ORDER BY tu.id ASC
         LIMIT 1`,
        [schemaName]
      );
      if (rows[0]) {
        businessName = rows[0].business_name;
        email = rows[0].email;
      }
    }

    res.json({ needs_setup: needsSetup, business_name: businessName, email });
  } catch (err) {
    console.error("Setup status error:", err);
    return sendError(res, err);
  }
});

// Complete first-time setup: create admin user + company settings
// Only works when no users exist yet (security guard)
// Optional schema_name in body for SaaS tenant context
router.post("/complete", async (req, res) => {
  const schemaName = req.body.schema_name || "public";

  try {
    // Guard: only block when company_settings already exists.
    // A schema may have users from an older registration flow but no company info —
    // that still counts as needing setup.
    let settingsCount = 0;
    await tenantStorage.run(schemaName, async () => {
      const { rows: existing } = await pool.query("SELECT COUNT(*) FROM company_settings");
      settingsCount = parseInt(existing[0].count);
    });
    if (settingsCount > 0) {
      return res.status(403).json({ error: "Setup already completed" });
    }

    const {
      // Admin user
      admin_name,
      admin_email,
      admin_password,
      // Company info
      company_name,
      business_type,
      address,
      city,
      country,
      phone,
      email,
      website,
      tax_id,
      whatsapp,
      // Branding
      logo,
      brand_color_start,
      brand_color_mid,
      brand_color_end,
      // Currency
      primary_currency,
      secondary_currency,
    } = req.body;

    // Validate required fields
    if (!admin_email || !admin_password || !company_name || !primary_currency) {
      return res.status(400).json({ error: "admin_email, admin_password, company_name, and primary_currency are required" });
    }
    if (admin_password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    let user;

    await tenantStorage.run(schemaName, async () => {
      // ── Pre-flight: look up Admin role ID ──────────────────────────────────
      let adminRoleId = null;
      try {
        const { rows } = await pool.query("SELECT id FROM roles WHERE name = 'Admin' LIMIT 1");
        if (rows[0]) adminRoleId = rows[0].id;
      } catch (_) {}

      // ── Transaction: upsert user + create company settings ─────────────────
      const client = await pool.connect();
      try {
        await client.query(`SET search_path TO "${schemaName}", public`);
        await client.query("BEGIN");

        // 1. Create admin user — or update password if email already exists
        //    (handles accounts created via old SaaS registration flow)
        const hash = await bcrypt.hash(admin_password, 10);
        const displayName = admin_name || admin_email.split("@")[0];
        const { rows: existingUser } = await client.query(
          "SELECT id, email, role FROM users WHERE email = $1",
          [admin_email.toLowerCase()]
        );
        if (existingUser[0]) {
          // User exists — update password + name so credentials match what they entered
          await client.query(
            "UPDATE users SET password_hash = $1, name = $2, role = 'admin' WHERE id = $3",
            [hash, displayName, existingUser[0].id]
          );
          user = existingUser[0];
        } else {
          const { rows: userRows } = await client.query(
            `INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, 'admin', $3) RETURNING id, email, role`,
            [admin_email.toLowerCase(), hash, displayName]
          );
          user = userRows[0];
        }

        // 2. Assign Admin role
        if (adminRoleId) {
          await client.query(
            "UPDATE users SET role_id = $1 WHERE id = $2",
            [adminRoleId, user.id]
          );
        }

        // 2b. Ensure admin email → schema mapping exists in public.tenant_users so login works
        //     regardless of whether the registration email differs from the setup admin email.
        const { rows: tenantRows } = await client.query(
          'SELECT id FROM public.tenants WHERE schema_name = $1',
          [schemaName]
        );
        const tenantId = tenantRows[0]?.id;
        if (tenantId) {
          await client.query(
            `INSERT INTO public.tenant_users (email, tenant_id, schema_name)
             VALUES ($1, $2, $3)
             ON CONFLICT (email) DO UPDATE
               SET schema_name = EXCLUDED.schema_name,
                   tenant_id   = EXCLUDED.tenant_id`,
            [admin_email.toLowerCase(), tenantId, schemaName]
          );
        }

        // 3. Create company settings
        const baseCurrency = String(primary_currency || "").trim().toUpperCase();

        await client.query(
          `INSERT INTO company_settings
             (company_name, address, city, country, phone, email, website, tax_id,
              whatsapp, logo_url, currency, business_type,
              brand_color_start, brand_color_mid, brand_color_end, receipt_footer)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            company_name,
            address || "",
            city || "",
            country || "",
            phone || "",
            email || "",
            website || "",
            tax_id || "",
            whatsapp || "",
            logo || "",
            baseCurrency,
            business_type || "",
            brand_color_start || "#004A99",
            brand_color_mid || "#008B8B",
            brand_color_end || "#32CD32",
            `Thank you for your business with ${company_name}!`,
          ]
        );

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        await client.query("SET search_path TO public");
        client.release();
      }

      // ── Post-transaction: seed optional reference data (safe to fail) ──────
      const KNOWN_CURRENCIES = {
        USD: { name: "US Dollar",              symbol: "$"   },
        SSP: { name: "South Sudanese Pound",  symbol: "SSP" },
        UGX: { name: "Ugandan Shilling",      symbol: "UGX" },
        KES: { name: "Kenyan Shilling",        symbol: "KES" },
        TZS: { name: "Tanzanian Shilling",     symbol: "TZS" },
        EUR: { name: "Euro",                   symbol: "€"   },
        GBP: { name: "British Pound",          symbol: "£"   },
        NGN: { name: "Nigerian Naira",         symbol: "₦"   },
        ZAR: { name: "South African Rand",     symbol: "R"   },
        GHS: { name: "Ghanaian Cedi",          symbol: "GH₵" },
        ETB: { name: "Ethiopian Birr",         symbol: "ETB" },
        RWF: { name: "Rwandan Franc",          symbol: "RWF" },
        ZMW: { name: "Zambian Kwacha",         symbol: "ZMW" },
        XAF: { name: "CFA Franc BEAC",         symbol: "XAF" },
        INR: { name: "Indian Rupee",           symbol: "₹"   },
        CNY: { name: "Chinese Yuan",           symbol: "¥"   },
        AED: { name: "UAE Dirham",             symbol: "AED" },
      };

      try {
        const { rows: currRows } = await pool.query("SELECT COUNT(*) FROM currencies");
        if (parseInt(currRows[0].count) === 0) {
          const baseCode = String(primary_currency || "").trim().toUpperCase();
          const base = KNOWN_CURRENCIES[baseCode] || { name: baseCode || "Currency", symbol: baseCode || "" };

          await pool.query(
            `INSERT INTO currencies (code, name, symbol, is_base, exchange_rate, is_active)
             VALUES ($1, $2, $3, true, 1.0, true)
             ON CONFLICT (code) DO NOTHING`,
            [baseCode, base.name, base.symbol]
          );

          const secondaryCodeRaw = String(secondary_currency || "").trim().toUpperCase();
          const secondaryCode = secondaryCodeRaw && secondaryCodeRaw !== baseCode ? secondaryCodeRaw : "";
          if (secondaryCode) {
            const sc = KNOWN_CURRENCIES[secondaryCode] || { name: secondaryCode, symbol: secondaryCode };
            await pool.query(
              `INSERT INTO currencies (code, name, symbol, is_base, exchange_rate, is_active)
               VALUES ($1, $2, $3, false, 1.0, true)
               ON CONFLICT (code) DO NOTHING`,
              [secondaryCode, sc.name, sc.symbol]
            );
          }
        }
      } catch (_) {}

      try {
        const { rows: ptRows } = await pool.query("SELECT COUNT(*) FROM payment_types");
        if (parseInt(ptRows[0].count) === 0) {
          await pool.query(`
            INSERT INTO payment_types (name, code, sort_order, is_active) VALUES
              ('Cash',          'cash',   1, true),
              ('Mobile Money',  'mobile', 2, true),
              ('Card',          'card',   3, true),
              ('Bank Transfer', 'bank',   4, true)
            ON CONFLICT (code) DO NOTHING
          `);
        }
      } catch (_) {}
    });

    res.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Setup complete error:", err);
    return sendError(res, err);
  }
});

export default router;
