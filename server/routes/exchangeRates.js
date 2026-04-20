import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Get all exchange rates with currency details
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        er.*,
        fc.code as from_currency_code,
        fc.name as from_currency_name,
        fc.symbol as from_currency_symbol,
        tc.code as to_currency_code,
        tc.name as to_currency_name,
        tc.symbol as to_currency_symbol,
        u.email as created_by_email
      FROM exchange_rates er
      JOIN currencies fc ON er.from_currency_id = fc.id
      JOIN currencies tc ON er.to_currency_id = tc.id
      LEFT JOIN users u ON er.created_by = u.id
      ORDER BY er.effective_date DESC, er.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching exchange rates:", err);
    res.status(500).json({ error: "Failed to fetch exchange rates" });
  }
});

// Get active rate for a currency pair
router.get("/active/:fromId/:toId", requireAuth, async (req, res) => {
  try {
    const { fromId, toId } = req.params;
    const { rows } = await pool.query(`
      SELECT 
        er.*,
        fc.code as from_currency_code,
        fc.name as from_currency_name,
        tc.code as to_currency_code,
        tc.name as to_currency_name
      FROM exchange_rates er
      JOIN currencies fc ON er.from_currency_id = fc.id
      JOIN currencies tc ON er.to_currency_id = tc.id
      WHERE er.from_currency_id = $1 
        AND er.to_currency_id = $2
        AND er.is_active = TRUE
        AND er.effective_date <= CURRENT_DATE
        AND (er.expiry_date IS NULL OR er.expiry_date >= CURRENT_DATE)
      ORDER BY er.effective_date DESC
      LIMIT 1
    `, [fromId, toId]);
    
    res.json(rows[0] || null);
  } catch (err) {
    console.error("Error fetching active rate:", err);
    res.status(500).json({ error: "Failed to fetch active rate" });
  }
});

// Convert amount between currencies
router.post("/convert", requireAuth, async (req, res) => {
  try {
    const { from_currency_id, to_currency_id, amount } = req.body;
    
    if (!from_currency_id || !to_currency_id || amount === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Get active rate
    const { rows } = await pool.query(`
      SELECT rate
      FROM exchange_rates
      WHERE from_currency_id = $1 
        AND to_currency_id = $2
        AND is_active = TRUE
        AND effective_date <= CURRENT_DATE
        AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
      ORDER BY effective_date DESC
      LIMIT 1
    `, [from_currency_id, to_currency_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "No active exchange rate found" });
    }
    
    const convertedAmount = parseFloat(amount) * parseFloat(rows[0].rate);
    
    res.json({
      from_currency_id,
      to_currency_id,
      original_amount: parseFloat(amount),
      rate: parseFloat(rows[0].rate),
      converted_amount: convertedAmount
    });
  } catch (err) {
    console.error("Error converting currency:", err);
    res.status(500).json({ error: "Failed to convert currency" });
  }
});

// Create new exchange rate
router.post("/", requireAuth, async (req, res) => {
  try {
    const { from_currency_id, to_currency_id, rate, effective_date, expiry_date } = req.body;
    
    if (!from_currency_id || !to_currency_id || !rate) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    if (from_currency_id === to_currency_id) {
      return res.status(400).json({ error: "Cannot create rate for same currency" });
    }
    
    if (parseFloat(rate) <= 0) {
      return res.status(400).json({ error: "Rate must be positive" });
    }

    // Effective date must not be in the future
    const today = new Date().toISOString().split('T')[0];
    const effDate = effective_date || today;
    if (effDate > today) {
      return res.status(400).json({ error: "Effective date cannot be in the future" });
    }
    
    // Check if expiry date is after effective date
    if (expiry_date && effective_date && new Date(expiry_date) <= new Date(effective_date)) {
      return res.status(400).json({ error: "Expiry date must be after effective date" });
    }
    
    const { rows } = await pool.query(`
      INSERT INTO exchange_rates (
        from_currency_id, to_currency_id, rate, effective_date, expiry_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (from_currency_id, to_currency_id, effective_date)
      DO UPDATE SET
        rate       = EXCLUDED.rate,
        expiry_date = EXCLUDED.expiry_date,
        updated_at  = NOW()
      RETURNING *
    `, [
      from_currency_id,
      to_currency_id,
      rate,
      effective_date || new Date(),
      expiry_date || null,
      req.user.id
    ]);
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating exchange rate:", err);
    res.status(500).json({ error: "Failed to create exchange rate" });
  }
});

// Update exchange rate
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rate, effective_date, expiry_date, is_active } = req.body;

    if (rate !== undefined && parseFloat(rate) <= 0) {
      return res.status(400).json({ error: "Rate must be positive" });
    }
    
    // Check if expiry date is after effective date
    if (expiry_date && effective_date && new Date(expiry_date) <= new Date(effective_date)) {
      return res.status(400).json({ error: "Expiry date must be after effective date" });
    }
    
    const { rows } = await pool.query(`
      UPDATE exchange_rates 
      SET 
        rate = COALESCE($1, rate),
        effective_date = COALESCE($2, effective_date),
        expiry_date = $3,
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [rate, effective_date, expiry_date, is_active, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Exchange rate not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating exchange rate:", err);
    res.status(500).json({ error: "Failed to update exchange rate" });
  }
});

// Delete exchange rate
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query(
      "DELETE FROM exchange_rates WHERE id = $1",
      [id]
    );
    
    if (rowCount === 0) {
      return res.status(404).json({ error: "Exchange rate not found" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting exchange rate:", err);
    res.status(500).json({ error: "Failed to delete exchange rate" });
  }
});

export default router;
