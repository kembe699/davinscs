import express from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../utils/audit.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.pin, u.role, u.role_id, u.is_active, u.created_at, r.name AS role_name
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
  const { email, password, name, pin, role_id } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  try {
    const hash = await bcrypt.hash(password, 10);
    // The legacy `role` text column ('admin'/'cashier') still gates a few things
    // directly (void/delete sale, seeing all sales vs just your own — see pos.js)
    // and whether the FlippedPOS admin mobile app lets this account sign in at
    // all, so it has to actually reflect the chosen role rather than being
    // hardcoded — only an Admin-named role should grant it.
    let role = 'cashier';
    if (role_id) {
      const { rows: roleRows } = await pool.query("SELECT name FROM roles WHERE id = $1", [role_id]);
      if (roleRows[0]?.name?.toLowerCase() === 'admin') role = 'admin';
    }
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash, role, role_id, name, pin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, pin, role, role_id, created_at",
      [email.toLowerCase(), hash, role, role_id || null, name || null, pin || null]
    );
    // Sync login mapping so the new user can log in via /portal
    const schemaName = req.user.schema_name || null;
    if (schemaName) {
      const tenantRes = await pool.query(
        "SELECT id FROM public.tenants WHERE schema_name = $1",
        [schemaName]
      );
      const tenantId = tenantRes.rows[0]?.id;
      if (tenantId) {
        await pool.query(
          `INSERT INTO public.tenant_users (email, tenant_id, schema_name)
           VALUES ($1, $2, $3)
           ON CONFLICT (email) DO UPDATE
             SET schema_name = EXCLUDED.schema_name,
                 tenant_id   = EXCLUDED.tenant_id`,
          [email.toLowerCase(), tenantId, schemaName]
        );
      }
    }
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'USER_CREATED', entityType: 'user', entityId: rows[0].id, details: { email: rows[0].email }, ip: req.ip });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { email, password, name, pin } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    // Capture old email before update to sync tenant_users if it changes
    const { rows: existing } = await pool.query("SELECT email FROM users WHERE id = $1", [id]);
    const oldEmail = existing[0]?.email;
    let query, params;
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
      const hash = await bcrypt.hash(password, 10);
      query = "UPDATE users SET email = $1, password_hash = $2, name = $3, pin = $4 WHERE id = $5 RETURNING id, email, name, pin, role, created_at";
      params = [email.toLowerCase(), hash, name || null, pin || null, id];
    } else {
      query = "UPDATE users SET email = $1, name = $2, pin = $3 WHERE id = $4 RETURNING id, email, name, pin, role, created_at";
      params = [email.toLowerCase(), name || null, pin || null, id];
    }
    const { rows } = await pool.query(query, params);
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    // Keep login mapping in sync when email changes
    if (oldEmail && oldEmail !== email.toLowerCase()) {
      await pool.query(
        "UPDATE public.tenant_users SET email = $1 WHERE email = $2",
        [email.toLowerCase(), oldEmail]
      );
    }
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'USER_UPDATED', entityType: 'user', entityId: id, details: { email, password_changed: !!password }, ip: req.ip });
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
    let role = 'cashier';
    if (role_id) {
      const { rows: roleRows } = await pool.query("SELECT name FROM roles WHERE id = $1", [role_id]);
      if (roleRows[0]?.name?.toLowerCase() === 'admin') role = 'admin';
    }
    const { rows } = await pool.query(
      `UPDATE users SET role_id = $1, role = $2 WHERE id = $3
       RETURNING id, email, role, role_id, created_at`,
      [role_id || null, role, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'USER_ROLE_CHANGED', entityType: 'user', entityId: id, details: { role_id: role_id || null }, ip: req.ip });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Suspend / reactivate a user — used by the admin mobile app's Staff screen.
// Suspending doesn't delete anything; it just blocks future logins (checked
// in POST /api/auth/login) and invalidates the session on their next request
// (checked in requireAuth).
router.put("/:id/status", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { is_active } = req.body;
  if (typeof is_active !== "boolean") return res.status(400).json({ error: "is_active must be true or false" });
  if (id === req.user.id && !is_active) return res.status(400).json({ error: "Cannot suspend your own account" });
  try {
    const { rows } = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2
       RETURNING id, email, name, role, role_id, is_active, created_at`,
      [is_active, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: is_active ? 'USER_REACTIVATED' : 'USER_SUSPENDED', entityType: 'user', entityId: id, details: null, ip: req.ip });
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
    // Capture email before deletion so we can clean up the login mapping
    const { rows: userRows } = await pool.query("SELECT email FROM users WHERE id = $1", [id]);
    const deletedEmail = userRows[0]?.email;
    const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "User not found" });
    if (deletedEmail) {
      await pool.query("DELETE FROM public.tenant_users WHERE email = $1", [deletedEmail]).catch(() => {});
    }
    await logAudit({ userId: req.user.id, userEmail: req.user.email, action: 'USER_DELETED', entityType: 'user', entityId: id, details: null, ip: req.ip });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
