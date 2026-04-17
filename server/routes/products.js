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
  const { slug, name, brand, price, tag, description, specs, image_url, in_stock, is_featured, category, barcode, expiry_date, product_type, quantity_on_hand, reorder_level } = req.body;
  console.log('CREATE Product - expiry_date:', expiry_date, 'product_type:', product_type);
  if (!slug || !name || !brand || !price || !category) {
    return res.status(400).json({ error: "slug, name, brand, price and category are required" });
  }
  try {
    // Check for duplicate product name
    const duplicateCheck = await pool.query(
      `SELECT id FROM products WHERE LOWER(name) = LOWER($1)`,
      [name]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: "A product with this name already exists" });
    }

    const { rows } = await pool.query(
      `INSERT INTO products (slug, name, brand, price, tag, description, specs, image_url, in_stock, is_featured, category, barcode, expiry_date, product_type, quantity_on_hand, reorder_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [slug, name, brand, price, tag || "", description || "", JSON.stringify(specs || []), image_url || "", in_stock ?? true, is_featured ?? false, category, barcode || "", expiry_date || null, product_type || "product", quantity_on_hand || 0, reorder_level || 0]
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
  const { name, brand, price, tag, description, specs, image_url, in_stock, is_featured, category, slug, barcode, expiry_date, product_type, quantity_on_hand, reorder_level } = req.body;
  console.log('UPDATE Product ID:', req.params.id, '- expiry_date:', expiry_date, 'product_type:', product_type);
  try {
    // Check for duplicate product name (excluding current product)
    const duplicateCheck = await pool.query(
      `SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND id != $2`,
      [name, req.params.id]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: "A product with this name already exists" });
    }

    const { rows } = await pool.query(
      `UPDATE products SET
        slug=$1, name=$2, brand=$3, price=$4, tag=$5, description=$6,
        specs=$7, image_url=$8, in_stock=$9, is_featured=$10, category=$11, barcode=$12, 
        expiry_date=$13, product_type=$14, quantity_on_hand=$15, reorder_level=$16, updated_at=NOW()
       WHERE id=$17 RETURNING *`,
      [slug, name, brand, price, tag, description, JSON.stringify(specs || []), image_url, in_stock, is_featured ?? false, category, barcode || "", expiry_date || null, product_type || "product", quantity_on_hand || 0, reorder_level || 0, req.params.id]
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
