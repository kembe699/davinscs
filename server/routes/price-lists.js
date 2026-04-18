import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Get all price lists
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pl.*, c.code as currency_code, c.symbol as currency_symbol
       FROM price_lists pl
       LEFT JOIN currencies c ON pl.currency_id = c.id
       ORDER BY pl.name`
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
      `SELECT pl.*, c.code as currency_code, c.symbol as currency_symbol
       FROM price_lists pl
       LEFT JOIN currencies c ON pl.currency_id = c.id
       WHERE pl.is_active = true
       ORDER BY pl.name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get items for a price list
router.get("/:id/items", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT pli.*, p.name as product_name
       FROM price_list_items pli
       JOIN products p ON pli.product_id = p.id
       WHERE pli.price_list_id = $1
       ORDER BY p.name`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Upsert one item price
router.put("/:id/items/:productId", requireAuth, async (req, res) => {
  const { id, productId } = req.params;
  const { price } = req.body;

  if (price === undefined || price === null || isNaN(Number(price))) {
    return res.status(400).json({ error: "Valid price is required" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO price_list_items (price_list_id, product_id, price)
       VALUES ($1, $2, $3)
       ON CONFLICT (price_list_id, product_id)
       DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()
       RETURNING *`,
      [id, productId, Number(price)]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Remove item override (falls back to product base price)
router.delete("/:id/items/:productId", requireAuth, async (req, res) => {
  const { id, productId } = req.params;

  try {
    await pool.query(
      "DELETE FROM price_list_items WHERE price_list_id = $1 AND product_id = $2",
      [id, productId]
    );
    res.json({ message: "Price override removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create price list
router.post("/", requireAuth, async (req, res) => {
  const { name, description, discount_percent, is_active, currency_id } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO price_lists (name, description, discount_percent, is_active, currency_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, discount_percent ?? 0, is_active ?? true, currency_id ?? null]
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
  const { name, description, discount_percent, is_active, currency_id } = req.body;
  
  try {
    const { rows } = await pool.query(
      `UPDATE price_lists 
       SET name = $1, description = $2, discount_percent = $3, is_active = $4, currency_id = $5
       WHERE id = $6 RETURNING *`,
      [name, description, discount_percent, is_active, currency_id ?? null, id]
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
