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
        description: rows[0].receipt_footer || ""
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
  const { name, logo, address, city, country, postal_code, phone, email, tax_id, website, description } = req.body;
  
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
             updated_at = NOW()
         WHERE id = $12 RETURNING *`,
        [name, address, phone, email, tax_id, logo, city, country, postal_code, website, description, existing.rows[0].id]
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
        description: rows[0].receipt_footer
      };
      console.log('Sending response:', response);
      res.json(response);
    } else {
      // Create new
      console.log('Creating new company settings...');
      const { rows } = await pool.query(
        `INSERT INTO company_settings (company_name, address, phone, email, tax_id, logo_url, city, country, postal_code, website, receipt_footer, currency) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [name, address, phone, email, tax_id, logo, city, country, postal_code, website, description, 'UGX']
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
        description: rows[0].receipt_footer
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
