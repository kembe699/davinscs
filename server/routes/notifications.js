import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendError } from "../utils/errorResponse.js";

const router = express.Router();

// Paginated feed for the Notifications screen — durable history so nothing is
// lost if a push was missed (app closed, device offline, token stale).
router.get("/", requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const before = req.query.before ? parseInt(req.query.before, 10) : null;
  try {
    const params = [limit];
    let where = "";
    if (before) {
      where = "WHERE id < $2";
      params.push(before);
    }
    const { rows } = await pool.query(
      `SELECT * FROM notifications ${where} ORDER BY id DESC LIMIT $1`,
      params
    );
    res.json(rows);
  } catch (err) {
    return sendError(res, err);
  }
});

router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE notifications SET read_at = NOW() WHERE id = $1 AND read_at IS NULL RETURNING *",
      [req.params.id]
    );
    res.json(rows[0] || { success: true });
  } catch (err) {
    return sendError(res, err);
  }
});

router.put("/read-all", requireAuth, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET read_at = NOW() WHERE read_at IS NULL");
    res.json({ success: true });
  } catch (err) {
    return sendError(res, err);
  }
});

export default router;
