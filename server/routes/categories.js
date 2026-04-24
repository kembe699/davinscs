import express from "express";
import pool from "../db.js";
import { requireAuth, optionalTenantContext } from "../middleware/auth.js";

const router = express.Router();

router.get("/", optionalTenantContext, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM categories ORDER BY sort_order ASC, name ASC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { slug, name, sort_order = 0, image_url = "" } = req.body;
  if (!slug || !name) return res.status(400).json({ error: "slug and name are required" });
  try {
    // Check slug uniqueness within this tenant's schema only
    const schemaName = req.user?.schema_name;
    if (schemaName) {
      const existing = await pool.query(
        `SELECT id FROM ${schemaName}.categories WHERE slug = $1`,
        [slug.toLowerCase().trim()]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "A category with this slug already exists in your store. Please choose a different slug." });
      }
    }
    const { rows } = await pool.query(
      "INSERT INTO categories (slug, name, sort_order, image_url) VALUES ($1,$2,$3,$4) RETURNING *",
      [slug.toLowerCase().trim(), name.trim(), sort_order, image_url.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "A category with this slug already exists in your store." });
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { slug, name, sort_order, image_url } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE categories SET
        slug = COALESCE($1, slug),
        name = COALESCE($2, name),
        sort_order = COALESCE($3, sort_order),
        image_url = COALESCE($4, image_url)
       WHERE id = $5 RETURNING *`,
      [slug?.toLowerCase().trim(), name?.trim(), sort_order, image_url?.trim() ?? null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Category not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug already exists" });
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM categories WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Category not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
