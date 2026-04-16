import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Get all countries
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM countries ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get active countries
router.get("/active", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM countries WHERE is_active = true ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create country
router.post("/", requireAuth, async (req, res) => {
  const { code, name, is_active } = req.body;
  
  if (!code || !name) {
    return res.status(400).json({ error: "Code and name are required" });
  }
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO countries (code, name, is_active) 
       VALUES ($1, $2, $3) RETURNING *`,
      [code, name, is_active ?? true]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      return res.status(400).json({ error: "Country code already exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// Update country
router.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { code, name, is_active } = req.body;
  
  try {
    const { rows } = await pool.query(
      `UPDATE countries 
       SET code = $1, name = $2, is_active = $3
       WHERE id = $4 RETURNING *`,
      [code, name, is_active, id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Country not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete country
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      "DELETE FROM countries WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Country not found" });
    }
    
    res.json({ message: "Country deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
