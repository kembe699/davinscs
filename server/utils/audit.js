import pool from "../db.js";

/**
 * Log a user action to the audit_logs table.
 * @param {object} opts
 * @param {number|null} opts.userId
 * @param {string} opts.userEmail
 * @param {string} opts.action        - e.g. 'LOGIN', 'SALE_CREATED'
 * @param {string} opts.entityType    - e.g. 'sale', 'product', 'user'
 * @param {number|null} opts.entityId
 * @param {object|null} opts.details  - any extra JSON data
 * @param {string|null} opts.ip
 */
export async function logAudit({ userId = null, userEmail = '', action, entityType = null, entityId = null, details = null, ip = null }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, userEmail, action, entityType, entityId, details ? JSON.stringify(details) : null, ip]
    );
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}
