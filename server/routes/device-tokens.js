import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Register (or refresh) this device's FCM token — called right after login
// and whenever Firebase rotates the token. One user can have several tokens
// (phone + tablet), so this is an upsert keyed on the token itself: if the
// same token shows up under a different user (reinstall, different login on
// the same device), it's reassigned rather than duplicated.
router.post("/", requireAuth, async (req, res) => {
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ error: "token is required" });
  try {
    await pool.query(
      `INSERT INTO device_tokens (user_id, token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform`,
      [req.user.id, token, platform || 'android']
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Called on sign-out so a lost/logged-out device stops receiving pushes
// immediately rather than waiting for FCM to notice the token is stale.
router.delete("/", requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token is required" });
  try {
    await pool.query("DELETE FROM device_tokens WHERE token = $1 AND user_id = $2", [token, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
