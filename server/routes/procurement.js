import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Suppliers
router.get("/suppliers", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM suppliers ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/suppliers", requireAuth, async (req, res) => {
  const { name, contact_person, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO suppliers (name, contact_person, email, phone, address) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, contact_person, email, phone, address]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/suppliers/:id", requireAuth, async (req, res) => {
  const { name, contact_person, email, phone, address, status } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  
  try {
    const { rows } = await pool.query(
      `UPDATE suppliers 
       SET name = $1, contact_person = $2, email = $3, phone = $4, 
           address = $5, status = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, contact_person, email, phone, address, status || 'active', req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Supplier not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/suppliers/:id", requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM suppliers WHERE id = $1",
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Supplier not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Purchase Orders
router.get("/purchase-orders", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        po.*, s.name as supplier_name,
        COUNT(poi.id) as item_count
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
      GROUP BY po.id, s.name
      ORDER BY po.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/purchase-orders/:id", requireAuth, async (req, res) => {
  try {
    const poResult = await pool.query(
      `SELECT po.*, s.name as supplier_name, s.email as supplier_email
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = $1`,
      [req.params.id]
    );
    
    if (!poResult.rows[0]) {
      return res.status(404).json({ error: "Purchase order not found" });
    }
    
    const itemsResult = await pool.query(
      `SELECT poi.*, p.name as product_name, p.slug as product_slug
       FROM purchase_order_items poi
       LEFT JOIN products p ON poi.product_id = p.id
       WHERE poi.po_id = $1`,
      [req.params.id]
    );
    
    res.json({
      ...poResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/purchase-orders", requireAuth, async (req, res) => {
  const { supplier_id, order_date, items, notes } = req.body;
  const currency_id     = req.body.currency_id     || null;
  const currency_code   = req.body.currency_code   || 'UGX';
  const currency_symbol = req.body.currency_symbol || 'UGX';

  if (!supplier_id || !order_date || !items || items.length === 0) {
    return res.status(400).json({ error: "Supplier, date, and items required" });
  }
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const poNumber = `PO-${Date.now()}`;
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    
    const poResult = await client.query(
      `INSERT INTO purchase_orders 
       (po_number, supplier_id, order_date, total_amount, notes, created_by, currency_id, currency_code, currency_symbol) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [poNumber, supplier_id, order_date, totalAmount, notes, req.user.id, currency_id, currency_code, currency_symbol]
    );
    
    const poId = poResult.rows[0].id;
    
    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_order_items 
         (po_id, product_id, item_name, quantity, unit_price) 
         VALUES ($1, $2, $3, $4, $5)`,
        [poId, item.product_id || null, item.item_name || null, item.quantity, item.unit_price]
      );
    }
    
    await client.query("COMMIT");
    res.status(201).json(poResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

router.put("/purchase-orders/:id", requireAuth, async (req, res) => {
  const { status } = req.body;
  
  try {
    const { rows } = await pool.query(
      `UPDATE purchase_orders 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Purchase order not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET PO print/PDF data
router.get("/purchase-orders/:id/pdf", requireAuth, async (req, res) => {
  try {
    const poResult = await pool.query(
      `SELECT po.*, s.name as supplier_name, s.email as supplier_email, s.phone as supplier_phone, s.address as supplier_address
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = $1`,
      [req.params.id]
    );
    
    if (!poResult.rows[0]) {
      return res.status(404).json({ error: "Purchase order not found" });
    }
    
    const itemsResult = await pool.query(
      `SELECT poi.*, COALESCE(p.name, poi.item_name) as product_name
       FROM purchase_order_items poi
       LEFT JOIN products p ON poi.product_id = p.id
       WHERE poi.po_id = $1`,
      [req.params.id]
    );
    
    res.json({
      ...poResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/purchase-orders/:id/receive", requireAuth, async (req, res) => {
  const { items } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Items required" });
  }
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    for (const item of items) {
      const { id, received_quantity } = item;
      
      if (received_quantity > 0) {
        const itemResult = await client.query(
          "SELECT product_id, quantity, received_quantity FROM purchase_order_items WHERE id = $1",
          [id]
        );
        
        if (!itemResult.rows[0]) continue;
        
        const { product_id, quantity, received_quantity: currentReceived } = itemResult.rows[0];
        const newReceived = currentReceived + received_quantity;
        
        if (newReceived > quantity) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Cannot receive more than ordered" });
        }
        
        await client.query(
          "UPDATE purchase_order_items SET received_quantity = $1 WHERE id = $2",
          [newReceived, id]
        );
        
        await client.query(
          "UPDATE products SET quantity_on_hand = quantity_on_hand + $1 WHERE id = $2",
          [received_quantity, product_id]
        );
        
        await client.query(
          `INSERT INTO stock_movements 
           (product_id, movement_type, quantity, reference_type, reference_id, created_by) 
           VALUES ($1, 'purchase', $2, 'purchase_order', $3, $4)`,
          [product_id, received_quantity, req.params.id, req.user.id]
        );
      }
    }
    
    const allItemsResult = await client.query(
      "SELECT SUM(quantity) as total_qty, SUM(received_quantity) as total_received FROM purchase_order_items WHERE po_id = $1",
      [req.params.id]
    );
    
    const { total_qty, total_received } = allItemsResult.rows[0];
    const newStatus = total_received >= total_qty ? 'completed' : 'partial';
    
    await client.query(
      "UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2",
      [newStatus, req.params.id]
    );
    
    await client.query("COMMIT");
    res.json({ success: true, status: newStatus });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

export default router;
