import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// ============ SALES REPORTS ============

// Daily sales report
router.get("/sales/daily", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE sale_type != 'refund') as total_sales,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(AVG(total_amount) FILTER (WHERE sale_type != 'refund'), 0) as average_sale
       FROM pos_sales
       WHERE DATE(created_at) BETWEEN $1 AND $2 AND voided = false AND status != 'held'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [startDate, endDate]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error in daily sales report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Sales by user (cashier)
router.get("/sales/by-user", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT
        u.id as user_id,
        u.email as user_email,
        COUNT(s.id) FILTER (WHERE s.sale_type != 'refund') as total_sales,
        COALESCE(SUM(s.total_amount), 0) as total_revenue,
        COALESCE(SUM(s.tax_amount), 0) as total_tax,
        COALESCE(AVG(s.total_amount) FILTER (WHERE s.sale_type != 'refund'), 0) as average_sale
       FROM users u
       LEFT JOIN pos_sales s ON u.id = s.user_id AND s.voided = false AND s.status != 'held'
         AND DATE(s.created_at) BETWEEN $1 AND $2
       GROUP BY u.id, u.email
       HAVING COUNT(s.id) FILTER (WHERE s.sale_type != 'refund') > 0
       ORDER BY total_revenue DESC`,
      [startDate, endDate]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error in sales by user report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Sales by customer
router.get("/sales/by-customer", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT
        COALESCE(customer_name, 'Walk-in Customer') as customer_name,
        customer_id,
        COUNT(*) FILTER (WHERE sale_type != 'refund') as total_purchases,
        COALESCE(SUM(total_amount), 0) as total_spent,
        COALESCE(AVG(total_amount) FILTER (WHERE sale_type != 'refund'), 0) as average_purchase,
        MAX(created_at) as last_purchase
       FROM pos_sales
       WHERE DATE(created_at) BETWEEN $1 AND $2 AND voided = false AND status != 'held'
       GROUP BY customer_id, customer_name
       ORDER BY total_spent DESC`,
      [startDate, endDate]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error in sales by customer report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Sales by product
router.get("/sales/by-product", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT 
        si.product_id,
        si.product_name,
        SUM(si.quantity) as total_quantity,
        COALESCE(SUM(si.subtotal), 0) as total_revenue,
        COALESCE(SUM(si.tax_amount), 0) as total_tax,
        COUNT(DISTINCT si.sale_id) FILTER (WHERE s.sale_type != 'refund') as times_sold,
        COALESCE(AVG(si.unit_price) FILTER (WHERE s.sale_type != 'refund'), 0) as average_price
       FROM pos_sale_items si
       JOIN pos_sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) BETWEEN $1 AND $2 AND s.voided = false AND s.status != 'held'
       GROUP BY si.product_id, si.product_name
       ORDER BY total_revenue DESC`,
      [startDate, endDate]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error in sales by product report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POS vs Website comparison
// Sales by scheme / price list
router.get("/sales/by-scheme", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date, price_list_id } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];
    const schemeId = price_list_id !== undefined ? parseInt(price_list_id) : null;

    const params = [startDate, endDate];
    let schemeFilter = '';
    if (schemeId === 0) {
      // 0 = Cash (Standard) — sales with no scheme assigned
      schemeFilter = 'AND s.price_list_id IS NULL';
    } else if (schemeId) {
      schemeFilter = 'AND s.price_list_id = $3';
      params.push(schemeId);
    }

    const { rows } = await pool.query(
      `SELECT 
        COALESCE(pl.name, 'Cash (Standard)') as scheme_name,
        COALESCE(c.code, '') as currency_code,
        COALESCE(c.symbol, '') as currency_symbol,
        COUNT(s.id) FILTER (WHERE s.sale_type != 'refund') as total_sales,
        COALESCE(SUM(s.total_amount), 0) as total_revenue,
        COALESCE(SUM(s.tax_amount), 0) as total_tax,
        COALESCE(SUM(s.discount_amount), 0) as total_discounts,
        COALESCE(AVG(s.total_amount) FILTER (WHERE s.sale_type != 'refund'), 0) as average_sale
       FROM pos_sales s
       LEFT JOIN price_lists pl ON s.price_list_id = pl.id
       LEFT JOIN currencies c ON pl.currency_id = c.id
       WHERE DATE(s.created_at) BETWEEN $1 AND $2
         AND COALESCE(s.voided, false) = false
         AND s.status != 'held'
         ${schemeFilter}
       GROUP BY pl.id, pl.name, c.code, c.symbol
       ORDER BY total_revenue DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("Error in sales by scheme report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============ EXPENSES REPORTS ============

// Expenses summary
router.get("/expenses/summary", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    let accountingTotal = 0;
    let cashDrawerTotal = 0;
    let procurementTotal = 0;

    // Accounting expenses (journal entries)
    try {
      const accountingExpenses = await pool.query(
        `SELECT COALESCE(SUM(ABS(amount)), 0) as total
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         WHERE a.type = 'expense'
           AND DATE(t.transaction_date) BETWEEN $1 AND $2`,
        [startDate, endDate]
      );
      accountingTotal = parseFloat(accountingExpenses.rows[0].total) || 0;
    } catch (err) { /* table not available */ }

    // Cash drawer cash-out
    try {
      const cashDrawerExpenses = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM cash_drawer_transactions
         WHERE type = 'cash_out'
           AND DATE(created_at) BETWEEN $1 AND $2`,
        [startDate, endDate]
      );
      cashDrawerTotal = parseFloat(cashDrawerExpenses.rows[0].total) || 0;
    } catch (err) { /* table not available */ }

    // Procurement supplier payments — base_amount is the base-currency equivalent
    // (payments against a foreign-currency PO are converted using the PO's rate at
    // the time of payment; base_amount already equals amount for base-currency POs)
    try {
      const procurementExpenses = await pool.query(
        `SELECT COALESCE(SUM(COALESCE(base_amount, amount)), 0) as total
         FROM supplier_payments
         WHERE DATE(payment_date) BETWEEN $1 AND $2`,
        [startDate, endDate]
      );
      procurementTotal = parseFloat(procurementExpenses.rows[0].total) || 0;
    } catch (err) { /* table not available */ }

    res.json({
      accounting_expenses: accountingTotal,
      cash_drawer_expenses: cashDrawerTotal,
      procurement_payments: procurementTotal,
      total_expenses: accountingTotal + cashDrawerTotal + procurementTotal
    });
  } catch (err) {
    console.error("Error in expenses summary:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Expenses by category
router.get("/expenses/by-category", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const rows = [];

    // Accounting chart-of-accounts expense categories
    try {
      const { rows: accRows } = await pool.query(
        `SELECT
          a.code,
          a.name as category_name,
          COUNT(t.id)::int as transaction_count,
          COALESCE(SUM(ABS(t.amount)), 0) as total_amount
         FROM accounts a
         LEFT JOIN transactions t ON a.id = t.account_id
           AND DATE(t.transaction_date) BETWEEN $1 AND $2
         WHERE a.type = 'expense'
         GROUP BY a.id, a.code, a.name
         HAVING COUNT(t.id) > 0
         ORDER BY total_amount DESC`,
        [startDate, endDate]
      );
      rows.push(...accRows);
    } catch (err) { /* table not available */ }

    // Procurement supplier payments grouped by supplier — base-currency equivalent
    try {
      const { rows: procRows } = await pool.query(
        `SELECT
          'PROC' as code,
          COALESCE(s.name, 'Unknown Supplier') as category_name,
          COUNT(sp.id)::int as transaction_count,
          COALESCE(SUM(COALESCE(sp.base_amount, sp.amount)), 0) as total_amount
         FROM supplier_payments sp
         LEFT JOIN suppliers s ON sp.supplier_id = s.id
         WHERE DATE(sp.payment_date) BETWEEN $1 AND $2
         GROUP BY s.id, s.name
         ORDER BY total_amount DESC`,
        [startDate, endDate]
      );
      rows.push(...procRows);
    } catch (err) { /* table not available */ }

    // Cash drawer cash-out
    try {
      const { rows: cdRows } = await pool.query(
        `SELECT
          'CASH-OUT' as code,
          COALESCE(reason, 'Cash Expense') as category_name,
          COUNT(id)::int as transaction_count,
          COALESCE(SUM(amount), 0) as total_amount
         FROM cash_drawer_transactions
         WHERE type = 'cash_out'
           AND DATE(created_at) BETWEEN $1 AND $2
         GROUP BY reason
         ORDER BY total_amount DESC`,
        [startDate, endDate]
      );
      rows.push(...cdRows);
    } catch (err) { /* table not available */ }

    res.json(rows);
  } catch (err) {
    console.error("Error in expenses by category:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Cash drawer expenses
router.get("/expenses/cash-drawer", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    try {
      const { rows } = await pool.query(
        `SELECT 
          cm.id,
          cm.amount,
          cm.reason,
          cm.created_at,
          u.email as user_email,
          cm.session_id
         FROM cash_movements cm
         LEFT JOIN users u ON cm.user_id = u.id
         WHERE cm.type = 'out'
           AND DATE(cm.created_at) BETWEEN $1 AND $2
         ORDER BY cm.created_at DESC`,
        [startDate, endDate]
      );
      res.json(rows);
    } catch (err) {
      console.error("Cash drawer expenses query error:", err.message);
      res.json([]);
    }
  } catch (err) {
    console.error("Error in cash drawer expenses:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============ INVENTORY REPORTS ============

// Stock movement
router.get("/inventory/stock-movement", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date, product_id } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    let query = `
      SELECT 
        sm.id,
        sm.product_id,
        p.name as product_name,
        sm.movement_type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id,
        sm.notes,
        sm.created_at,
        u.email as user_email
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE DATE(sm.created_at) BETWEEN $1 AND $2
    `;
    
    const params = [startDate, endDate];
    
    if (product_id) {
      query += ` AND sm.product_id = $3`;
      params.push(product_id);
    }
    
    query += ` ORDER BY sm.created_at DESC LIMIT 500`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error in stock movement report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Expiring soon products
router.get("/inventory/expiring", requireAuth, async (req, res) => {
  try {
    try {
      const { rows } = await pool.query(
        `SELECT 
          id,
          name,
          barcode,
          quantity_on_hand,
          expiry_date,
          (expiry_date - CURRENT_DATE) as days_until_expiry
         FROM products
         WHERE expiry_date IS NOT NULL
           AND expiry_date > CURRENT_DATE
           AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
           AND quantity_on_hand > 0
         ORDER BY expiry_date ASC`
      );
      res.json(rows);
    } catch (err) {
      console.error("Expiring products query failed:", err);
      res.json([]);
    }
  } catch (err) {
    console.error("Error in expiring products report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Expired products
router.get("/inventory/expired", requireAuth, async (req, res) => {
  try {
    try {
      const { rows } = await pool.query(
        `SELECT 
          id,
          name,
          barcode,
          quantity_on_hand,
          expiry_date,
          (CURRENT_DATE - expiry_date) as days_expired
         FROM products
         WHERE expiry_date IS NOT NULL
           AND expiry_date < CURRENT_DATE
           AND quantity_on_hand > 0
         ORDER BY expiry_date ASC`
      );
      res.json(rows);
    } catch (err) {
      console.error("Expired products query failed:", err);
      res.json([]);
    }
  } catch (err) {
    console.error("Error in expired products report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Low stock products
router.get("/inventory/low-stock", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        id,
        name,
        barcode,
        quantity_on_hand,
        reorder_level,
        (reorder_level - quantity_on_hand) as units_below_reorder
       FROM products
       WHERE quantity_on_hand > 0
         AND quantity_on_hand <= reorder_level
         AND product_type != 'service'
       ORDER BY units_below_reorder DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error in low stock report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Out of stock products
router.get("/inventory/out-of-stock", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        id,
        name,
        barcode,
        reorder_level,
        in_stock,
        updated_at
       FROM products
       WHERE quantity_on_hand = 0
         AND product_type != 'service'
       ORDER BY updated_at DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error in out of stock report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============ TRENDING/ANALYTICS REPORTS ============

// Most trending products
router.get("/trending/products", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date, limit } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];
    const maxLimit = limit || 20;

    const { rows } = await pool.query(
      `SELECT
        si.product_id,
        si.product_name,
        SUM(si.quantity) as total_quantity,
        COALESCE(SUM(si.subtotal), 0) as total_revenue
       FROM pos_sale_items si
       JOIN pos_sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) BETWEEN $1 AND $2 AND s.voided = false AND s.status != 'held'
       GROUP BY si.product_id, si.product_name
       ORDER BY total_revenue DESC
       LIMIT $3`,
      [startDate, endDate, maxLimit]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error in trending products report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============ INVOICE REPORTS ============

// Invoice Overview — status-grouped summary
router.get("/invoices/overview", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || '2000-01-01';
    const endDate   = end_date   || new Date().toISOString().split('T')[0];

    const { rows: byStatus } = await pool.query(
      `SELECT
         status,
         COUNT(*)::int                              AS invoice_count,
         COALESCE(SUM(total_amount), 0)     AS total_billed,
         COALESCE(SUM(paid_amount), 0)      AS total_paid,
         COALESCE(SUM(total_amount - paid_amount), 0) AS total_outstanding
       FROM invoices
       WHERE DATE(created_at) BETWEEN $1 AND $2
       GROUP BY status
       ORDER BY status`,
      [startDate, endDate]
    );

    const { rows: totals } = await pool.query(
      `SELECT
         COUNT(*)::int                              AS total_invoices,
         COALESCE(SUM(total_amount), 0)     AS total_billed,
         COALESCE(SUM(paid_amount), 0)      AS total_collected,
         -- A voided invoice was written off, not just uncollected — it
         -- shouldn't still count as money the business expects to collect.
         COALESCE(SUM(total_amount - paid_amount) FILTER (WHERE status != 'voided'), 0) AS total_outstanding,
         COUNT(*) FILTER (WHERE status = 'paid')::int    AS paid_count,
         COUNT(*) FILTER (WHERE status = 'unpaid')::int  AS unpaid_count,
         COUNT(*) FILTER (WHERE status = 'partial')::int AS partial_count,
         COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue_count,
         COUNT(*) FILTER (WHERE status IN ('unpaid','partial') AND due_date < CURRENT_DATE)::int AS actually_overdue
       FROM invoices
       WHERE DATE(created_at) BETWEEN $1 AND $2`,
      [startDate, endDate]
    );

    res.json({ byStatus: byStatus, totals: totals[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// All invoices list (date-filtered)
router.get("/invoices/all", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || '2000-01-01';
    const endDate   = end_date   || new Date().toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT
         invoice_number,
         customer_name,
         COALESCE(customer_phone, '') AS customer_phone,
         DATE(created_at)             AS date,
         due_date,
         total_amount,
         paid_amount,
         (total_amount - paid_amount) AS balance_due,
         status
       FROM invoices
       WHERE DATE(created_at) BETWEEN $1 AND $2
       ORDER BY created_at DESC`,
      [startDate, endDate]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Overdue invoices (past due date, not fully paid)
router.get("/invoices/overdue", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         invoice_number,
         customer_name,
         COALESCE(customer_phone, '') AS customer_phone,
         DATE(created_at)             AS date,
         due_date,
         total_amount,
         paid_amount,
         (total_amount - paid_amount) AS balance_due,
         EXTRACT(DAY FROM NOW() - due_date)::int AS days_overdue,
         status
       FROM invoices
       WHERE status IN ('unpaid','partial')
         AND due_date IS NOT NULL
         AND due_date < CURRENT_DATE
       ORDER BY due_date ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Partially paid invoices
router.get("/invoices/partial", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || '2000-01-01';
    const endDate   = end_date   || new Date().toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT
         invoice_number,
         customer_name,
         COALESCE(customer_phone, '') AS customer_phone,
         DATE(created_at)             AS date,
         due_date,
         total_amount,
         paid_amount,
         (total_amount - paid_amount) AS balance_due,
         ROUND(paid_amount::numeric / NULLIF(total_amount,0) * 100, 1) AS payment_pct,
         status
       FROM invoices
       WHERE status = 'partial'
         AND DATE(created_at) BETWEEN $1 AND $2
       ORDER BY created_at DESC`,
      [startDate, endDate]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Invoice payment collections
router.get("/invoices/collections", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || '2000-01-01';
    const endDate   = end_date   || new Date().toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT
         DATE(ip.created_at)  AS payment_date,
         i.invoice_number,
         i.customer_name,
         ip.payment_method,
         ip.amount,
         COALESCE(ip.notes,'') AS notes
       FROM invoice_payments ip
       JOIN invoices i ON ip.invoice_id = i.id
       WHERE DATE(ip.created_at) BETWEEN $1 AND $2
       ORDER BY ip.created_at DESC`,
      [startDate, endDate]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============ INCOME STATEMENT ============

router.get("/income-statement", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate   = end_date   || new Date().toISOString().split('T')[0];

    // ── REVENUE ──────────────────────────────────────────────────────────
    let posRevenue = 0, invoiceRevenue = 0;

    try {
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(total_amount),0) as total FROM pos_sales
         WHERE DATE(created_at) BETWEEN $1 AND $2 AND voided = false AND status != 'held'`,
        [startDate, endDate]
      );
      posRevenue = parseFloat(rows[0].total) || 0;
    } catch (e) {}

    try {
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(amount),0) as total FROM invoice_payments
         WHERE DATE(created_at) BETWEEN $1 AND $2`,
        [startDate, endDate]
      );
      invoiceRevenue = parseFloat(rows[0].total) || 0;
    } catch (e) {}

    // ── COGS (from actual sale items × cost_price) ────────────────────
    let cogsAmount = 0;
    try {
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(psi.quantity * COALESCE(p.cost_price,0)),0) as total
         FROM pos_sale_items psi
         JOIN pos_sales ps ON psi.sale_id = ps.id
         JOIN products p   ON psi.product_id = p.id
         WHERE DATE(ps.created_at) BETWEEN $1 AND $2 AND ps.voided = false AND ps.status != 'held'`,
        [startDate, endDate]
      );
      cogsAmount = parseFloat(rows[0].total) || 0;
    } catch (e) { console.error('COGS query error:', e.message); }

    // ── OPERATING EXPENSES ────────────────────────────────────────────
    let procurementExpenses = 0, cashDrawerExpenses = 0, otherAccountingExpenses = 0;

    try {
      // base_amount is the base-currency equivalent of the payment (converted using
      // the originating PO's exchange rate) — falls back to amount for base-currency
      // POs and for payments made before this conversion existed.
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(COALESCE(base_amount, amount)),0) as total FROM supplier_payments
         WHERE DATE(payment_date) BETWEEN $1 AND $2`,
        [startDate, endDate]
      );
      procurementExpenses = parseFloat(rows[0].total) || 0;
    } catch (e) {}

    try {
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(amount),0) as total FROM cash_movements
         WHERE type = 'out' AND DATE(created_at) BETWEEN $1 AND $2`,
        [startDate, endDate]
      );
      cashDrawerExpenses = parseFloat(rows[0].total) || 0;
    } catch (e) { console.error('Cash drawer expenses query error:', e.message); }

    // Other accounting expenses (exclude COGS account 5000)
    try {
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(tl.debit),0) as total
         FROM transaction_lines tl
         JOIN transactions t  ON tl.transaction_id = t.id
         JOIN accounts a      ON tl.account_id = a.id
         WHERE a.account_type = 'expense'
           AND a.code != '5000'
           AND DATE(t.transaction_date) BETWEEN $1 AND $2`,
        [startDate, endDate]
      );
      otherAccountingExpenses = parseFloat(rows[0].total) || 0;
    } catch (e) {}

    const totalRevenue      = posRevenue + invoiceRevenue;
    const grossProfit       = totalRevenue - cogsAmount;
    const totalOpExpenses   = procurementExpenses + cashDrawerExpenses + otherAccountingExpenses;
    const netIncome         = grossProfit - totalOpExpenses;

    res.json({
      start_date: startDate,
      end_date:   endDate,
      revenue: [
        { label: 'POS Sales',           amount: posRevenue },
        { label: 'Invoice Collections', amount: invoiceRevenue },
      ].filter(r => r.amount > 0),
      total_revenue:    totalRevenue,
      cogs:             cogsAmount,
      gross_profit:     grossProfit,
      expenses: [
        { label: 'Procurement Payments',  amount: procurementExpenses },
        { label: 'Cash Drawer Expenses',  amount: cashDrawerExpenses },
        { label: 'Other Expenses',        amount: otherAccountingExpenses },
      ].filter(e => e.amount > 0),
      total_expenses: totalOpExpenses,
      net_income:     netIncome,
    });
  } catch (err) {
    console.error("Error in income statement:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============ CASHFLOW REPORT ============

router.get("/cashflow", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(1)).toISOString().split('T')[0];
    const endDate   = end_date   || new Date().toISOString().split('T')[0];

    // 1. Cash-in from POS sales (cash payment type only, completed, not voided)
    const posCashIn = await pool.query(`
      SELECT DATE(s.created_at) as date,
             COALESCE(SUM(s.total_amount), 0) as amount,
             COUNT(*) as tx_count
      FROM pos_sales s
      JOIN payment_types pt ON s.payment_type_id = pt.id
      WHERE (pt.code ILIKE 'cash%' OR pt.name ILIKE '%cash%')
        AND s.voided = false
        AND s.sale_type != 'refund'
        AND s.status = 'completed'
        AND DATE(s.created_at) BETWEEN $1 AND $2
      GROUP BY DATE(s.created_at)
      ORDER BY date`, [startDate, endDate]);

    // 2. Cash-out from refunds (cash only)
    const posCashOut = await pool.query(`
      SELECT DATE(s.created_at) as date,
             COALESCE(SUM(ABS(s.total_amount)), 0) as amount,
             COUNT(*) as tx_count
      FROM pos_sales s
      JOIN payment_types pt ON s.payment_type_id = pt.id
      WHERE (pt.code ILIKE 'cash%' OR pt.name ILIKE '%cash%')
        AND s.sale_type = 'refund'
        AND DATE(s.created_at) BETWEEN $1 AND $2
      GROUP BY DATE(s.created_at)
      ORDER BY date`, [startDate, endDate]);

    // 3. Manual cash movements (in / out)
    const manualMovements = await pool.query(`
      SELECT DATE(m.created_at) as date,
             m.type,
             COALESCE(SUM(m.amount), 0) as amount,
             COUNT(*) as tx_count
      FROM cash_movements m
      WHERE DATE(m.created_at) BETWEEN $1 AND $2
        AND m.reason NOT LIKE 'POS Sale%'
      GROUP BY DATE(m.created_at), m.type
      ORDER BY date`, [startDate, endDate]);

    // 4. Daily breakdown — merge all sources
    const dayMap = {};
    const ensureDay = d => {
      if (!dayMap[d]) dayMap[d] = { date: d, sales_in: 0, sales_tx: 0, refunds_out: 0, refunds_tx: 0, manual_in: 0, manual_out: 0, manual_in_tx: 0, manual_out_tx: 0 };
    };

    posCashIn.rows.forEach(r => { ensureDay(r.date); dayMap[r.date].sales_in += parseFloat(r.amount); dayMap[r.date].sales_tx += parseInt(r.tx_count); });
    posCashOut.rows.forEach(r => { ensureDay(r.date); dayMap[r.date].refunds_out += parseFloat(r.amount); dayMap[r.date].refunds_tx += parseInt(r.tx_count); });
    manualMovements.rows.forEach(r => {
      ensureDay(r.date);
      if (r.type === 'in')  { dayMap[r.date].manual_in  += parseFloat(r.amount); dayMap[r.date].manual_in_tx  += parseInt(r.tx_count); }
      if (r.type === 'out') { dayMap[r.date].manual_out += parseFloat(r.amount); dayMap[r.date].manual_out_tx += parseInt(r.tx_count); }
    });

    const daily = Object.values(dayMap)
      .map(d => ({
        ...d,
        total_in:  d.sales_in  + d.manual_in,
        total_out: d.refunds_out + d.manual_out,
        net:       (d.sales_in + d.manual_in) - (d.refunds_out + d.manual_out),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // 5. Totals summary
    const totals = daily.reduce((acc, d) => ({
      total_in:     acc.total_in  + d.total_in,
      total_out:    acc.total_out + d.total_out,
      sales_in:     acc.sales_in  + d.sales_in,
      refunds_out:  acc.refunds_out  + d.refunds_out,
      manual_in:    acc.manual_in + d.manual_in,
      manual_out:   acc.manual_out + d.manual_out,
    }), { total_in: 0, total_out: 0, sales_in: 0, refunds_out: 0, manual_in: 0, manual_out: 0 });

    totals.net = totals.total_in - totals.total_out;

    // 6. Cash drawer sessions in range
    const sessions = await pool.query(`
      SELECT s.id, s.opening_cash, s.closing_cash, s.expected_cash,
             s.cash_difference, s.status, s.opened_at, s.closed_at,
             u.email as user_email
      FROM cash_drawer_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE DATE(s.opened_at) BETWEEN $1 AND $2
      ORDER BY s.opened_at DESC`, [startDate, endDate]);

    res.json({ start_date: startDate, end_date: endDate, summary: totals, daily, sessions: sessions.rows });
  } catch (err) {
    console.error("Error in cashflow report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

