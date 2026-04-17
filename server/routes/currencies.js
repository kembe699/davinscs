import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET all currencies
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM currencies ORDER BY is_base DESC, code ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET base currency
router.get("/base", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM currencies WHERE is_base = TRUE LIMIT 1"
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No base currency set" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST create currency (admin)
router.post("/", requireAuth, async (req, res) => {
  const { code, name, symbol, exchange_rate, is_active } = req.body;
  
  if (!code || !name || !symbol || !exchange_rate) {
    return res.status(400).json({ error: "code, name, symbol, and exchange_rate are required" });
  }

  if (exchange_rate <= 0) {
    return res.status(400).json({ error: "Exchange rate must be positive" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO currencies (code, name, symbol, exchange_rate, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code.toUpperCase(), name, symbol, exchange_rate, is_active ?? true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Currency code already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT update currency (admin)
router.put("/:id", requireAuth, async (req, res) => {
  const { name, symbol, exchange_rate, is_active } = req.body;

  if (exchange_rate && exchange_rate <= 0) {
    return res.status(400).json({ error: "Exchange rate must be positive" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE currencies SET
        name = COALESCE($1, name),
        symbol = COALESCE($2, symbol),
        exchange_rate = COALESCE($3, exchange_rate),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, symbol, exchange_rate, is_active, req.params.id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Currency not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT set as base currency (admin)
router.put("/:id/set-base", requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Unset current base currency
    await client.query("UPDATE currencies SET is_base = FALSE WHERE is_base = TRUE");
    
    // Set new base currency with exchange rate 1.0
    const { rows } = await client.query(
      `UPDATE currencies SET is_base = TRUE, exchange_rate = 1.0, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Currency not found" });
    }
    
    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// DELETE currency (admin)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    // Check if it's the base currency
    const { rows: checkRows } = await pool.query(
      "SELECT is_base FROM currencies WHERE id = $1",
      [req.params.id]
    );
    
    if (checkRows.length === 0) {
      return res.status(404).json({ error: "Currency not found" });
    }
    
    if (checkRows[0].is_base) {
      return res.status(409).json({ error: "Cannot delete base currency" });
    }
    
    const { rowCount } = await pool.query(
      "DELETE FROM currencies WHERE id = $1",
      [req.params.id]
    );
    
    if (!rowCount) {
      return res.status(404).json({ error: "Currency not found" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
