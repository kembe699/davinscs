import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        p.id, p.name, p.slug, p.category, p.price, p.cost_price,
        p.quantity_on_hand, p.quantity_reserved, p.reorder_level,
        (p.quantity_on_hand - p.quantity_reserved) as available,
        s.name as supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.name
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/low-stock", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        p.id, p.name, p.slug, p.category,
        p.quantity_on_hand, p.quantity_reserved, p.reorder_level,
        (p.quantity_on_hand - p.quantity_reserved) as available
      FROM products p
      WHERE p.quantity_on_hand <= p.reorder_level
        AND p.product_type != 'service'
      ORDER BY p.quantity_on_hand ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/movements", requireAuth, async (req, res) => {
  try {
    const { product_id } = req.query;
    let query = `
      SELECT 
        sm.id, sm.movement_type, sm.quantity, sm.reference_type, 
        sm.reference_id, sm.notes, sm.created_at,
        p.name as product_name, p.slug as product_slug,
        u.email as created_by_email
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.created_by = u.id
    `;
    const params = [];
    
    if (product_id) {
      query += " WHERE sm.product_id = $1";
      params.push(product_id);
    }
    
    query += " ORDER BY sm.created_at DESC LIMIT 100";
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/adjust", requireAuth, async (req, res) => {
  const { product_id, quantity, notes } = req.body;
  
  if (!product_id || !quantity) {
    return res.status(400).json({ error: "Product ID and quantity required" });
  }
  
  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");
    
    const productResult = await client.query(
      "SELECT quantity_on_hand FROM products WHERE id = $1",
      [product_id]
    );
    
    if (!productResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Product not found" });
    }
    
    const newQuantity = productResult.rows[0].quantity_on_hand + quantity;
    
    if (newQuantity < 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Insufficient stock" });
    }
    
    await client.query(
      "UPDATE products SET quantity_on_hand = $1 WHERE id = $2",
      [newQuantity, product_id]
    );
    
    await client.query(
      `INSERT INTO stock_movements 
       (product_id, movement_type, quantity, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5)`,
      [product_id, "adjustment", quantity, notes, req.user.id]
    );
    
    await client.query("COMMIT");
    res.json({ success: true, new_quantity: newQuantity });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

router.get("/valuation", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        SUM(quantity_on_hand * cost_price) as total_value,
        COUNT(*) as total_products,
        SUM(quantity_on_hand) as total_units
      FROM products
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
