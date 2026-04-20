import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Get company settings
router.get("/", async (req, res) => {
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
    
    console.log('GET company - rows found:', rows.length);
    if (rows[0]) {
      console.log('GET company - logo_url length:', rows[0].logo_url ? rows[0].logo_url.length : 0);
      console.log('GET company - company_name:', rows[0].company_name);
      
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
        site_layout: rows[0].site_layout || "tech_grid",
        description: rows[0].receipt_footer || "",
        brand_color_start: rows[0].brand_color_start || "#004A99",
        brand_color_mid: rows[0].brand_color_mid || "#008B8B",
        brand_color_end: rows[0].brand_color_end || "#32CD32",
        storefront_settings: rows[0].storefront_settings || {}
      };
      
      console.log('GET company - response logo length:', response.logo ? response.logo.length : 0);
      res.json(response);
    } else {
      console.log('GET company - no rows found');
      res.json(null);
    }
  } catch (err) {
    console.error('GET company error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create or update company settings
router.post("/", requireAuth, async (req, res) => {
  const { name, logo, address, city, country, postal_code, phone, email, tax_id, website, whatsapp, site_layout, description, brand_color_start, brand_color_mid, brand_color_end, storefront_settings } = req.body;
  
  console.log('Received company data:', { 
    name, 
    address, 
    city, 
    country, 
    postal_code, 
    phone, 
    email, 
    tax_id, 
    website,
    logoLength: logo ? logo.length : 0,
    logoPreview: logo ? logo.substring(0, 50) : 'no logo'
  });
  
  if (!name) {
    console.log('Error: Company name is required');
    return res.status(400).json({ error: "Company name is required" });
  }
  
  try {
    // Check if settings exist
    const existing = await pool.query("SELECT id FROM company_settings LIMIT 1");
    console.log('Existing company settings:', existing.rows[0]);
    
    if (existing.rows[0]) {
      // Update existing
      console.log('Updating existing company settings...');
      const { rows } = await pool.query(
        `UPDATE company_settings 
         SET company_name = $1, address = $2, phone = $3, email = $4, 
             tax_id = $5, logo_url = $6, city = $7, country = $8, 
             postal_code = $9, website = $10, receipt_footer = $11,
             whatsapp = $12, site_layout = $13,
             brand_color_start = $14, brand_color_mid = $15, brand_color_end = $16,
             storefront_settings = $17,
             updated_at = NOW()
         WHERE id = $18 RETURNING *`,
        [name, address, phone, email, tax_id, logo, city, country, postal_code, website, description, whatsapp, site_layout || 'tech_grid', brand_color_start || '#004A99', brand_color_mid || '#008B8B', brand_color_end || '#32CD32', JSON.stringify(storefront_settings || {}), existing.rows[0].id]
      );
      console.log('Updated successfully:', rows[0]);
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
        site_layout: rows[0].site_layout || "tech_grid",
        description: rows[0].receipt_footer,
        brand_color_start: rows[0].brand_color_start || "#004A99",
        brand_color_mid: rows[0].brand_color_mid || "#008B8B",
        brand_color_end: rows[0].brand_color_end || "#32CD32",
        storefront_settings: rows[0].storefront_settings || {}
      };
      console.log('Sending response:', response);
      res.json(response);
    } else {
      // Create new
      console.log('Creating new company settings...');
      const { rows } = await pool.query(
        `INSERT INTO company_settings (company_name, address, phone, email, tax_id, logo_url, city, country, postal_code, website, receipt_footer, whatsapp, site_layout, currency, brand_color_start, brand_color_mid, brand_color_end, storefront_settings) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
        [name, address, phone, email, tax_id, logo, city, country, postal_code, website, description, whatsapp, site_layout || 'tech_grid', 'UGX', brand_color_start || '#004A99', brand_color_mid || '#008B8B', brand_color_end || '#32CD32', JSON.stringify(storefront_settings || {})]
      );
      console.log('Created successfully:', rows[0]);
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
        site_layout: rows[0].site_layout || "tech_grid",
        description: rows[0].receipt_footer,
        brand_color_start: rows[0].brand_color_start || "#004A99",
        brand_color_mid: rows[0].brand_color_mid || "#008B8B",
        brand_color_end: rows[0].brand_color_end || "#32CD32",
        storefront_settings: rows[0].storefront_settings || {}
      };
      console.log('Sending response:', response);
      res.json(response);
    }
  } catch (err) {
    console.error('Error saving company settings:', err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

export default router;
