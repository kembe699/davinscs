import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import pool from "../db.js";
import { logAudit } from "../utils/audit.js";
import { sendPasswordResetEmail } from "../utils/email.js";


import { tenantStorage } from "../tenantStorage.js";
import { requireAuth, requireAuthAllowSuspended } from "../middleware/auth.js";
import { sendError } from "../utils/errorResponse.js";
const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password, schema_name: clientSchema, allow_suspended } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  try {
    // 1. Find user in tenant_users mapping
    const tuRes = await pool.query("SELECT * FROM public.tenant_users WHERE email = $1", [email.toLowerCase()]);
    const tenantUser = tuRes.rows[0];

    // Use the schema the frontend told us (e.g. logging into specific tenant),
    // otherwise fall back to the one in tenant_users mapping.
    let schemaName = clientSchema || tenantUser?.schema_name || 'public';
    let tenantId   = tenantUser?.tenant_id   || null;

    // 2. Enforce SaaS Trial Status (only when we have a real tenant mapping)
    if (tenantUser) {
      const tenantRes = await pool.query("SELECT * FROM public.tenants WHERE id = $1", [tenantUser.tenant_id]);
      const tenant = tenantRes.rows[0];

      if (tenant && !allow_suspended) {
        if (tenant.status === 'suspended') {
          return res.status(403).json({ error: "ACCOUNT_SUSPENDED", message: "Account has been suspended." });
        }
        if (tenant.status === 'trial') {
          const trialEnds = new Date(tenant.trial_ends_at);
          if (trialEnds < new Date()) {
            return res.status(403).json({ error: "TRIAL_EXPIRED", message: "Your 7-day trial has expired." });
          }
        }
      }
    }

    // 3. Authenticate against the tenant's schema
    await tenantStorage.run(schemaName, async () => {
      const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
      const user = rows[0];
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        await logAudit({ userId: user.id, userEmail: user.email, action: 'LOGIN_FAILED', entityType: 'user', entityId: user.id, details: { reason: 'Wrong password' }, ip: req.ip });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.is_active === false) {
        await logAudit({ userId: user.id, userEmail: user.email, action: 'LOGIN_FAILED', entityType: 'user', entityId: user.id, details: { reason: 'Account suspended' }, ip: req.ip });
        return res.status(403).json({ error: "ACCOUNT_SUSPENDED", message: "Your account has been suspended. Contact your admin." });
      }

      // 4. Auto-heal: if this user wasn't in public.tenant_users, insert them now
      if (!tenantUser && schemaName !== 'public') {
        try {
          if (!tenantId) {
            const tRes = await pool.query("SELECT id FROM public.tenants WHERE schema_name = $1", [schemaName]);
            tenantId = tRes.rows[0]?.id || null;
          }
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
        } catch (syncErr) {
          console.error("[login] tenant_users auto-heal failed:", syncErr.message);
        }
      }

      // Load permissions for this user's role
      let permissions = [];
      let roleName = null;
      if (user.role_id) {
        const { rows: permRows } = await pool.query(
          `SELECT p.key FROM permissions p
           JOIN role_permissions rp ON rp.permission_id = p.id
           WHERE rp.role_id = $1`,
          [user.role_id]
        );
        permissions = permRows.map(r => r.key);
        const { rows: roleRow } = await pool.query("SELECT name FROM roles WHERE id = $1", [user.role_id]);
        roleName = roleRow[0]?.name || null;
      } else if (user.role === "admin") {
        const { rows: allPerms } = await pool.query("SELECT key FROM permissions");
        permissions = allPerms.map(r => r.key);
        roleName = "Admin";
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role, role_id: user.role_id, permissions, schema_name: schemaName },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      await logAudit({ userId: user.id, userEmail: user.email, action: 'LOGIN', entityType: 'user', entityId: user.id, details: { role: roleName }, ip: req.ip });
      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, role_id: user.role_id, role_name: roleName, permissions, schema_name: schemaName }
      });
    });
  } catch (err) {
    return sendError(res, err);
  }
});

