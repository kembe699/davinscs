import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// POST track order click (public)
router.post("/", async (req, res) => {
  const { product_id, product_name } = req.body;
  if (!product_id) return res.status(400).json({ error: "product_id required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO orders (product_id, product_name) VALUES ($1, $2) RETURNING *",
      [product_id, product_name || ""]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET order stats (admin)
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*) FROM orders");
    const byProduct = await pool.query(
      `SELECT p.name, p.category, COUNT(o.id) AS order_count
       FROM orders o
       JOIN products p ON p.id = o.product_id
       GROUP BY p.id, p.name, p.category
       ORDER BY order_count DESC`
    );
    const recent = await pool.query(
      `SELECT o.id, o.product_name, o.created_at, p.category
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       ORDER BY o.created_at DESC LIMIT 20`
    );
    res.json({
      total: parseInt(total.rows[0].count),
      by_product: byProduct.rows,
      recent: recent.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
