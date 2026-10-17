import express from "express";
import pool from "../db.js";
import { requireAuth, optionalTenantContext } from "../middleware/auth.js";
import { sendError } from "../utils/errorResponse.js";

const router = express.Router();

// Get all payment types
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM payment_types ORDER BY sort_order, name"
    );
    res.json(rows);
  } catch (err) {
    return sendError(res, err);
  }
});

// Get active payment types
router.get("/active", optionalTenantContext, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM payment_types WHERE is_active = true ORDER BY sort_order, name"
    );
    res.json(rows);
  } catch (err) {
    return sendError(res, err);
  }
});

// Create payment type
router.post("/", requireAuth, async (req, res) => {
  const { name, code, is_active, sort_order } = req.body;
  
  if (!name || !code) {
    return res.status(400).json({ error: "Name and code are required" });
  }
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO payment_types (name, code, is_active, sort_order) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, code, is_active ?? true, sort_order ?? 0]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      return res.status(400).json({ error: "Payment type code already exists" });
    }
    return sendError(res, err);
  }
});

// Update payment type
router.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, code, is_active, sort_order } = req.body;
  
  try {
    const { rows } = await pool.query(
      `UPDATE payment_types 
       SET name = $1, code = $2, is_active = $3, sort_order = $4
       WHERE id = $5 RETURNING *`,
      [name, code, is_active, sort_order, id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Payment type not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    return sendError(res, err);
  }
});

// Delete payment type
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      "DELETE FROM payment_types WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Payment type not found" });
    }
    
    res.json({ message: "Payment type deleted" });
  } catch (err) {
    return sendError(res, err);
  }
});

export default router;