router.post("/pin-login", async (req, res) => {
  const { pin, schema_name, allow_suspended } = req.body;
  if (!pin || !schema_name) {
    return res.status(400).json({ error: "PIN and schema are required" });
  }
  try {
    const tenantRes = await pool.query("SELECT * FROM public.tenants WHERE schema_name = $1", [schema_name]);
    const tenant = tenantRes.rows[0];
    if (tenant && !allow_suspended) {
      if (tenant.status === 'suspended') return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
      if (tenant.status === 'trial' && new Date(tenant.trial_ends_at) < new Date()) {
        return res.status(403).json({ error: "TRIAL_EXPIRED" });
      }
    } else if (!tenant && schema_name !== 'public') {
      return res.status(404).json({ error: "Tenant not found" });
    }

    await tenantStorage.run(schema_name, async () => {
      const { rows } = await pool.query("SELECT * FROM users WHERE pin = $1", [pin]);
      const user = rows[0];
      if (!user) return res.status(401).json({ error: "Invalid PIN" });
      if (user.is_active === false) return res.status(403).json({ error: "ACCOUNT_SUSPENDED", message: "This account has been suspended." });

      let permissions = [];
      let roleName = null;
      if (user.role_id) {
        const { rows: permRows } = await pool.query(
          `SELECT p.key FROM permissions p
           JOIN role_permissions rp ON rp.permission_id = p.id
           WHERE rp.role_id = $1`,
          [user.role_id]
        );
        permissions = permRows.map(r => r.key);
        const { rows: roleRow } = await pool.query("SELECT name FROM roles WHERE id = $1", [user.role_id]);
        roleName = roleRow[0]?.name || null;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role, role_id: user.role_id, permissions, schema_name },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      await logAudit({ userId: user.id, userEmail: user.email, action: 'LOGIN_PIN', entityType: 'user', entityId: user.id, details: { role: roleName }, ip: req.ip });
      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, role_id: user.role_id, role_name: roleName, permissions, schema_name }
      });
    });
  } catch (err) {
    return sendError(res, err);
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    // Resolve tenant schema from the global email → schema mapping
    const tuRes = await pool.query(
      "SELECT schema_name FROM public.tenant_users WHERE email = $1",
      [email.toLowerCase()]
    );
    const schemaName = tuRes.rows[0]?.schema_name || 'public';

    let tokenGenerated = null;
    await tenantStorage.run(schemaName, async () => {
      const { rows } = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
      if (!rows[0]) return; // silently do nothing — don't reveal whether email exists
      tokenGenerated = uuidv4();
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await pool.query("DELETE FROM password_resets WHERE email = $1", [email.toLowerCase()]);
      await pool.query(
        "INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3)",
        [email.toLowerCase(), tokenGenerated, expires]
      );
    });

    if (tokenGenerated) {
      const tenantRes = await pool.query(
        "SELECT tenant_slug FROM public.tenants WHERE schema_name = $1",
        [schemaName]
      );
      const tenantSlug = tenantRes.rows[0]?.tenant_slug;
      const cmsUrl = process.env.CMS_URL || process.env.APP_BASE_URL || "https://app.flippedpos.com";
      const resetLink = tenantSlug
        ? `${cmsUrl}/${tenantSlug}/admin/reset-password?token=${tokenGenerated}`
        : `${cmsUrl}/admin/reset-password?token=${tokenGenerated}`;
      sendPasswordResetEmail(email, resetLink).catch(err => console.error('[forgot-password] email send error:', err));
    }
    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("[forgot-password] error:", err.message);
    return sendError(res, err, "Failed to send reset email");
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, password, schema } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token and password required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const schemaName = schema || 'public';
  try {
    let updated = false;
    await tenantStorage.run(schemaName, async () => {
      const { rows } = await pool.query(
        "SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW()",
        [token]
      );
      if (!rows[0]) return;
      const hash = await bcrypt.hash(password, 10);
      await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hash, rows[0].email]);
      await pool.query("DELETE FROM password_resets WHERE token = $1", [token]);
      updated = true;
    });
    if (!updated) return res.status(400).json({ error: "Invalid or expired reset token" });
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    return sendError(res, err);
  }
});

router.get("/me", requireAuthAllowSuspended, async (req, res) => {
  try {
    const schemaName = req.user.schema_name || 'public';
    let tenantInfo = null;
    
    if (schemaName !== 'public') {
      const { rows } = await pool.query(
        "SELECT status, trial_ends_at, subscription_end, tenant_slug FROM public.tenants WHERE schema_name = $1",
        [schemaName]
      );
      tenantInfo = rows[0] || null;
    }
    
    let dbUser = req.user;
    try {
      await tenantStorage.run(schemaName, async () => {
        const { rows } = await pool.query("SELECT id, name, email, role, role_id FROM users WHERE id = $1", [req.user.id]);
        if (rows[0]) {
          dbUser = { ...req.user, ...rows[0] };
        }
      });
    } catch(e) {
      console.error("Error fetching user details", e);
    }
    
    res.json({ user: dbUser, tenant: tenantInfo });
  } catch (err) {
    console.error("[GET /auth/me] Error:", err);
    return sendError(res, err);
  }
});

export default router;
