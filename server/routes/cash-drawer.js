import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../utils/audit.js";
import { notifyAdmins } from "../utils/notifications.js";

const router = express.Router();

// Get current session
router.get("/current", requireAuth, async (req, res) => {
  const user_id = req.user.id;
  
  try {
    const { rows } = await pool.query(
      `SELECT * FROM cash_drawer_sessions 
       WHERE user_id = $1 AND status = 'open' 
       ORDER BY opened_at DESC LIMIT 1`,
      [user_id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Read-only preview of expected cash for the current open session — same
// calculation POST /close uses, so a cashier can see what they should be
// counting to *before* they commit to a closing amount, not just after.
router.get("/expected", requireAuth, async (req, res) => {
  const user_id = req.user.id;
  try {
    const sessionResult = await pool.query(
      "SELECT * FROM cash_drawer_sessions WHERE user_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
      [user_id]
    );
    const session = sessionResult.rows[0];
    if (!session) return res.status(400).json({ error: "No open cash drawer session found" });

    // Every sale counts toward what's expected in the drawer, not just ones tagged
    // with a specific "cash" payment type — that classification turned out to be
    // unreliable across tenants (whatever a tenant actually calls their cash
    // payment type), and what a cashier needs here is simply: everything sold
    // today, plus/minus whatever cash was manually moved in or out.
    const salesResult = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_sales
       FROM pos_sales
       WHERE session_id = $1 AND voided = false AND status != 'held'`,
      [session.id]
    );
    const movementsResult = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END), 0) as net_movements
       FROM cash_movements WHERE session_id = $1 AND reason NOT LIKE 'POS Sale %'`,
      [session.id]
    );

    const expected_cash = session.opening_cash +
                         parseInt(salesResult.rows[0].total_sales) +
                         parseInt(movementsResult.rows[0].net_movements);

    res.json({ opening_cash: session.opening_cash, expected_cash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Open drawer
router.post("/open", requireAuth, async (req, res) => {
  const { opening_cash } = req.body;
  const user_id = req.user.id;
  
  if (opening_cash === undefined) {
    return res.status(400).json({ error: "Opening cash amount is required" });
  }
  
  try {
    // Check if user already has an open session
    const existing = await pool.query(
      "SELECT id FROM cash_drawer_sessions WHERE user_id = $1 AND status = 'open'",
      [user_id]
    );
    
    if (existing.rows[0]) {
      return res.status(400).json({ error: "You already have an open cash drawer session" });
    }
    
    const { rows } = await pool.query(
      `INSERT INTO cash_drawer_sessions (user_id, opening_cash, status) 
       VALUES ($1, $2, 'open') RETURNING *`,
      [user_id, opening_cash]
    );
    
    await logAudit({ userId: user_id, userEmail: req.user.email, action: 'CASH_SESSION_OPENED', entityType: 'cash_drawer', entityId: rows[0].id, details: { opening_cash }, ip: req.ip });

    notifyAdmins({
      type: 'shift_opened',
      title: `Shift opened — ${req.user.name || req.user.email}`,
      body: `Opening cash: ${Number(opening_cash).toLocaleString()}`,
      referenceType: 'cash_drawer_session',
      referenceId: rows[0].id,
    }).catch(() => {});

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Close drawer
router.post("/close", requireAuth, async (req, res) => {
  const { closing_cash, notes } = req.body;
  const user_id = req.user.id;
  
  if (closing_cash === undefined) {
    return res.status(400).json({ error: "Closing cash amount is required" });
  }
  
  const client = await getSchemaClient();
  
  try {
    await client.query("BEGIN");
    
    // Get current session
    const sessionResult = await client.query(
      "SELECT * FROM cash_drawer_sessions WHERE user_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
      [user_id]
    );
    
    if (!sessionResult.rows[0]) {
      throw new Error("No open cash drawer session found");
    }
    
    const session = sessionResult.rows[0];
    
    // Calculate expected cash — every sale counts, not just ones tagged with a
    // specific "cash" payment type (see GET /expected for why that was dropped).
    const salesResult = await client.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_sales
       FROM pos_sales
       WHERE session_id = $1 AND voided = false AND status != 'held'`,
      [session.id]
    );
    
    // Cash sales auto-record a matching 'in' cash_movements row (see
    // POST /api/pos/sales) so cash-in/cash-out history shows the full
    // picture — but that means those rows must NOT be added again here,
    // on top of salesResult above, or every cash sale's total gets counted
    // twice toward expected cash. Only genuine manual cash-in/cash-out
    // adjustments belong in this sum.
    const movementsResult = await client.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END), 0) as net_movements
       FROM cash_movements WHERE session_id = $1 AND reason NOT LIKE 'POS Sale %'`,
      [session.id]
    );
    
    const expected_cash = session.opening_cash + 
                         parseInt(salesResult.rows[0].total_sales) + 
                         parseInt(movementsResult.rows[0].net_movements);
    
    const cash_difference = closing_cash - expected_cash;
    
    // Close session
    await client.query(
      `UPDATE cash_drawer_sessions 
       SET closing_cash = $1, expected_cash = $2, cash_difference = $3, 
           closed_at = NOW(), status = 'closed', notes = $4
       WHERE id = $5`,
      [closing_cash, expected_cash, cash_difference, notes, session.id]
    );
    
    await client.query("COMMIT");
    
    const { rows } = await pool.query(
      "SELECT * FROM cash_drawer_sessions WHERE id = $1",
      [session.id]
    );
    
    await logAudit({ userId: user_id, userEmail: req.user.email, action: 'CASH_SESSION_CLOSED', entityType: 'cash_drawer', entityId: session.id, details: { closing_cash, expected_cash, cash_difference }, ip: req.ip });

    // Instant shift report on admins' phones — the full breakdown (payment
    // split, top products) is fetched on-demand by the app via
    // GET /api/pos-reports/end-of-day?session_id=… when the notification is
    // opened, so this stays a fast fire-and-forget push, not a second report run.
    const variance = cash_difference !== 0 ? ` · cash ${cash_difference > 0 ? '+' : ''}${cash_difference.toLocaleString()}` : '';
    notifyAdmins({
      type: 'shift_closed',
      title: `Shift closed — ${req.user.name || req.user.email}`,
      body: `Sales ${Number(salesResult.rows[0].total_sales).toLocaleString()}${variance}`,
      referenceType: 'cash_drawer_session',
      referenceId: session.id,
    }).catch(() => {});

    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  } finally {
    client.release();
  }
});

// Cash in
router.post("/cash-in", requireAuth, async (req, res) => {
  const { amount, reason } = req.body;
  const user_id = req.user.id;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Valid amount is required" });
  }
  
  try {
    // Get current session
    const sessionResult = await pool.query(
      "SELECT id FROM cash_drawer_sessions WHERE user_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
      [user_id]
    );
    
    if (!sessionResult.rows[0]) {
      return res.status(400).json({ error: "No open cash drawer session found" });
    }
    
    const { rows } = await pool.query(
      `INSERT INTO cash_movements (session_id, user_id, type, amount, reason) 
       VALUES ($1, $2, 'in', $3, $4) RETURNING *`,
      [sessionResult.rows[0].id, user_id, amount, reason]
    );
    
    await logAudit({ userId: user_id, userEmail: req.user.email, action: 'CASH_IN', entityType: 'cash_movement', entityId: rows[0].id, details: { amount, reason }, ip: req.ip });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Cash out
router.post("/cash-out", requireAuth, async (req, res) => {
  const { amount, reason } = req.body;
  const user_id = req.user.id;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Valid amount is required" });
  }
  
  try {
    // Get current session
    const sessionResult = await pool.query(
      "SELECT id FROM cash_drawer_sessions WHERE user_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
      [user_id]
    );
    
    if (!sessionResult.rows[0]) {
      return res.status(400).json({ error: "No open cash drawer session found" });
    }
    
    const { rows } = await pool.query(
      `INSERT INTO cash_movements (session_id, user_id, type, amount, reason) 
       VALUES ($1, $2, 'out', $3, $4) RETURNING *`,
      [sessionResult.rows[0].id, user_id, amount, reason]
    );
    
    await logAudit({ userId: user_id, userEmail: req.user.email, action: 'CASH_OUT', entityType: 'cash_movement', entityId: rows[0].id, details: { amount, reason }, ip: req.ip });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Record that a closed shift's cash difference has been made good — the
// cashier found the missing cash, or paid in the shortfall (or an admin
// decided to write it off with a note). Accumulates across calls in case
// it's settled in more than one go; cash_difference itself is left alone
// as the original recorded discrepancy.
router.post("/sessions/:id/resolve-difference", requireAuth, async (req, res) => {
  const { amount, notes } = req.body;
  const resolved = Number(amount);
  if (!resolved || resolved <= 0) return res.status(400).json({ error: "A positive amount is required" });

  try {
    const { rows: sessionRows } = await pool.query("SELECT * FROM cash_drawer_sessions WHERE id = $1", [req.params.id]);
    const session = sessionRows[0];
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.status !== "closed") return res.status(400).json({ error: "Only a closed shift can have its difference resolved" });

    const { rows } = await pool.query(
      `UPDATE cash_drawer_sessions
       SET difference_resolved_amount = COALESCE(difference_resolved_amount, 0) + $1,
           difference_resolved_notes = $2,
           difference_resolved_at = NOW()
       WHERE id = $3 RETURNING *`,
      [resolved, notes || null, req.params.id]
    );

    await logAudit({
      userId: req.user.id, userEmail: req.user.email, action: "SHIFT_DIFFERENCE_RESOLVED",
      entityType: "cash_drawer", entityId: Number(req.params.id),
      details: { amount: resolved, notes }, ip: req.ip,
    });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get session history
router.get("/sessions", requireAuth, async (req, res) => {
  const { start_date, end_date } = req.query;

  try {
    let query = `
      SELECT s.*, u.email as user_email
      FROM cash_drawer_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.user_id = $1
    `;
    // Always the requesting user's own sessions (never a client-supplied user_id —
    // this Session History feeds the same "close my shift" screens as end-of-day,
    // and every cashier was seeing every other cashier's shift history here too).
    const params = [req.user.id];
    let paramCount = 2;

    if (start_date) {
      query += ` AND s.opened_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND s.opened_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    query += " ORDER BY s.opened_at DESC";
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get movements for session
router.get("/sessions/:id/movements", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Movements belong to whoever's shift this was — same ownership check as
    // /sessions above, just per-session since this is reached by id directly.
    const owner = await pool.query("SELECT user_id FROM cash_drawer_sessions WHERE id = $1", [id]);
    if (!owner.rows[0] || owner.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Not your cash drawer session" });
    }

    const { rows } = await pool.query(
      `SELECT m.*, u.email as user_email
       FROM cash_movements m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.session_id = $1
       ORDER BY m.created_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
