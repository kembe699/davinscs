import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { roundToCents } from "../utils/money.js";

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
        sb.paid_amount as bill_paid,
        po.currency_code,
        po.currency_symbol
      FROM supplier_payments sp
      LEFT JOIN suppliers s ON sp.supplier_id = s.id
      LEFT JOIN supplier_bills sb ON sp.bill_id = sb.id
      LEFT JOIN purchase_orders po ON sb.po_id = po.id
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
  const { supplier_id, bill_id, payment_date, payment_method, reference, notes } = req.body;
  const amount = parseFloat(req.body.amount);

  if (!supplier_id || !payment_date || !amount || isNaN(amount) || !payment_method) {
    return res.status(400).json({ error: "Supplier, date, amount, and method required" });
  }

  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");

    const paymentNumber = `PAY-${Date.now()}`;

    // The payment itself is recorded in the bill's native currency (so it still
    // reconciles against what the supplier actually invoiced), but every payment
    // also gets posted to the books in base currency — converted using the rate
    // locked in on the originating PO at creation time, not today's rate — so
    // expense reports never mix currencies together in one SUM().
    let exchangeRate = 1;
    if (bill_id) {
      const rateResult = await client.query(
        `SELECT po.exchange_rate
         FROM supplier_bills sb
         LEFT JOIN purchase_orders po ON sb.po_id = po.id
         WHERE sb.id = $1`,
        [bill_id]
      );
      if (rateResult.rows[0]?.exchange_rate) {
        exchangeRate = Number(rateResult.rows[0].exchange_rate) || 1;
      }
    }
    const baseAmount = roundToCents(amount / exchangeRate);

    // Create payment
    const paymentResult = await client.query(`
      INSERT INTO supplier_payments
      (payment_number, supplier_id, bill_id, payment_date, amount, payment_method, reference, notes, created_by, exchange_rate, base_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [paymentNumber, supplier_id, bill_id, payment_date, amount, payment_method, reference, notes, req.user.id, exchangeRate, baseAmount]);

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

      const totalAmount = Number(billResult.rows[0].total_amount);
      const paidAmount = Number(billResult.rows[0].paid_amount);
      const newPaidAmount = paidAmount + amount;

      if (newPaidAmount > totalAmount) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Payment exceeds bill amount" });
      }
      
      const newStatus = newPaidAmount >= totalAmount ? 'paid' : 'partial';

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
  const client = await getSchemaClient();
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
    
    const { bill_id } = paymentResult.rows[0];
    const amount = Number(paymentResult.rows[0].amount);

    // Delete payment
    await client.query("DELETE FROM supplier_payments WHERE id = $1", [req.params.id]);

    // If payment was against a bill, update bill
    if (bill_id) {
      const billResult = await client.query(
        "SELECT total_amount, paid_amount FROM supplier_bills WHERE id = $1",
        [bill_id]
      );

      if (billResult.rows[0]) {
        const totalAmount = Number(billResult.rows[0].total_amount);
        const paidAmount = Number(billResult.rows[0].paid_amount);
        const newPaidAmount = paidAmount - amount;
        const newStatus = newPaidAmount <= 0 ? 'unpaid' : newPaidAmount >= totalAmount ? 'paid' : 'partial';

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
