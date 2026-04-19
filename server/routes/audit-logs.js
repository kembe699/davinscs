import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET /api/audit-logs  — filterable by user, action, entity_type, date range
router.get("/", requireAuth, async (req, res) => {
  const { user_id, user_email, action, entity_type, start_date, end_date, page = 1, limit = 100 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let where = ["1=1"];
    const params = [];
    let p = 1;

    if (user_id) { where.push(`a.user_id = $${p++}`); params.push(user_id); }
    if (user_email) { where.push(`a.user_email ILIKE $${p++}`); params.push(`%${user_email}%`); }
    if (action) { where.push(`a.action = $${p++}`); params.push(action); }
    if (entity_type) { where.push(`a.entity_type = $${p++}`); params.push(entity_type); }
    if (start_date) { where.push(`a.created_at >= $${p++}`); params.push(start_date); }
    if (end_date) { where.push(`a.created_at < ($${p++}::date + interval '1 day')`); params.push(end_date); }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM audit_logs a WHERE ${where.join(" AND ")}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    const { rows } = await pool.query(
      `SELECT a.id, a.user_id, a.user_email, a.action, a.entity_type, a.entity_id,
              a.details, a.ip_address, a.created_at,
              u.email as resolved_email
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE ${where.join(" AND ")}
       ORDER BY a.created_at DESC
       LIMIT $${p++} OFFSET $${p++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ total, page: parseInt(page), limit: parseInt(limit), rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/audit-logs/actions  — list of distinct action types for filter dropdown
router.get("/actions", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT DISTINCT action FROM audit_logs ORDER BY action"
    );
    res.json(rows.map(r => r.action));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/audit-logs/users  — list of distinct users who have audit entries
router.get("/users", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT DISTINCT user_email FROM audit_logs WHERE user_email IS NOT NULL ORDER BY user_email"
    );
    res.json(rows.map(r => r.user_email));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
