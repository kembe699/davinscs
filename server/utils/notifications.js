import admin from 'firebase-admin';
import pool from '../db.js';

let firebaseApp = null;
let firebaseInitAttempted = false;

// Lazily initializes the Firebase Admin SDK from a service-account JSON blob
// in FIREBASE_SERVICE_ACCOUNT. If it isn't configured, notifications still get
// written to the `notifications` table (so the in-app feed keeps working) —
// only the push itself is skipped.
function getFirebaseApp() {
  if (firebaseInitAttempted) return firebaseApp;
  firebaseInitAttempted = true;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled, in-app feed still works.');
    return null;
  }
  try {
    const credentials = JSON.parse(raw);
    firebaseApp = admin.initializeApp({ credential: admin.credential.cert(credentials) });
    return firebaseApp;
  } catch (err) {
    console.error('Firebase admin init failed:', err.message);
    return null;
  }
}

/**
 * Notifies every active admin in the current tenant schema (caller must
 * already be running inside that tenant's schema context — same rule as
 * every other query in this file). Always writes a durable row to
 * `notifications` first, then best-effort pushes via FCM to every
 * registered device token. Never throws — a notification failure should
 * never break the request that triggered it (e.g. closing a shift).
 */
export async function notifyAdmins({ type, title, body, data = {}, referenceType, referenceId }) {
  let notificationId = null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO notifications (type, title, body, data, reference_type, reference_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [type, title, body, JSON.stringify(data), referenceType || null, referenceId || null]
    );
    notificationId = rows[0].id;
  } catch (err) {
    console.error('notifyAdmins: failed to write notification row:', err.message);
    return;
  }

  try {
    const app = getFirebaseApp();
    if (!app) return;

    const { rows: tokenRows } = await pool.query(
      `SELECT dt.token FROM device_tokens dt
       JOIN users u ON u.id = dt.user_id
       WHERE u.role = 'admin' AND u.is_active != false`
    );
    const tokens = tokenRows.map(r => r.token);
    if (tokens.length === 0) return;

    const stringData = { type, notificationId: String(notificationId) };
    if (referenceType) stringData.referenceType = referenceType;
    if (referenceId != null) stringData.referenceId = String(referenceId);
    for (const [k, v] of Object.entries(data)) stringData[k] = String(v);

    const result = await app.messaging().sendEachForMulticast({
      notification: { title, body },
      data: stringData,
      tokens,
    });

    // Prune tokens FCM reports as dead (app uninstalled, token rotated, etc.)
    const deadTokens = [];
    result.responses.forEach((r, i) => { if (!r.success) deadTokens.push(tokens[i]); });
    if (deadTokens.length) {
      await pool.query(`DELETE FROM device_tokens WHERE token = ANY($1)`, [deadTokens]);
    }
  } catch (err) {
    console.error('notifyAdmins: push send failed:', err.message);
  }
}
