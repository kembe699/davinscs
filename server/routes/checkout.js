import express from "express";
import nodemailer from "nodemailer";
import pool, { getSchemaClient } from "../db.js";
import { optionalTenantContext } from "../middleware/auth.js";

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

router.post("/", optionalTenantContext, async (req, res) => {
  const { customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_postal_code, shipping_country, notes } = req.body;
  
  if (!customer_name || !customer_email || !shipping_address) {
    return res.status(400).json({ error: "Name, email, and address required" });
  }
  
  const sessionId = req.session.id;
  if (!sessionId) {
    return res.status(400).json({ error: "No active cart session" });
  }
  
  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");
    
    const cartResult = await client.query(`
      SELECT 
        ci.id, ci.product_id, ci.quantity,
        p.name, p.price, p.quantity_on_hand, p.quantity_reserved
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.session_id = $1
    `, [sessionId]);
    
    if (cartResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cart is empty" });
    }
    
    for (const item of cartResult.rows) {
      const available = item.quantity_on_hand - item.quantity_reserved;
      if (available < item.quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
      }
    }
    
    let customerResult = await client.query(
      "SELECT id FROM customers WHERE email = $1",
      [customer_email.toLowerCase()]
    );
    
    let customerId;
    if (customerResult.rows[0]) {
      customerId = customerResult.rows[0].id;
      await client.query(
        `UPDATE customers SET name = $1, phone = $2, address = $3, city = $4, postal_code = $5, country = $6 
         WHERE id = $7`,
        [customer_name, customer_phone, shipping_address, shipping_city, shipping_postal_code, shipping_country, customerId]
      );
    } else {
      const newCustomerResult = await client.query(
        `INSERT INTO customers (name, email, phone, address, city, postal_code, country) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [customer_name, customer_email.toLowerCase(), customer_phone, shipping_address, shipping_city, shipping_postal_code, shipping_country]
      );
      customerId = newCustomerResult.rows[0].id;
    }
    
    const orderNumber = `ORD-${Date.now()}`;
    const subtotal = cartResult.rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = 0;
    const total = subtotal + shippingCost;
    
    const orderResult = await client.query(
      `INSERT INTO customer_orders 
       (order_number, customer_id, customer_name, customer_email, customer_phone, 
        shipping_address, shipping_city, shipping_postal_code, shipping_country, 
        subtotal, shipping_cost, total, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [orderNumber, customerId, customer_name, customer_email, customer_phone,
       shipping_address, shipping_city, shipping_postal_code, shipping_country,
       subtotal, shippingCost, total, notes]
    );
    
    const orderId = orderResult.rows[0].id;
    
    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.product_id, item.name, item.price, item.quantity, item.price * item.quantity]
      );
      
      await client.query(
        "UPDATE products SET quantity_reserved = quantity_reserved + $1 WHERE id = $2",
        [item.quantity, item.product_id]
      );
      
      await client.query(
        `INSERT INTO stock_movements 
         (product_id, movement_type, quantity, reference_type, reference_id, notes) 
         VALUES ($1, 'sale', $2, 'customer_order', $3, 'Reserved for order')`,
        [item.product_id, -item.quantity, orderId]
      );
    }
    
    await client.query("DELETE FROM cart_items WHERE session_id = $1", [sessionId]);
    
    await client.query("COMMIT");
    
    const orderItemsHtml = cartResult.rows.map(item => 
      `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.price.toLocaleString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${(item.price * item.quantity).toLocaleString()}</td>
      </tr>`
    ).join('');
    
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Thank you for your order, ${customer_name}!</p>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h3 style="margin-top: 30px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${orderItemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Subtotal:</td>
              <td style="padding: 8px; text-align: right; font-weight: bold;">${subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Shipping:</td>
              <td style="padding: 8px; text-align: right; font-weight: bold;">${shippingCost.toLocaleString()}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold; font-size: 18px;">Total:</td>
              <td style="padding: 8px; text-align: right; font-weight: bold; font-size: 18px;">${total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        
        <h3 style="margin-top: 30px;">Shipping Address</h3>
        <p>
          ${shipping_address}<br>
          ${shipping_city}, ${shipping_postal_code}<br>
          ${shipping_country}
        </p>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #333;">
          <p style="margin: 0;"><strong>Next Steps:</strong></p>
          <p style="margin: 5px 0 0 0;">We'll contact you shortly to arrange payment and delivery. If you have any questions, please reply to this email.</p>
        </div>
        
        <p style="margin-top: 30px; color: #666; font-size: 12px;">Thank you for shopping with Davin's Store!</p>
      </div>
    `;
    
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif;">
        <h2>New Order Received</h2>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Customer:</strong> ${customer_name}</p>
        <p><strong>Email:</strong> ${customer_email}</p>
        <p><strong>Phone:</strong> ${customer_phone || 'N/A'}</p>
        
        <h3>Order Items</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Product</th>
              <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Qty</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Price</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${orderItemsHtml}
          </tbody>
        </table>
        
        <p><strong>Total:</strong> ${total.toLocaleString()}</p>
        
        <h3>Shipping Address</h3>
        <p>
          ${shipping_address}<br>
          ${shipping_city}, ${shipping_postal_code}<br>
          ${shipping_country}
        </p>
        
        ${notes ? `<h3>Customer Notes</h3><p>${notes}</p>` : ''}
      </div>
    `;
    
    try {
      await transporter.sendMail({
        from: `"Davin's Store" <${process.env.SMTP_USER}>`,
        to: customer_email,
        subject: `Order Confirmation - ${orderNumber}`,
        html: customerEmailHtml,
      });
      
      if (process.env.ADMIN_EMAIL) {
        await transporter.sendMail({
          from: `"Davin's Store" <${process.env.SMTP_USER}>`,
          to: process.env.ADMIN_EMAIL,
          subject: `New Order - ${orderNumber}`,
          html: adminEmailHtml,
        });
      }
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
    }
    
    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

router.get("/orders/:id", optionalTenantContext, async (req, res) => {
  try {
    const orderResult = await pool.query(
      "SELECT * FROM customer_orders WHERE id = $1",
      [req.params.id]
    );
    
    if (!orderResult.rows[0]) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    const itemsResult = await pool.query(
      "SELECT * FROM order_items WHERE order_id = $1",
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

export default router;
