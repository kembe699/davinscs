import express from "express";
import pool from "../db.js";
import { requireAuth, optionalTenantContext } from "../middleware/auth.js";
import { sendError } from "../utils/errorResponse.js";

const router = express.Router();

// Get company settings
router.get("/", optionalTenantContext, async (req, res) => {
  try {
    // Clean up duplicate rows (keep only the most recent one)
    await pool.query(`
      DELETE FROM company_settings 
      WHERE id NOT IN (
        SELECT id FROM company_settings ORDER BY updated_at DESC LIMIT 1
      )
    `);
    
    const { rows } = await pool.query(
      "SELECT * FROM company_settings ORDER BY updated_at DESC LIMIT 1"
    );
    
    if (rows[0]) {
      const response = {
        name: rows[0].company_name || "",
        logo: rows[0].logo_url || "",
        address: rows[0].address || "",
        city: rows[0].city || "",
        country: rows[0].country || "",
        postal_code: rows[0].postal_code || "",
        phone: rows[0].phone || "",
        email: rows[0].email || "",
        tax_id: rows[0].tax_id || "",
        website: rows[0].website || "",
        whatsapp: rows[0].whatsapp || "",
        description: rows[0].receipt_footer || "",
        brand_color_start: rows[0].brand_color_start || "#004A99",
        brand_color_mid: rows[0].brand_color_mid || "#008B8B",
        brand_color_end: rows[0].brand_color_end || "#32CD32",
        currency: rows[0].currency || "UGX",
        business_type: rows[0].business_type || ""
      };

      res.json(response);
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error('GET company error:', err);
    return sendError(res, err);
  }
});

// Create or update company settings
router.post("/", requireAuth, async (req, res) => {
  const { name, logo, address, city, country, postal_code, phone, email, tax_id, website, whatsapp, description, brand_color_start, brand_color_mid, brand_color_end, currency, business_type } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "Company name is required" });
  }
  
  try {
    // Check if settings exist
    const existing = await pool.query("SELECT id FROM company_settings LIMIT 1");
    
    if (existing.rows[0]) {
      const { rows } = await pool.query(
        `UPDATE company_settings
         SET company_name = $1, address = $2, phone = $3, email = $4,
             tax_id = $5, logo_url = $6, city = $7, country = $8,
             postal_code = $9, website = $10, receipt_footer = $11,
             whatsapp = $12,
             brand_color_start = $13, brand_color_mid = $14, brand_color_end = $15,
             currency = $16, business_type = $17,
             updated_at = NOW()
         WHERE id = $18 RETURNING *`,
        [name, address, phone, email, tax_id, logo, city, country, postal_code, website, description, whatsapp, brand_color_start || '#004A99', brand_color_mid || '#008B8B', brand_color_end || '#32CD32', currency || 'UGX', business_type || '', existing.rows[0].id]
      );
      const response = {
        name: rows[0].company_name,
        logo: rows[0].logo_url,
        address: rows[0].address,
        city: rows[0].city,
        country: rows[0].country,
        postal_code: rows[0].postal_code,
        phone: rows[0].phone,
        email: rows[0].email,
        tax_id: rows[0].tax_id,
        website: rows[0].website,
        whatsapp: rows[0].whatsapp || "",
        description: rows[0].receipt_footer,
        brand_color_start: rows[0].brand_color_start || "#004A99",
        brand_color_mid: rows[0].brand_color_mid || "#008B8B",
        brand_color_end: rows[0].brand_color_end || "#32CD32",
        currency: rows[0].currency || "UGX",
        business_type: rows[0].business_type || ""
      };
      res.json(response);
    } else {
      const { rows } = await pool.query(
        `INSERT INTO company_settings (company_name, address, phone, email, tax_id, logo_url, city, country, postal_code, website, receipt_footer, whatsapp, currency, business_type, brand_color_start, brand_color_mid, brand_color_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
        [name, address, phone, email, tax_id, logo, city, country, postal_code, website, description, whatsapp, currency || 'UGX', business_type || '', brand_color_start || '#004A99', brand_color_mid || '#008B8B', brand_color_end || '#32CD32']
      );
      const response = {
        name: rows[0].company_name,
        logo: rows[0].logo_url,
        address: rows[0].address,
        city: rows[0].city,
        country: rows[0].country,
        postal_code: rows[0].postal_code,
        phone: rows[0].phone,
        email: rows[0].email,
        tax_id: rows[0].tax_id,
        website: rows[0].website,
        whatsapp: rows[0].whatsapp || "",
        description: rows[0].receipt_footer,
        brand_color_start: rows[0].brand_color_start || "#004A99",
        brand_color_mid: rows[0].brand_color_mid || "#008B8B",
        brand_color_end: rows[0].brand_color_end || "#32CD32",
        currency: rows[0].currency || "UGX",
        business_type: rows[0].business_type || ""
      };
      res.json(response);
    }
  } catch (err) {
    console.error('Error saving company settings:', err);
    return sendError(res, err);
  }
});

export default router;
