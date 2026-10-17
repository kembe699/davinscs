import express from "express";
import pool from "../db.js";
import { requireAuth, optionalTenantContext } from "../middleware/auth.js";
import { sendError } from "../utils/errorResponse.js";

const router = express.Router();

// Get all tax rates
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM tax_rates ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    return sendError(res, err);
  }
});

// Get active tax rates
router.get("/active", optionalTenantContext, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM tax_rates WHERE is_active = true ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    return sendError(res, err);
  }
});

// Get default tax rate
router.get("/default", optionalTenantContext, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM tax_rates WHERE is_default = true AND is_active = true LIMIT 1"
    );
    res.json(rows[0] || null);
  } catch (err) {
    return sendError(res, err);
  }
});

// Create tax rate
router.post("/", requireAuth, async (req, res) => {
  const { name, rate, is_active, is_default } = req.body;
  
  if (!name || rate === undefined) {
    return res.status(400).json({ error: "Name and rate are required" });
  }
  
  try {
    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query("UPDATE tax_rates SET is_default = false");
    }
    
    const { rows } = await pool.query(
      `INSERT INTO tax_rates (name, rate, is_active, is_default) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, rate, is_active ?? true, is_default ?? false]
    );
    res.json(rows[0]);
  } catch (err) {
    return sendError(res, err);
  }
});

// Update tax rate
router.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, rate, is_active, is_default } = req.body;
  
  try {
    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query("UPDATE tax_rates SET is_default = false WHERE id != $1", [id]);
    }
    
    const { rows } = await pool.query(
      `UPDATE tax_rates 
       SET name = $1, rate = $2, is_active = $3, is_default = $4
       WHERE id = $5 RETURNING *`,
      [name, rate, is_active, is_default, id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Tax rate not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    return sendError(res, err);
  }
});

// Delete tax rate
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      "DELETE FROM tax_rates WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Tax rate not found" });
    }
    
    res.json({ message: "Tax rate deleted" });
  } catch (err) {
    return sendError(res, err);
  }
});

export default router;
