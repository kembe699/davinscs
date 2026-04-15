import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", async (req, res) => {
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
  const { slug, name, sort_order = 0 } = req.body;
  if (!slug || !name) return res.status(400).json({ error: "slug and name are required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO categories (slug, name, sort_order) VALUES ($1,$2,$3) RETURNING *",
      [slug.toLowerCase().trim(), name.trim(), sort_order]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug already exists" });
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { slug, name, sort_order } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE categories SET
        slug = COALESCE($1, slug),
        name = COALESCE($2, name),
        sort_order = COALESCE($3, sort_order)
       WHERE id = $4 RETURNING *`,
      [slug?.toLowerCase().trim(), name?.trim(), sort_order, req.params.id]
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
