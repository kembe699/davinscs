import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendError } from "../utils/errorResponse.js";

const router = express.Router();

// List all restaurant tables and hotel rooms (kind 'table' | 'room'; ?kind=
// narrows it). Occupancy isn't stored here — the caller cross-references
// against GET /api/pos/sales/held by table_id, since that's the single source
// of truth for "does this table/room have a running order".
router.get("/", requireAuth, async (req, res) => {
  try {
    const kind = req.query.kind === "room" || req.query.kind === "table" ? req.query.kind : null;
    const { rows } = await pool.query(
      `SELECT * FROM restaurant_tables ${kind ? "WHERE kind = $1" : ""} ORDER BY kind DESC, location ASC, label ASC`,
      kind ? [kind] : []
    );
    res.json(rows);
  } catch (err) {
    return sendError(res, err);
  }
});

// Bulk-create tables at a location, e.g. { location: "Ground Floor", count: 4 }
// creates Table 1..Table 4 (or continues the sequence if that location already
// has tables).
router.post("/", requireAuth, async (req, res) => {
  const { location, count } = req.body;
  const trimmedLocation = (location || "").trim();
  const countNum = parseInt(count, 10);

  if (!trimmedLocation) return res.status(400).json({ error: "Location is required" });
  if (!Number.isInteger(countNum) || countNum < 1 || countNum > 100) {
    return res.status(400).json({ error: "Number of tables must be between 1 and 100" });
  }

  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT label FROM restaurant_tables WHERE location = $1 AND kind = 'table'",
      [trimmedLocation]
    );
    let maxN = 0;
    for (const row of existing.rows) {
      const m = /(\d+)\s*$/.exec(row.label);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }

    const created = [];
    for (let i = 1; i <= countNum; i++) {
      const { rows } = await client.query(
        "INSERT INTO restaurant_tables (location, label, kind) VALUES ($1, $2, 'table') RETURNING *",
        [trimmedLocation, `Table ${maxN + i}`]
      );
      created.push(rows[0]);
    }

    await client.query("COMMIT");
    res.status(201).json(created);
  } catch (err) {
    await client.query("ROLLBACK");
    return sendError(res, err);
  } finally {
    client.release();
  }
});

// Amenities as a clean list of short labels ("Wi-Fi", "Air conditioning"…).
function cleanAmenities(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((a) => String(a).trim()).filter(Boolean).map((a) => a.slice(0, 60)))].slice(0, 40);
}

function roomFields(body) {
  const label = String(body.label || "").trim();
  const location = String(body.location || "").trim();
  if (!label) return { error: "Room name or number is required" };
  if (!location) return { error: "Floor or wing is required" };
  if (label.length > 100 || location.length > 100) return { error: "Name and floor must be 100 characters or less" };
  const description = String(body.description || "").trim().slice(0, 1000) || null;
  return { label, location, description, amenities: cleanAmenities(body.amenities) };
}

// A hotel room: e.g. { label: "Room 101", location: "First Floor",
// amenities: ["Wi-Fi", "Air conditioning"], description: "Double bed, sea view" }.
router.post("/rooms", requireAuth, async (req, res) => {
  const room = roomFields(req.body);
  if (room.error) return res.status(400).json({ error: room.error });
  try {
    const { rows } = await pool.query(
      `INSERT INTO restaurant_tables (location, label, kind, amenities, description)
       VALUES ($1, $2, 'room', $3::jsonb, $4) RETURNING *`,
      [room.location, room.label, JSON.stringify(room.amenities), room.description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    return sendError(res, err);
  }
});

router.put("/rooms/:id", requireAuth, async (req, res) => {
  const room = roomFields(req.body);
  if (room.error) return res.status(400).json({ error: room.error });
  try {
    const { rows } = await pool.query(
      `UPDATE restaurant_tables SET location = $1, label = $2, amenities = $3::jsonb, description = $4
       WHERE id = $5 AND kind = 'room' RETURNING *`,
      [room.location, room.label, JSON.stringify(room.amenities), room.description, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Room not found" });
    res.json(rows[0]);
  } catch (err) {
    return sendError(res, err);
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const occupied = await pool.query(
      "SELECT 1 FROM pos_sales WHERE table_id = $1 AND status = 'held' AND voided = false LIMIT 1",
      [req.params.id]
    );
    if (occupied.rows.length > 0) {
      return res.status(400).json({ error: "Cannot delete a table or room with an order in progress — clear it first." });
    }
    const { rows } = await pool.query(
      "DELETE FROM restaurant_tables WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Table not found" });
    res.json({ success: true });
  } catch (err) {
    return sendError(res, err);
  }
});

export default router;
