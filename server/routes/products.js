import express from "express";
import pool from "../db.js";
import { requireAuth, optionalTenantContext } from "../middleware/auth.js";
import { logAudit } from "../utils/audit.js";

const router = express.Router();

// GET all products (public)
router.get("/", optionalTenantContext, async (req, res) => {
  try {
    const { category, featured, pos } = req.query;
    const conditions = [];
    const params = [];
    if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
    if (featured === "true") { conditions.push(`is_featured = TRUE`); }
    // The POS screen asks for ?pos=true — everywhere else (admin product list,
    // ProductForm, Procurement's product picker) still needs to see every
    // product regardless of its POS-visibility toggle, so this only filters
    // when explicitly requested rather than changing the default query.
    if (pos === "true") { conditions.push(`p.show_in_pos = TRUE`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT p.*, a.id as expense_account_id, a.name as expense_account_name, a.code as expense_account_code,
              sl.name as storage_location_name
       FROM products p
       LEFT JOIN accounts a ON p.expense_account_id = a.id
       LEFT JOIN storage_locations sl ON p.storage_location_id = sl.id
       ${where} ORDER BY p.created_at ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET single product by slug (public)
router.get("/:slug", optionalTenantContext, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, a.name as expense_account_name, a.code as expense_account_code
       FROM products p LEFT JOIN accounts a ON p.expense_account_id = a.id
       WHERE p.slug = $1`,
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: "Product not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST create product (admin)
router.post("/", requireAuth, async (req, res) => {
  const { slug, name, brand, price, cost_price, tag, description, specs, image_url, in_stock, is_featured, category, barcode, expiry_date, product_type, quantity_on_hand, reorder_level, expense_account_id, uom, storage_location_id, show_in_pos } = req.body;
  if (!slug || !name || !price) {
    return res.status(400).json({ error: "slug, name and price are required" });
  }
  const priceVal = parseFloat(price);
  const costPriceVal = parseFloat(cost_price) || 0;
  const qtyInt = parseInt(quantity_on_hand, 10) || 0;
  const reorderInt = parseInt(reorder_level, 10) || 0;
  const expenseId = parseInt(expense_account_id, 10) || null;
  const storageLocationId = parseInt(storage_location_id, 10) || null;
  if (isNaN(priceVal)) {
    return res.status(400).json({ error: "price must be a valid number" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO products (slug, name, brand, price, cost_price, tag, description, specs, image_url, in_stock, is_featured, category, barcode, expiry_date, product_type, quantity_on_hand, reorder_level, expense_account_id, uom, storage_location_id, show_in_pos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [slug, name, brand || "", priceVal, costPriceVal, tag || "", description || "", JSON.stringify(specs || []), image_url || "", in_stock ?? true, is_featured ?? false, category || "", barcode || "", expiry_date || null, product_type || "product", qtyInt, reorderInt, expenseId, uom || "pcs", storageLocationId, show_in_pos ?? true]
    );
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'PRODUCT_CREATED', entityType: 'product', entityId: rows[0].id, details: { name, sku: slug, price: priceVal, category }, ip: req.ip });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug already exists" });
    console.error("[products POST]", err.code, err.message, err.detail);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// PUT update product (admin)
router.put("/:id", requireAuth, async (req, res) => {
  const { name, brand, price, cost_price, tag, description, specs, image_url, in_stock, is_featured, category, slug, barcode, expiry_date, product_type, quantity_on_hand, reorder_level, expense_account_id, uom, storage_location_id, show_in_pos } = req.body;
  const priceVal = parseFloat(price);
  const costPriceVal = parseFloat(cost_price) || 0;
  const qtyInt = parseInt(quantity_on_hand, 10) || 0;
  const reorderInt = parseInt(reorder_level, 10) || 0;
  const expenseId = parseInt(expense_account_id, 10) || null;
  const storageLocationId = parseInt(storage_location_id, 10) || null;
  try {
    const { rows } = await pool.query(
      `UPDATE products SET
        slug=$1, name=$2, brand=$3, price=$4, cost_price=$5, tag=$6, description=$7,
        specs=$8, image_url=$9, in_stock=$10, is_featured=$11, category=$12, barcode=$13,
        expiry_date=$14, product_type=$15, quantity_on_hand=$16, reorder_level=$17,
        expense_account_id=$18, uom=$19, storage_location_id=$20, show_in_pos=$21, updated_at=NOW()
       WHERE id=$22 RETURNING *`,
      [slug, name, brand || "", priceVal, costPriceVal, tag, description, JSON.stringify(specs || []), image_url, in_stock, is_featured ?? false, category || "", barcode || "", expiry_date || null, product_type || "product", qtyInt, reorderInt, expenseId, uom || "pcs", storageLocationId, show_in_pos ?? true, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Product not found" });
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'PRODUCT_UPDATED', entityType: 'product', entityId: rows[0].id, details: { name, price: priceVal, category }, ip: req.ip });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug already exists" });
    console.error("[products PUT]", err.code, err.message, err.detail);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// DELETE product (admin)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Product not found" });
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'PRODUCT_DELETED', entityType: 'product', entityId: parseInt(req.params.id), details: null, ip: req.ip });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    // Check if it's a foreign key constraint error
    if (err.code === "23503") {
      return res.status(409).json({ 
        error: "Cannot delete product: it is referenced in sales, orders, or other records. Please remove those references first." 
      });
    }
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
