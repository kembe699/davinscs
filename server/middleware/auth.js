import jwt from "jsonwebtoken";
import pool from "../db.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Verify the user still exists (guards against stale tokens after DB resets)
    const { rows } = await pool.query("SELECT id FROM users WHERE id = $1", [payload.id]);
    if (!rows[0]) {
      return res.status(401).json({ error: "Session invalid — please log in again" });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
