import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Get all promotions
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM promotions ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get active promotions
router.get("/active", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM promotions 
       WHERE is_active = true 
       AND (start_date IS NULL OR start_date <= CURRENT_DATE)
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create promotion
router.post("/", requireAuth, async (req, res) => {
  const { name, description, discount_type, discount_value, start_date, end_date, is_active } = req.body;
  
  if (!name || !discount_type || discount_value === undefined) {
    return res.status(400).json({ error: "Name, discount type, and discount value are required" });
  }
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO promotions (name, description, discount_type, discount_value, start_date, end_date, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, discount_type, discount_value, start_date, end_date, is_active ?? true]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update promotion
router.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, description, discount_type, discount_value, start_date, end_date, is_active } = req.body;
  
  try {
    const { rows } = await pool.query(
      `UPDATE promotions 
       SET name = $1, description = $2, discount_type = $3, discount_value = $4, 
           start_date = $5, end_date = $6, is_active = $7
       WHERE id = $8 RETURNING *`,
      [name, description, discount_type, discount_value, start_date, end_date, is_active, id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Promotion not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete promotion
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      "DELETE FROM promotions WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Promotion not found" });
    }
    
    res.json({ message: "Promotion deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
