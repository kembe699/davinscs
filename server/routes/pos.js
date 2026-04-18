import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Generate sale number
function generateSaleNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
  return `POS-${year}${month}${day}-${time}`;
}

// Create new sale
router.post("/sales", requireAuth, async (req, res) => {
  const { customer_id, customer_name, items, payment_type_id, discount_amount, sale_type, notes, status, price_list_id } = req.body;
  const user_id = req.user.id;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Items are required" });
  }
  
  if (!payment_type_id) {
    return res.status(400).json({ error: "Payment type is required" });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Get current cash drawer session
    const sessionResult = await client.query(
      "SELECT id FROM cash_drawer_sessions WHERE user_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
      [user_id]
    );
    
    const session_id = sessionResult.rows[0]?.id || null;
    
    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;
    const processedItems = [];
    
    for (const item of items) {
      const productResult = await client.query(
        `SELECT p.*, COALESCE(t.rate, 0) as tax_rate 
         FROM products p 
         LEFT JOIN tax_rates t ON p.tax_rate_id = t.id 
         WHERE p.id = $1`,
        [item.product_id]
      );
      
      if (!productResult.rows[0]) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      
      const product = productResult.rows[0];
      
      // Check stock
      const available = product.quantity_on_hand - product.quantity_reserved;
      if (available < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      
      const unit_price = item.unit_price || product.price;
      const item_discount = item.discount_amount || 0;
      const item_subtotal = (unit_price * item.quantity) - item_discount;
      const item_tax = Math.round(item_subtotal * (product.tax_rate / 100));
      
      subtotal += item_subtotal;
      tax_amount += item_tax;
      
      processedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price,
        discount_amount: item_discount,
        tax_amount: item_tax,
        subtotal: item_subtotal
      });
      
      // Update inventory
      await client.query(
        "UPDATE products SET quantity_on_hand = quantity_on_hand - $1, updated_at = NOW() WHERE id = $2",
        [item.quantity, product.id]
      );
      
      // Record stock movement
      await client.query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
         VALUES ($1, 'sale', $2, 'pos_sale', 0, $3, 'POS Sale')`,
        [product.id, -item.quantity, user_id]
      );
    }
    
    const total_discount = discount_amount || 0;
    const total_amount = subtotal + tax_amount - total_discount;
    const sale_number = generateSaleNumber();
    
    // Determine payment status
    const payment_status = sale_type === 'credit' ? 'pending' : 'paid';
    
    // Create sale
    const saleResult = await client.query(
      `INSERT INTO pos_sales (sale_number, customer_id, customer_name, user_id, session_id, price_list_id, subtotal, tax_amount, 
                              discount_amount, total_amount, payment_type_id, payment_status, sale_type, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [sale_number, customer_id, customer_name, user_id, session_id, price_list_id || null, subtotal, tax_amount, total_discount, 
       total_amount, payment_type_id, payment_status, sale_type || 'regular', status || 'completed', notes]
    );
    
    const sale = saleResult.rows[0];
    
    // Create sale items
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO pos_sale_items (sale_id, product_id, product_name, quantity, unit_price, 
                                      discount_amount, tax_amount, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [sale.id, item.product_id, item.product_name, item.quantity, item.unit_price, 
         item.discount_amount, item.tax_amount, item.subtotal]
      );
    }
    
    // If credit sale, create credit record
    if (sale_type === 'credit' && customer_id) {
      const due_date = new Date();
      due_date.setDate(due_date.getDate() + 30); // Default 30 days
      
      await client.query(
        `INSERT INTO credit_sales (sale_id, customer_id, total_amount, balance, due_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale.id, customer_id, total_amount, total_amount, due_date]
      );
      
      // Update customer balance
      await client.query(
        "UPDATE customers SET balance = balance + $1 WHERE id = $2",
        [total_amount, customer_id]
      );
    }
    
    await client.query("COMMIT");
    
    // Fetch complete sale with items
    const completeSale = await pool.query(
      `SELECT s.*, 
              json_agg(json_build_object(
                'id', si.id,
                'product_id', si.product_id,
                'product_name', si.product_name,
                'quantity', si.quantity,
                'unit_price', si.unit_price,
                'discount_amount', si.discount_amount,
                'tax_amount', si.tax_amount,
                'subtotal', si.subtotal
              )) as items
       FROM pos_sales s
       LEFT JOIN pos_sale_items si ON s.id = si.sale_id
       WHERE s.id = $1
       GROUP BY s.id`,
      [sale.id]
    );
    
    res.json(completeSale.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  } finally {
    client.release();
  }
});

// Get all sales
router.get("/sales", requireAuth, async (req, res) => {
  const { start_date, end_date, customer_id, payment_status, sale_type } = req.query;
  
  try {
    let query = `
      SELECT s.*, c.name as customer_name, u.email as user_email, pt.name as payment_type_name
      FROM pos_sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN payment_types pt ON s.payment_type_id = pt.id
      WHERE s.voided = false
    `;
    const params = [];
    let paramCount = 1;
    
    if (start_date) {
      query += ` AND s.created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }
    
    if (end_date) {
      query += ` AND s.created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }
    
    if (customer_id) {
      query += ` AND s.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }
    
    if (payment_status) {
      query += ` AND s.payment_status = $${paramCount}`;
      params.push(payment_status);
      paramCount++;
    }
    
    if (sale_type) {
      query += ` AND s.sale_type = $${paramCount}`;
      params.push(sale_type);
      paramCount++;
    }
    
    query += " ORDER BY s.created_at DESC";
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get sale by ID
router.get("/sales/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      `SELECT s.*, 
              c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
              u.email as user_email,
              pt.name as payment_type_name,
              json_agg(json_build_object(
                'id', si.id,
                'product_id', si.product_id,
                'product_name', si.product_name,
                'quantity', si.quantity,
                'unit_price', si.unit_price,
                'discount_amount', si.discount_amount,
                'tax_amount', si.tax_amount,
                'subtotal', si.subtotal
              )) as items
       FROM pos_sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN payment_types pt ON s.payment_type_id = pt.id
       LEFT JOIN pos_sale_items si ON s.id = si.sale_id
       WHERE s.id = $1
       GROUP BY s.id, c.id, u.id, pt.id`,
      [id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Sale not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Void sale
router.post("/sales/:id/void", requireAuth, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Get sale details
    const saleResult = await client.query(
      "SELECT * FROM pos_sales WHERE id = $1 AND voided = false",
      [id]
    );
    
    if (!saleResult.rows[0]) {
      throw new Error("Sale not found or already voided");
    }
    
    const sale = saleResult.rows[0];
    
    // Get sale items
    const itemsResult = await client.query(
      "SELECT * FROM pos_sale_items WHERE sale_id = $1",
      [id]
    );
    
    // Restore inventory
    for (const item of itemsResult.rows) {
      await client.query(
        "UPDATE products SET quantity_on_hand = quantity_on_hand + $1, updated_at = NOW() WHERE id = $2",
        [item.quantity, item.product_id]
      );
      
      // Record stock movement
      await client.query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
         VALUES ($1, 'adjustment', $2, 'void_sale', $3, $4, 'Sale voided')`,
        [item.product_id, item.quantity, id, user_id]
      );
    }
    
    // If credit sale, update customer balance
    if (sale.sale_type === 'credit' && sale.customer_id) {
      await client.query(
        "UPDATE customers SET balance = balance - $1 WHERE id = $2",
        [sale.total_amount, sale.customer_id]
      );
      
      await client.query(
        "UPDATE credit_sales SET status = 'voided' WHERE sale_id = $1",
        [id]
      );
    }
    
    // Mark sale as voided
    await client.query(
      "UPDATE pos_sales SET voided = true, voided_at = NOW(), voided_by = $1 WHERE id = $2",
      [user_id, id]
    );
    
    await client.query("COMMIT");
    
    res.json({ message: "Sale voided successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  } finally {
    client.release();
  }
});

