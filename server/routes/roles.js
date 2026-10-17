import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendError } from "../utils/errorResponse.js";

const router = express.Router();

// ── Permissions ──────────────────────────────────────────────────────────────

router.get("/permissions", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM permissions ORDER BY group_name, key"
    );
    res.json(rows);
  } catch (err) {
    return sendError(res, err);
  }
});

// ── Roles ─────────────────────────────────────────────────────────────────────

// List all roles (with permission count)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, COUNT(rp.permission_id)::int AS permission_count
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      GROUP BY r.id
      ORDER BY r.id
    `);
    res.json(rows);
  } catch (err) {
    return sendError(res, err);
  }
});

// Get one role with its permissions
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { rows: role } = await pool.query("SELECT * FROM roles WHERE id = $1", [req.params.id]);
    if (!role[0]) return res.status(404).json({ error: "Not found" });
    const { rows: perms } = await pool.query(
      `SELECT p.* FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1 ORDER BY p.group_name, p.key`,
      [req.params.id]
    );
    res.json({ ...role[0], permissions: perms });
  } catch (err) {
    return sendError(res, err);
  }
});

// Create role
router.post("/", requireAuth, async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *",
      [name.trim(), description || null]
    );
    res.status(201).json({ ...rows[0], permission_count: 0 });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Role name already exists" });
    return sendError(res, err);
  }
});

// Update role metadata
router.put("/:id", requireAuth, async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name required" });
  try {
    const { rows } = await pool.query(
      "UPDATE roles SET name=$1, description=$2 WHERE id=$3 RETURNING *",
      [name.trim(), description || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Role name already exists" });
    return sendError(res, err);
  }
});

// Set permissions for a role (replace all)
router.put("/:id/permissions", requireAuth, async (req, res) => {
  const { permission_ids } = req.body;
  if (!Array.isArray(permission_ids)) return res.status(400).json({ error: "permission_ids array required" });
  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM role_permissions WHERE role_id = $1", [req.params.id]);
    for (const pid of permission_ids) {
      await client.query(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [req.params.id, pid]
      );
    }
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    return sendError(res, err);
  } finally {
    client.release();
  }
});

// Delete role
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM roles WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    return sendError(res, err);
  }
});

export default router;
