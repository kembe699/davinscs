import express from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.role, u.role_id, u.created_at, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       ORDER BY u.created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { role_id } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash, role, role_id) VALUES ($1, $2, 'admin', $3) RETURNING id, email, role, role_id, created_at",
      [email.toLowerCase(), hash, role_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    let query, params;
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
      const hash = await bcrypt.hash(password, 10);
      query = "UPDATE users SET email = $1, password_hash = $2 WHERE id = $3 RETURNING id, email, role, created_at";
      params = [email.toLowerCase(), hash, id];
    } else {
      query = "UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email, role, created_at";
      params = [email.toLowerCase(), id];
    }
    const { rows } = await pool.query(query, params);
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Assign role to user
router.put("/:id/role", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { role_id } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET role_id = $1 WHERE id = $2
       RETURNING id, email, role, role_id, created_at`,
      [role_id || null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: "Cannot delete your own account" });
  try {
    const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "User not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
