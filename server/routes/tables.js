import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendError } from "../utils/errorResponse.js";

const router = express.Router();

// List all restaurant tables. A table's occupancy isn't stored here — the
// caller cross-references against GET /api/pos/sales/held by table_id, since
// that's the single source of truth for "does this table have a running order".
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM restaurant_tables ORDER BY location ASC, label ASC"
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
      "SELECT label FROM restaurant_tables WHERE location = $1",
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
        "INSERT INTO restaurant_tables (location, label) VALUES ($1, $2) RETURNING *",
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

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const occupied = await pool.query(
      "SELECT 1 FROM pos_sales WHERE table_id = $1 AND status = 'held' AND voided = false LIMIT 1",
      [req.params.id]
    );
    if (occupied.rows.length > 0) {
      return res.status(400).json({ error: "Cannot delete an occupied table — clear it first." });
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
