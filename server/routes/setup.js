import express from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";

const router = express.Router();

// Check if first-time setup is needed (no users in DB)
router.get("/status", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*) FROM users");
    const needsSetup = parseInt(rows[0].count) === 0;
    res.json({ needs_setup: needsSetup });
  } catch (err) {
    console.error("Setup status error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Complete first-time setup: create admin user + company settings
// Only works when no users exist yet (security guard)
router.post("/complete", async (req, res) => {
  try {
    // Guard: only allow when no users exist
    const { rows: existing } = await pool.query("SELECT COUNT(*) FROM users");
    if (parseInt(existing[0].count) > 0) {
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
      site_layout,
      // Storefront headline (optional quick-set)
      tagline,
      // Currency
      secondary_currency,
    } = req.body;

    // Validate required fields
    if (!admin_email || !admin_password || !company_name) {
      return res.status(400).json({ error: "admin_email, admin_password, and company_name are required" });
    }
    if (admin_password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // ── Pre-flight: look up Admin role ID and check optional tables ────────────
    // These run OUTSIDE the transaction so a miss here never poisons the tx.
    let adminRoleId = null;
    try {
      const { rows } = await pool.query("SELECT id FROM roles WHERE name = 'Admin' LIMIT 1");
      if (rows[0]) adminRoleId = rows[0].id;
    } catch (_) {}

    // ── Transaction: create user + company settings (the only true atomics) ───
    const client = await pool.connect();
    let user;
    try {
      await client.query("BEGIN");

      // 1. Create admin user
      const hash = await bcrypt.hash(admin_password, 10);
      const displayName = admin_name || admin_email.split("@")[0];
      const { rows: userRows } = await client.query(
        `INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, 'admin', $3) RETURNING id, email, role`,
        [admin_email.toLowerCase(), hash, displayName]
      );
      user = userRows[0];

      // 2. Assign Admin role
      if (adminRoleId) {
        await client.query(
          "UPDATE users SET role_id = $1 WHERE id = $2",
          [adminRoleId, user.id]
        );
      }

      // 3. Create company settings
      const storefrontSettings = tagline ? { hero_tagline: tagline } : {};
      await client.query(
        `INSERT INTO company_settings
           (company_name, address, city, country, phone, email, website, tax_id,
            whatsapp, logo_url, site_layout, currency,
            brand_color_start, brand_color_mid, brand_color_end,
            storefront_settings, receipt_footer)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
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
          site_layout || "tech_grid",
          "USD",
          brand_color_start || "#004A99",
          brand_color_mid || "#008B8B",
          brand_color_end || "#32CD32",
          JSON.stringify(storefrontSettings),
          `Thank you for shopping at ${company_name}!`,
        ]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // ── Post-transaction: seed optional reference data (safe to fail) ─────────
    // Uses pool (not client) so no risk of poisoning the committed transaction.

    // Currency lookup for secondary
    const KNOWN_CURRENCIES = {
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
        // Always seed USD as the base (primary) currency
        await pool.query(
          `INSERT INTO currencies (code, name, symbol, is_base, exchange_rate, is_active)
           VALUES ('USD', 'US Dollar', '$', true, 1.0, true)
           ON CONFLICT (code) DO NOTHING`
        );
        // Seed secondary currency if chosen
        if (secondary_currency && KNOWN_CURRENCIES[secondary_currency]) {
          const sc = KNOWN_CURRENCIES[secondary_currency];
          await pool.query(
            `INSERT INTO currencies (code, name, symbol, is_base, exchange_rate, is_active)
             VALUES ($1, $2, $3, false, 1.0, true)
             ON CONFLICT (code) DO NOTHING`,
            [secondary_currency, sc.name, sc.symbol]
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

    res.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Setup complete error:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

export default router;
