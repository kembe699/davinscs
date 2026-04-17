import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET all products (public)
router.get("/", async (req, res) => {
  try {
    const { category, featured } = req.query;
    const conditions = [];
    const params = [];
    if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
    if (featured === "true") { conditions.push(`is_featured = TRUE`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(`SELECT * FROM products ${where} ORDER BY created_at ASC`, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET single product by slug (public)
router.get("/:slug", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM products WHERE slug = $1", [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ error: "Product not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST create product (admin)
router.post("/", requireAuth, async (req, res) => {
  const { slug, name, brand, price, tag, description, specs, image_url, in_stock, is_featured, category, barcode } = req.body;
  if (!slug || !name || !brand || !price || !category) {
    return res.status(400).json({ error: "slug, name, brand, price and category are required" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO products (slug, name, brand, price, tag, description, specs, image_url, in_stock, is_featured, category, barcode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [slug, name, brand, price, tag || "", description || "", JSON.stringify(specs || []), image_url || "", in_stock ?? true, is_featured ?? false, category, barcode || ""]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug already exists" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT update product (admin)
router.put("/:id", requireAuth, async (req, res) => {
  const { name, brand, price, tag, description, specs, image_url, in_stock, is_featured, category, slug, barcode } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE products SET
        slug=$1, name=$2, brand=$3, price=$4, tag=$5, description=$6,
        specs=$7, image_url=$8, in_stock=$9, is_featured=$10, category=$11, barcode=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [slug, name, brand, price, tag, description, JSON.stringify(specs || []), image_url, in_stock, is_featured ?? false, category, barcode || "", req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Product not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug already exists" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE product (admin)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
