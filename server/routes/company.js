import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Get company settings
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM company_settings LIMIT 1"
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create or update company settings
router.post("/", requireAuth, async (req, res) => {
  const { company_name, address, phone, email, tax_id, currency, logo_url, receipt_footer } = req.body;
  
  if (!company_name) {
    return res.status(400).json({ error: "Company name is required" });
  }
  
  try {
    // Check if settings exist
    const existing = await pool.query("SELECT id FROM company_settings LIMIT 1");
    
    if (existing.rows[0]) {
      // Update existing
      const { rows } = await pool.query(
        `UPDATE company_settings 
         SET company_name = $1, address = $2, phone = $3, email = $4, 
             tax_id = $5, currency = $6, logo_url = $7, receipt_footer = $8,
             updated_at = NOW()
         WHERE id = $9 RETURNING *`,
        [company_name, address, phone, email, tax_id, currency || 'UGX', logo_url, receipt_footer, existing.rows[0].id]
      );
      res.json(rows[0]);
    } else {
      // Create new
      const { rows } = await pool.query(
        `INSERT INTO company_settings (company_name, address, phone, email, tax_id, currency, logo_url, receipt_footer) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [company_name, address, phone, email, tax_id, currency || 'UGX', logo_url, receipt_footer]
      );
      res.json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
