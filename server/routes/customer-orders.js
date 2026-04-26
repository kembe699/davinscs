import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendOrderStatusEmail } from "../utils/email.js";

const router = express.Router();

// GET all customer orders
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        co.id,
        co.order_number,
        co.customer_name,
        co.customer_email,
        co.customer_phone,
        co.shipping_address,
        co.shipping_city,
        co.shipping_postal_code,
        co.shipping_country,
        co.subtotal,
        co.shipping_cost,
        co.total,
        co.status,
        co.tracking_number,
        co.notes,
        co.created_at,
        co.updated_at,
        COUNT(oi.id) as item_count
      FROM customer_orders co
      LEFT JOIN order_items oi ON co.id = oi.order_id
    `;
    
    const conditions = [];
    const params = [];
    
    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`co.status = $${params.length}`);
    }
    
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(co.order_number ILIKE $${params.length} OR co.customer_name ILIKE $${params.length} OR co.customer_email ILIKE $${params.length})`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` GROUP BY co.id ORDER BY co.created_at DESC`;
    
    params.push(limit);
    query += ` LIMIT $${params.length}`;
    
    params.push(offset);
    query += ` OFFSET $${params.length}`;
    
    const { rows } = await pool.query(query, params);
    
    const countQuery = `SELECT COUNT(DISTINCT co.id) as total FROM customer_orders co ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`;
    const countResult = await pool.query(countQuery, params.slice(0, conditions.length));
    
    res.json({
      orders: rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET single order with items
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const orderResult = await pool.query(
      `SELECT * FROM customer_orders WHERE id = $1`,
      [req.params.id]
    );
    
    if (!orderResult.rows[0]) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    const itemsResult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [req.params.id]
    );
    
    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT update order status
router.put("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  
  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");
    
    const orderResult = await client.query(
      "SELECT * FROM customer_orders WHERE id = $1",
      [req.params.id]
    );
    
    if (!orderResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }
    
    const oldStatus = orderResult.rows[0].status;
    
    // If shipping, reduce on_hand and reserved quantities
    if (status === 'shipped' && oldStatus !== 'shipped') {
      const itemsResult = await client.query(
        "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
        [req.params.id]
      );
      
      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE products 
           SET quantity_on_hand = quantity_on_hand - $1,
               quantity_reserved = quantity_reserved - $1
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );
        
        await client.query(
          `INSERT INTO stock_movements 
           (product_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
           VALUES ($1, 'sale', $2, 'customer_order', $3, 'Order shipped', $4)`,
          [item.product_id, -item.quantity, req.params.id, req.user.id]
        );
      }
    }
    
    const updateResult = await client.query(
      `UPDATE customer_orders 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    
    await client.query("COMMIT");
    res.json(updateResult.rows[0]);
    
    // Send email notification in the background
    const order = updateResult.rows[0];
    if (order.customer_email) {
      sendOrderStatusEmail(order.customer_email, order.order_number, status, order.tracking_number).catch(err => {
        console.error("Failed to send order status email:", err);
      });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// PUT update order details
router.put("/:id", requireAuth, async (req, res) => {
  const { shipping_address, shipping_city, shipping_postal_code, shipping_country, customer_phone, tracking_number, notes } = req.body;
  
  try {
    const { rows } = await pool.query(
      `UPDATE customer_orders 
       SET shipping_address = COALESCE($1, shipping_address),
           shipping_city = COALESCE($2, shipping_city),
           shipping_postal_code = COALESCE($3, shipping_postal_code),
           shipping_country = COALESCE($4, shipping_country),
           customer_phone = COALESCE($5, customer_phone),
           tracking_number = COALESCE($6, tracking_number),
           notes = COALESCE($7, notes),
           updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [shipping_address, shipping_city, shipping_postal_code, shipping_country, customer_phone, tracking_number, notes, req.params.id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST cancel order
router.post("/:id/cancel", requireAuth, async (req, res) => {
  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");
    
    const orderResult = await client.query(
      "SELECT * FROM customer_orders WHERE id = $1",
      [req.params.id]
    );
    
    if (!orderResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }
    
    const order = orderResult.rows[0];
    
    if (order.status === 'cancelled') {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Order already cancelled" });
    }
    
    if (order.status === 'delivered') {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cannot cancel delivered order" });
    }
    
    // Release reserved inventory
    const itemsResult = await client.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
      [req.params.id]
    );
    
    for (const item of itemsResult.rows) {
      // If already shipped, we need to add back to on_hand as well
      if (order.status === 'shipped') {
        await client.query(
          `UPDATE products 
           SET quantity_on_hand = quantity_on_hand + $1
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      } else {
        // Just release reservation
        await client.query(
          `UPDATE products 
           SET quantity_reserved = quantity_reserved - $1
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }
      
      await client.query(
        `INSERT INTO stock_movements 
         (product_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
         VALUES ($1, 'adjustment', $2, 'customer_order', $3, 'Order cancelled - inventory released', $4)`,
        [item.product_id, item.quantity, req.params.id, req.user.id]
      );
    }
    
    const updateResult = await client.query(
      `UPDATE customer_orders 
       SET status = 'cancelled', 
           cancelled_at = NOW(),
           cancelled_by = $1,
           updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    
    await client.query("COMMIT");
    res.json(updateResult.rows[0]);
    
    // Send cancellation email notification in the background
    const cancelledOrder = updateResult.rows[0];
    if (cancelledOrder.customer_email) {
      sendOrderStatusEmail(cancelledOrder.customer_email, cancelledOrder.order_number, 'cancelled').catch(err => {
        console.error("Failed to send order cancellation email:", err);
      });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

export default router;
