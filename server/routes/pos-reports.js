import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Daily sales summary
router.get("/daily-sales", requireAuth, async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  try {
    const { rows } = await pool.query(
      `SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(AVG(total_amount), 0) as average_sale
       FROM pos_sales
       WHERE DATE(created_at) = $1 AND voided = false AND status != 'held'`,
      [targetDate]
    );

    const paymentBreakdown = await pool.query(
      `SELECT pt.name, COUNT(*) as count, COALESCE(SUM(s.total_amount), 0) as total
       FROM pos_sales s
       JOIN payment_types pt ON s.payment_type_id = pt.id
       WHERE DATE(s.created_at) = $1 AND s.voided = false AND s.status != 'held'
       GROUP BY pt.name`,
      [targetDate]
    );
    
    res.json({
      date: targetDate,
      summary: rows[0],
      payment_breakdown: paymentBreakdown.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Hourly sales
router.get("/hourly-sales", requireAuth, async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  try {
    const { rows } = await pool.query(
      `SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as sales_count,
        COALESCE(SUM(total_amount), 0) as total_amount
       FROM pos_sales
       WHERE DATE(created_at) = $1 AND voided = false AND status != 'held'
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour`,
      [targetDate]
    );
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Top products
router.get("/top-products", requireAuth, async (req, res) => {
  const { start_date, end_date, limit } = req.query;
  const maxLimit = limit || 10;
  
  try {
    let query = `
      SELECT 
        si.product_id,
        si.product_name,
        SUM(si.quantity) as total_quantity,
        COALESCE(SUM(si.subtotal), 0) as total_revenue,
        COUNT(DISTINCT si.sale_id) as times_sold
      FROM pos_sale_items si
      JOIN pos_sales s ON si.sale_id = s.id
      WHERE s.voided = false AND s.status != 'held'
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
    
    query += ` GROUP BY si.product_id, si.product_name
               ORDER BY total_revenue DESC
               LIMIT $${paramCount}`;
    params.push(maxLimit);
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Top customers
router.get("/top-customers", requireAuth, async (req, res) => {
  const { start_date, end_date, limit } = req.query;
  const maxLimit = limit || 10;
  
  try {
    let query = `
      SELECT 
        c.id,
        c.name,
        c.email,
        COUNT(s.id) as total_purchases,
        COALESCE(SUM(s.total_amount), 0) as total_spent,
        COALESCE(AVG(s.total_amount), 0) as average_purchase
      FROM customers c
      JOIN pos_sales s ON c.id = s.customer_id
      WHERE s.voided = false AND s.status != 'held'
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
    
    query += ` GROUP BY c.id, c.name, c.email
               ORDER BY total_spent DESC
               LIMIT $${paramCount}`;
    params.push(maxLimit);
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Payment method breakdown
router.get("/payment-methods", requireAuth, async (req, res) => {
  const { start_date, end_date } = req.query;
  
  try {
    let query = `
      SELECT 
        pt.name,
        pt.code,
        COUNT(s.id) as transaction_count,
        COALESCE(SUM(s.total_amount), 0) as total_amount
      FROM payment_types pt
      LEFT JOIN pos_sales s ON pt.id = s.payment_type_id AND s.voided = false AND s.status != 'held'
      WHERE 1=1
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
    
    query += ` GROUP BY pt.id, pt.name, pt.code
               ORDER BY total_amount DESC`;
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Monthly sales trend
router.get("/monthly-sales", requireAuth, async (req, res) => {
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();
  
  try {
    const { rows } = await pool.query(
      `SELECT 
        EXTRACT(MONTH FROM created_at) as month,
        COUNT(*) as sales_count,
        COALESCE(SUM(total_amount), 0) as total_amount
       FROM pos_sales
       WHERE EXTRACT(YEAR FROM created_at) = $1 AND voided = false AND status != 'held'
       GROUP BY EXTRACT(MONTH FROM created_at)
       ORDER BY month`,
      [targetYear]
    );
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// End of day report
router.get("/end-of-day", requireAuth, async (req, res) => {
  const { date, session_id } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  try {
    let sessionFilter = "";
    const params = [targetDate];
    
    if (session_id) {
      sessionFilter = " AND session_id = $2";
      params.push(session_id);
    }
    
    // Sales summary
    const salesSummary = await pool.query(
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(SUM(subtotal), 0) as subtotal
       FROM pos_sales
       WHERE DATE(created_at) = $1 AND voided = false AND status != 'held'${sessionFilter}`,
      params
    );
    
    // Payment breakdown
    const paymentBreakdown = await pool.query(
      `SELECT pt.name, COUNT(*) as count, COALESCE(SUM(s.total_amount), 0) as total
       FROM pos_sales s
       JOIN payment_types pt ON s.payment_type_id = pt.id
       WHERE DATE(s.created_at) = $1 AND s.voided = false AND s.status != 'held'${sessionFilter}
       GROUP BY pt.name`,
      params
    );

    // Top products
    const topProducts = await pool.query(
      `SELECT si.product_name, SUM(si.quantity) as quantity, COALESCE(SUM(si.subtotal), 0) as revenue
       FROM pos_sale_items si
       JOIN pos_sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) = $1 AND s.voided = false AND s.status != 'held'${sessionFilter}
       GROUP BY si.product_name
       ORDER BY revenue DESC
       LIMIT 10`,
      params
    );
    
    // Voided sales
    const voidedSales = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
       FROM pos_sales
       WHERE DATE(created_at) = $1 AND voided = true${sessionFilter}`,
      params
    );

    // Refund breakdown
    const refundBreakdown = await pool.query(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(ABS(total_amount)), 0) as total_refunded,
              COALESCE(SUM(ABS(subtotal)), 0) as subtotal_refunded
       FROM pos_sales
       WHERE DATE(created_at) = $1 AND sale_type = 'refund'${sessionFilter}`,
      params
    );

    // Cashier / user breakdown
    const cashierBreakdown = await pool.query(
      `SELECT u.id as user_id,
              u.email as cashier_name,
              u.email,
              COUNT(s.id) as total_transactions,
              COALESCE(SUM(s.total_amount), 0) as total_sales,
              COALESCE(SUM(s.discount_amount), 0) as total_discounts
       FROM pos_sales s
       JOIN users u ON s.user_id = u.id
       WHERE DATE(s.created_at) = $1 AND s.voided = false AND s.status != 'held'${sessionFilter}
       GROUP BY u.id, u.email
       ORDER BY total_sales DESC`,
      params
    );

    // Per-currency breakdown — each transaction uses its own snapshotted rate
    // base_total = total_amount (always stored in base currency)
    // display_total = total_amount * exchange_rate_used (amount customer paid in their currency)
    const currencyBreakdown = await pool.query(
      `SELECT
         c.code as currency_code,
         c.symbol as currency_symbol,
         c.is_base,
         COUNT(s.id) as transaction_count,
         COALESCE(SUM(s.total_amount), 0) as base_total,
         COALESCE(SUM(ROUND(s.total_amount * COALESCE(s.exchange_rate_used, 1))), 0) as display_total,
         MIN(s.exchange_rate_used) as rate_min,
         MAX(s.exchange_rate_used) as rate_max
       FROM pos_sales s
       JOIN currencies c ON c.id = COALESCE(s.sale_currency_id,
         (SELECT id FROM currencies WHERE is_base = TRUE LIMIT 1))
       WHERE DATE(s.created_at) = $1 AND s.voided = false AND s.status != 'held'${sessionFilter}
       GROUP BY c.id, c.code, c.symbol, c.is_base
       ORDER BY base_total DESC`,
      params
    );

    // When this report is scoped to one shift, include that shift's cash
    // reconciliation (opening/closing/expected/difference) too — the sales
    // totals above don't tell a cashier or admin whether the drawer actually
    // balanced when it was closed.
    let session = null;
    if (session_id) {
      const sessionRes = await pool.query(
        `SELECT id, opening_cash, closing_cash, expected_cash, cash_difference, notes,
                difference_resolved_amount, difference_resolved_notes, difference_resolved_at,
                status, opened_at, closed_at
         FROM cash_drawer_sessions WHERE id = $1`,
        [session_id]
      );
      session = sessionRes.rows[0] || null;
    }

    res.json({
      date: targetDate,
      sales_summary: salesSummary.rows[0],
      payment_breakdown: paymentBreakdown.rows,
      currency_breakdown: currencyBreakdown.rows,
      top_products: topProducts.rows,
      voided_sales: voidedSales.rows[0],
      refund_summary: refundBreakdown.rows[0],
      cashier_breakdown: cashierBreakdown.rows,
      session
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