// Process refund
router.post("/sales/:id/refund", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { items } = req.body; // Array of {product_id, quantity}
  const user_id = req.user.id;
  
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Get sale details
    const saleResult = await client.query(
      "SELECT * FROM pos_sales WHERE id = $1 AND voided = false",
      [id]
    );
    
    if (!saleResult.rows[0]) {
      throw new Error("Sale not found or voided");
    }
    
    const sale = saleResult.rows[0];
    
    // Process refund items
    let refund_amount = 0;
    
    for (const refundItem of items) {
      const itemResult = await client.query(
        "SELECT * FROM pos_sale_items WHERE sale_id = $1 AND product_id = $2",
        [id, refundItem.product_id]
      );
      
      if (!itemResult.rows[0]) {
        throw new Error(`Item not found in sale`);
      }
      
      const item = itemResult.rows[0];
      
      if (refundItem.quantity > item.quantity) {
        throw new Error(`Refund quantity exceeds sold quantity`);
      }
      
      // Calculate refund amount
      const item_refund = Math.round((item.subtotal / item.quantity) * refundItem.quantity);
      refund_amount += item_refund;
      
      // Restore inventory
      await client.query(
        "UPDATE products SET quantity_on_hand = quantity_on_hand + $1, updated_at = NOW() WHERE id = $2",
        [refundItem.quantity, refundItem.product_id]
      );
      
      // Record stock movement
      await client.query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
         VALUES ($1, 'return', $2, 'refund', $3, $4, 'Refund')`,
        [refundItem.product_id, refundItem.quantity, id, user_id]
      );
    }
    
    // Create refund sale (negative sale)
    const refund_number = `REF-${sale.sale_number}`;
    await client.query(
      `INSERT INTO pos_sales (sale_number, customer_id, user_id, session_id, subtotal, tax_amount, 
                              discount_amount, total_amount, payment_type_id, payment_status, sale_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'refunded', 'refund', $10)`,
      [refund_number, sale.customer_id, user_id, sale.session_id, -refund_amount, 0, 0, 
       -refund_amount, sale.payment_type_id, `Refund for ${sale.sale_number}`]
    );
    
    await client.query("COMMIT");
    
    res.json({ message: "Refund processed successfully", refund_amount });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  } finally {
    client.release();
  }
});

export default router;
