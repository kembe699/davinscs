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
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(discount_amount), 0) as total_discounts,
        COALESCE(AVG(total_amount), 0) as average_sale
       FROM pos_sales
       WHERE DATE(created_at) BETWEEN $1 AND $2 AND voided = false
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
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.total_amount), 0) as total_revenue,
        COALESCE(SUM(s.tax_amount), 0) as total_tax,
        COALESCE(AVG(s.total_amount), 0) as average_sale
       FROM users u
       LEFT JOIN pos_sales s ON u.id = s.user_id AND s.voided = false
         AND DATE(s.created_at) BETWEEN $1 AND $2
       GROUP BY u.id, u.email
       HAVING COUNT(s.id) > 0
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
        COUNT(*) as total_purchases,
        COALESCE(SUM(total_amount), 0) as total_spent,
        COALESCE(AVG(total_amount), 0) as average_purchase,
        MAX(created_at) as last_purchase
       FROM pos_sales
       WHERE DATE(created_at) BETWEEN $1 AND $2 AND voided = false
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
        COUNT(DISTINCT si.sale_id) as times_sold,
        COALESCE(AVG(si.unit_price), 0) as average_price
       FROM pos_sale_items si
       JOIN pos_sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) BETWEEN $1 AND $2 AND s.voided = false
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
router.get("/sales/comparison", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    // POS sales
    const posSales = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_order_value
       FROM pos_sales
       WHERE DATE(created_at) BETWEEN $1 AND $2 AND voided = false`,
      [startDate, endDate]
    );

    // Website orders
    const webOrders = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as average_order_value
       FROM customer_orders
       WHERE DATE(created_at) BETWEEN $1 AND $2 AND status != 'cancelled'`,
      [startDate, endDate]
    );

    res.json({
      pos: posSales.rows[0],
      website: webOrders.rows[0],
      total_revenue: parseInt(posSales.rows[0].total_revenue) + parseInt(webOrders.rows[0].total_revenue),
      total_orders: parseInt(posSales.rows[0].total_orders) + parseInt(webOrders.rows[0].total_orders)
    });
  } catch (err) {
    console.error("Error in comparison report:", err);
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

    // Try to get accounting expenses
    try {
      const accountingExpenses = await pool.query(
        `SELECT COALESCE(SUM(ABS(amount)), 0) as total
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         WHERE a.type = 'expense' 
           AND DATE(t.transaction_date) BETWEEN $1 AND $2`,
        [startDate, endDate]
      );
      accountingTotal = parseInt(accountingExpenses.rows[0].total);
    } catch (err) {
      console.log("Accounting expenses table not available");
    }

    // Try to get cash drawer expenses
    try {
      const cashDrawerExpenses = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM cash_drawer_transactions
         WHERE type = 'cash_out'
           AND DATE(created_at) BETWEEN $1 AND $2`,
        [startDate, endDate]
      );
      cashDrawerTotal = parseInt(cashDrawerExpenses.rows[0].total);
    } catch (err) {
      console.log("Cash drawer transactions table not available");
    }

    res.json({
      accounting_expenses: accountingTotal,
      cash_drawer_expenses: cashDrawerTotal,
      total_expenses: accountingTotal + cashDrawerTotal
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

    try {
      const { rows } = await pool.query(
        `SELECT 
          a.code,
          a.name as category_name,
          COUNT(t.id) as transaction_count,
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
      res.json(rows);
    } catch (err) {
      console.log("Accounts/transactions tables not available");
      res.json([]);
    }
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
          cdt.id,
          cdt.amount,
          cdt.reason,
          cdt.created_at,
          u.email as user_email,
          cds.id as session_id
         FROM cash_drawer_transactions cdt
         LEFT JOIN users u ON cdt.user_id = u.id
         LEFT JOIN cash_drawer_sessions cds ON cdt.session_id = cds.id
         WHERE cdt.type = 'cash_out'
           AND DATE(cdt.created_at) BETWEEN $1 AND $2
         ORDER BY cdt.created_at DESC`,
        [startDate, endDate]
      );
      res.json(rows);
    } catch (err) {
      console.log("Cash drawer transactions table not available");
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
          EXTRACT(DAY FROM (expiry_date - CURRENT_DATE)) as days_until_expiry
         FROM products
         WHERE expiry_date IS NOT NULL
           AND expiry_date > CURRENT_DATE
           AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
           AND quantity_on_hand > 0
         ORDER BY expiry_date ASC`
      );
      res.json(rows);
    } catch (err) {
      console.log("Expiry date column not available in products table");
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
          EXTRACT(DAY FROM (CURRENT_DATE - expiry_date)) as days_expired
         FROM products
         WHERE expiry_date IS NOT NULL
           AND expiry_date < CURRENT_DATE
           AND quantity_on_hand > 0
         ORDER BY expiry_date ASC`
      );
      res.json(rows);
    } catch (err) {
      console.log("Expiry date column not available in products table");
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
       ORDER BY updated_at DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error in out of stock report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============ TRENDING/ANALYTICS REPORTS ============

// Most trending products (POS + Website combined)
router.get("/trending/products", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date, limit } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];
    const maxLimit = limit || 20;

    // POS sales
    let posSales = { rows: [] };
    try {
      posSales = await pool.query(
        `SELECT 
          product_id,
          product_name,
          SUM(quantity) as quantity_sold,
          COALESCE(SUM(subtotal), 0) as revenue,
          'POS' as source
         FROM pos_sale_items si
         JOIN pos_sales s ON si.sale_id = s.id
         WHERE DATE(s.created_at) BETWEEN $1 AND $2 AND s.voided = false
         GROUP BY product_id, product_name`,
        [startDate, endDate]
      );
    } catch (err) {
      console.log("POS sale items table not available");
    }

    // Website orders
    let webOrders = { rows: [] };
    try {
      webOrders = await pool.query(
        `SELECT 
          oi.product_id,
          p.name as product_name,
          SUM(oi.quantity) as quantity_sold,
          COALESCE(SUM(oi.price * oi.quantity), 0) as revenue,
          'Website' as source
         FROM order_items oi
         JOIN customer_orders co ON oi.order_id = co.id
         JOIN products p ON oi.product_id = p.id
         WHERE DATE(co.created_at) BETWEEN $1 AND $2 AND co.status != 'cancelled'
         GROUP BY oi.product_id, p.name`,
        [startDate, endDate]
      );
    } catch (err) {
      console.log("Order items table not available");
    }

    // Combine and aggregate
    const combined = {};
    
    [...posSales.rows, ...webOrders.rows].forEach(item => {
      const key = item.product_id;
      if (!combined[key]) {
        combined[key] = {
          product_id: item.product_id,
          product_name: item.product_name,
          total_quantity: 0,
          total_revenue: 0,
          pos_quantity: 0,
          pos_revenue: 0,
          web_quantity: 0,
          web_revenue: 0
        };
      }
      
      combined[key].total_quantity += parseInt(item.quantity_sold);
      combined[key].total_revenue += parseInt(item.revenue);
      
      if (item.source === 'POS') {
        combined[key].pos_quantity = parseInt(item.quantity_sold);
        combined[key].pos_revenue = parseInt(item.revenue);
      } else {
        combined[key].web_quantity = parseInt(item.quantity_sold);
        combined[key].web_revenue = parseInt(item.revenue);
      }
    });

    const result = Object.values(combined)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, maxLimit);

    res.json(result);
  } catch (err) {
    console.error("Error in trending products report:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POS vs Website detailed comparison
router.get("/trending/pos-vs-web", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    // Daily breakdown
    const dailyPOS = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as revenue
       FROM pos_sales
       WHERE DATE(created_at) BETWEEN $1 AND $2 AND voided = false
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [startDate, endDate]
    );

    const dailyWeb = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(total), 0) as revenue
       FROM customer_orders
       WHERE DATE(created_at) BETWEEN $1 AND $2 AND status != 'cancelled'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [startDate, endDate]
    );

    // Combine daily data
    const dailyData = {};
    
    dailyPOS.rows.forEach(row => {
      const dateKey = row.date.toISOString().split('T')[0];
      dailyData[dateKey] = {
        date: dateKey,
        pos_orders: parseInt(row.orders),
        pos_revenue: parseInt(row.revenue),
        web_orders: 0,
        web_revenue: 0
      };
    });

    dailyWeb.rows.forEach(row => {
      const dateKey = row.date.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          pos_orders: 0,
          pos_revenue: 0,
          web_orders: parseInt(row.orders),
          web_revenue: parseInt(row.revenue)
        };
      } else {
        dailyData[dateKey].web_orders = parseInt(row.orders);
        dailyData[dateKey].web_revenue = parseInt(row.revenue);
      }
    });

    const result = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json(result);
  } catch (err) {
    console.error("Error in POS vs Web comparison:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
