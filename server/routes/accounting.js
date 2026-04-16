import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Chart of Accounts
router.get("/accounts", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, p.name as parent_name
      FROM accounts a
      LEFT JOIN accounts p ON a.parent_id = p.id
      WHERE a.is_active = true
      ORDER BY a.code
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/accounts", requireAuth, async (req, res) => {
  const { code, name, account_type, parent_id } = req.body;
  
  if (!code || !name || !account_type) {
    return res.status(400).json({ error: "Code, name, and type required" });
  }
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO accounts (code, name, account_type, parent_id) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [code, name, account_type, parent_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: "Account code already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Transactions
router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT 
        t.id, t.transaction_date, t.reference, t.description, t.created_at,
        u.email as created_by_email,
        SUM(tl.debit) as total_debit,
        SUM(tl.credit) as total_credit
      FROM transactions t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
    `;
    const params = [];
    const conditions = [];
    
    if (start_date) {
      params.push(start_date);
      conditions.push(`t.transaction_date >= $${params.length}`);
    }
    if (end_date) {
      params.push(end_date);
      conditions.push(`t.transaction_date <= $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` GROUP BY t.id, u.email ORDER BY t.transaction_date DESC, t.id DESC LIMIT 100`;
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/transactions/:id", requireAuth, async (req, res) => {
  try {
    const txResult = await pool.query(
      `SELECT t.*, u.email as created_by_email
       FROM transactions t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    
    if (!txResult.rows[0]) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    const linesResult = await pool.query(
      `SELECT tl.*, a.code as account_code, a.name as account_name
       FROM transaction_lines tl
       JOIN accounts a ON tl.account_id = a.id
       WHERE tl.transaction_id = $1`,
      [req.params.id]
    );
    
    res.json({
      ...txResult.rows[0],
      lines: linesResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/transactions", requireAuth, async (req, res) => {
  const { transaction_date, reference, description, lines } = req.body;
  
  if (!transaction_date || !lines || lines.length === 0) {
    return res.status(400).json({ error: "Date and lines required" });
  }
  
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  
  if (totalDebit !== totalCredit) {
    return res.status(400).json({ error: "Debits must equal credits" });
  }
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const txResult = await client.query(
      `INSERT INTO transactions (transaction_date, reference, description, created_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [transaction_date, reference, description, req.user.id]
    );
    
    const txId = txResult.rows[0].id;
    
    for (const line of lines) {
      await client.query(
        `INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) 
         VALUES ($1, $2, $3, $4)`,
        [txId, line.account_id, line.debit || 0, line.credit || 0]
      );
    }
    
    await client.query("COMMIT");
    res.status(201).json(txResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// Reports
router.get("/trial-balance", requireAuth, async (req, res) => {
  try {
    const { as_of_date } = req.query;
    let dateCondition = "";
    const params = [];
    
    if (as_of_date) {
      dateCondition = "WHERE t.transaction_date <= $1";
      params.push(as_of_date);
    }
    
    const { rows } = await pool.query(`
      SELECT 
        a.code, a.name, a.account_type,
        COALESCE(SUM(tl.debit), 0) as total_debit,
        COALESCE(SUM(tl.credit), 0) as total_credit,
        COALESCE(SUM(tl.debit), 0) - COALESCE(SUM(tl.credit), 0) as balance
      FROM accounts a
      LEFT JOIN transaction_lines tl ON a.id = tl.account_id
      LEFT JOIN transactions t ON tl.transaction_id = t.id
      ${dateCondition}
      WHERE a.is_active = true
      GROUP BY a.id, a.code, a.name, a.account_type
      HAVING COALESCE(SUM(tl.debit), 0) - COALESCE(SUM(tl.credit), 0) != 0
      ORDER BY a.code
    `, params);
    
    const totalDebit = rows.reduce((sum, row) => sum + parseFloat(row.total_debit), 0);
    const totalCredit = rows.reduce((sum, row) => sum + parseFloat(row.total_credit), 0);
    
    res.json({ accounts: rows, total_debit: totalDebit, total_credit: totalCredit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/income-statement", requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: "Start and end dates required" });
    }
    
    const { rows } = await pool.query(`
      SELECT 
        a.code, a.name, a.account_type,
        COALESCE(SUM(tl.credit), 0) - COALESCE(SUM(tl.debit), 0) as amount
      FROM accounts a
      LEFT JOIN transaction_lines tl ON a.id = tl.account_id
      LEFT JOIN transactions t ON tl.transaction_id = t.id
      WHERE a.account_type IN ('revenue', 'expense')
        AND t.transaction_date >= $1 
        AND t.transaction_date <= $2
        AND a.is_active = true
      GROUP BY a.id, a.code, a.name, a.account_type
      ORDER BY a.account_type, a.code
    `, [start_date, end_date]);
    
    const revenue = rows.filter(r => r.account_type === 'revenue');
    const expenses = rows.filter(r => r.account_type === 'expense');
    
    const totalRevenue = revenue.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalExpenses = expenses.reduce((sum, r) => sum + Math.abs(parseFloat(r.amount)), 0);
    const netIncome = totalRevenue - totalExpenses;
    
    res.json({
      revenue,
      expenses,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: netIncome
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/balance-sheet", requireAuth, async (req, res) => {
  try {
    const { as_of_date } = req.query;
    
    if (!as_of_date) {
      return res.status(400).json({ error: "As of date required" });
    }
    
    const { rows } = await pool.query(`
      SELECT 
        a.code, a.name, a.account_type,
        COALESCE(SUM(tl.debit), 0) - COALESCE(SUM(tl.credit), 0) as balance
      FROM accounts a
      LEFT JOIN transaction_lines tl ON a.id = tl.account_id
      LEFT JOIN transactions t ON tl.transaction_id = t.id
      WHERE a.account_type IN ('asset', 'liability', 'equity')
        AND t.transaction_date <= $1
        AND a.is_active = true
      GROUP BY a.id, a.code, a.name, a.account_type
      HAVING COALESCE(SUM(tl.debit), 0) - COALESCE(SUM(tl.credit), 0) != 0
      ORDER BY a.account_type, a.code
    `, [as_of_date]);
    
    const assets = rows.filter(r => r.account_type === 'asset');
    const liabilities = rows.filter(r => r.account_type === 'liability');
    const equity = rows.filter(r => r.account_type === 'equity');
    
    const totalAssets = assets.reduce((sum, r) => sum + parseFloat(r.balance), 0);
    const totalLiabilities = liabilities.reduce((sum, r) => sum + Math.abs(parseFloat(r.balance)), 0);
    const totalEquity = equity.reduce((sum, r) => sum + Math.abs(parseFloat(r.balance)), 0);
    
    res.json({
      assets,
      liabilities,
      equity,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
