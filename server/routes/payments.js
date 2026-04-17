import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET all payments
router.get("/", requireAuth, async (req, res) => {
  try {
    const { supplier_id, payment_method } = req.query;
    const conditions = [];
    const params = [];
    
    if (supplier_id) {
      params.push(supplier_id);
      conditions.push(`sp.supplier_id = $${params.length}`);
    }
    
    if (payment_method) {
      params.push(payment_method);
      conditions.push(`sp.payment_method = $${params.length}`);
    }
    
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    
    const { rows } = await pool.query(`
      SELECT 
        sp.*,
        s.name as supplier_name,
        sb.bill_number,
        sb.total_amount as bill_total,
        sb.paid_amount as bill_paid
      FROM supplier_payments sp
      LEFT JOIN suppliers s ON sp.supplier_id = s.id
      LEFT JOIN supplier_bills sb ON sp.bill_id = sb.id
      ${where}
      ORDER BY sp.payment_date DESC, sp.created_at DESC
    `, params);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET payments by supplier
router.get("/supplier/:supplierId", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        sp.*,
        sb.bill_number,
        sb.total_amount as bill_total
      FROM supplier_payments sp
      LEFT JOIN supplier_bills sb ON sp.bill_id = sb.id
      WHERE sp.supplier_id = $1
      ORDER BY sp.payment_date DESC, sp.created_at DESC
    `, [req.params.supplierId]);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET single payment
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        sp.*,
        s.name as supplier_name,
        s.email as supplier_email,
        sb.bill_number,
        sb.total_amount as bill_total,
        sb.paid_amount as bill_paid
      FROM supplier_payments sp
      LEFT JOIN suppliers s ON sp.supplier_id = s.id
      LEFT JOIN supplier_bills sb ON sp.bill_id = sb.id
      WHERE sp.id = $1
    `, [req.params.id]);
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Payment not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST create payment
router.post("/", requireAuth, async (req, res) => {
  const { supplier_id, bill_id, payment_date, amount, payment_method, reference, notes } = req.body;
  
  if (!supplier_id || !payment_date || !amount || !payment_method) {
    return res.status(400).json({ error: "Supplier, date, amount, and method required" });
  }
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const paymentNumber = `PAY-${Date.now()}`;
    
    // Create payment
    const paymentResult = await client.query(`
      INSERT INTO supplier_payments 
      (payment_number, supplier_id, bill_id, payment_date, amount, payment_method, reference, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [paymentNumber, supplier_id, bill_id, payment_date, amount, payment_method, reference, notes, req.user.id]);
    
    // If payment is against a bill, update bill
    if (bill_id) {
      const billResult = await client.query(
        "SELECT total_amount, paid_amount FROM supplier_bills WHERE id = $1",
        [bill_id]
      );
      
      if (!billResult.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Bill not found" });
      }
      
      const { total_amount, paid_amount } = billResult.rows[0];
      const newPaidAmount = paid_amount + amount;
      
      if (newPaidAmount > total_amount) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Payment exceeds bill amount" });
      }
      
      const newStatus = newPaidAmount >= total_amount ? 'paid' : 'partial';
      
      await client.query(`
        UPDATE supplier_bills 
        SET paid_amount = $1, status = $2, updated_at = NOW()
        WHERE id = $3
      `, [newPaidAmount, newStatus, bill_id]);
    }
    
    await client.query("COMMIT");
    res.status(201).json(paymentResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// DELETE payment
router.delete("/:id", requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Get payment details
    const paymentResult = await client.query(
      "SELECT bill_id, amount FROM supplier_payments WHERE id = $1",
      [req.params.id]
    );
    
    if (!paymentResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Payment not found" });
    }
    
    const { bill_id, amount } = paymentResult.rows[0];
    
    // Delete payment
    await client.query("DELETE FROM supplier_payments WHERE id = $1", [req.params.id]);
    
    // If payment was against a bill, update bill
    if (bill_id) {
      const billResult = await client.query(
        "SELECT total_amount, paid_amount FROM supplier_bills WHERE id = $1",
        [bill_id]
      );
      
      if (billResult.rows[0]) {
        const { total_amount, paid_amount } = billResult.rows[0];
        const newPaidAmount = paid_amount - amount;
        const newStatus = newPaidAmount <= 0 ? 'unpaid' : newPaidAmount >= total_amount ? 'paid' : 'partial';
        
        await client.query(`
          UPDATE supplier_bills 
          SET paid_amount = $1, status = $2, updated_at = NOW()
          WHERE id = $3
        `, [newPaidAmount, newStatus, bill_id]);
      }
    }
    
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

export default router;
