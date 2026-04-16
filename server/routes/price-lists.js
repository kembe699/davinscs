import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Get all price lists
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM price_lists ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get active price lists
router.get("/active", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM price_lists WHERE is_active = true ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create price list
router.post("/", requireAuth, async (req, res) => {
  const { name, description, discount_percent, is_active } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO price_lists (name, description, discount_percent, is_active) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description, discount_percent ?? 0, is_active ?? true]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update price list
router.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, description, discount_percent, is_active } = req.body;
  
  try {
    const { rows } = await pool.query(
      `UPDATE price_lists 
       SET name = $1, description = $2, discount_percent = $3, is_active = $4
       WHERE id = $5 RETURNING *`,
      [name, description, discount_percent, is_active, id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Price list not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete price list
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      "DELETE FROM price_lists WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Price list not found" });
    }
    
    res.json({ message: "Price list deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
