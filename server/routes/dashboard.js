import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET monthly sales data for current year
router.get("/monthly-sales", requireAuth, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    
    const { rows } = await pool.query(
      `SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        EXTRACT(MONTH FROM created_at) as month_num,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as sales
       FROM pos_sales
       WHERE EXTRACT(YEAR FROM created_at) = $1 AND voided = false AND status != 'held'
       GROUP BY month, month_num
       ORDER BY month_num`,
      [year]
    );
    
    // Fill in missing months with zero sales
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((month, index) => {
      const found = rows.find(r => parseInt(r.month_num) === index + 1);
      return {
        month,
        sales: found ? parseInt(found.sales) : 0,
        count: found ? parseInt(found.count) : 0
      };
    });
    
    res.json(monthlyData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET top products by sales amount
router.get("/top-products", requireAuth, async (req, res) => {
  try {
    const limit = req.query.limit || 5;
    
    const { rows } = await pool.query(
      `SELECT 
        p.name,
        p.category,
        COUNT(psi.id) as quantity,
        COALESCE(SUM(psi.subtotal), 0) as total
       FROM pos_sale_items psi
       JOIN products p ON psi.product_id = p.id
       JOIN pos_sales s ON psi.sale_id = s.id
       WHERE s.voided = false AND s.status != 'held'
       GROUP BY p.id, p.name, p.category
       ORDER BY total DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json(rows.map(r => ({
      name: r.name,
      category: r.category,
      quantity: parseInt(r.quantity),
      total: parseInt(r.total)
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET sales summary
router.get("/sales-summary", requireAuth, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    
    // Get total sales for the year
    const { rows: totalRows } = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_sales, COUNT(*) as total_count
       FROM pos_sales
       WHERE EXTRACT(YEAR FROM created_at) = $1 AND voided = false AND status != 'held'`,
      [year]
    );
    
    // Get top performing month
    const { rows: monthRows } = await pool.query(
      `SELECT 
        TO_CHAR(created_at, 'Month') as month,
        COALESCE(SUM(total_amount), 0) as amount
       FROM pos_sales
       WHERE EXTRACT(YEAR FROM created_at) = $1 AND voided = false AND status != 'held'
       GROUP BY TO_CHAR(created_at, 'Month'), EXTRACT(MONTH FROM created_at)
       ORDER BY amount DESC
       LIMIT 1`,
      [year]
    );
    
    res.json({
      totalSales: parseInt(totalRows[0].total_sales),
      totalCount: parseInt(totalRows[0].total_count),
      topMonth: monthRows[0]?.month?.trim() || '---',
      topMonthAmount: monthRows[0] ? parseInt(monthRows[0].amount) : 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET hourly sales for today
router.get("/hourly-sales", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as amount
       FROM pos_sales
       WHERE DATE(created_at) = CURRENT_DATE AND voided = false AND status != 'held'
       GROUP BY hour
       ORDER BY hour`
    );
    
    // Fill in missing hours with zero sales
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const found = rows.find(r => parseInt(r.hour) === hour);
      return {
        hour: `${hour}:00`,
        amount: found ? parseInt(found.amount) : 0,
        count: found ? parseInt(found.count) : 0
      };
    });
    
    res.json(hourlyData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
