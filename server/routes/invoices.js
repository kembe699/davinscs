import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendError } from "../utils/errorResponse.js";
const router = express.Router();

// Generate next invoice number
async function nextInvoiceNumber() {
  const { rows } = await pool.query(
    "SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1"
  );
  if (rows.length === 0) return "INV-0001";
  const last = rows[0].invoice_number;
  const num = parseInt(last.replace(/\D/g, ""), 10) || 0;
  return `INV-${String(num + 1).padStart(4, "0")}`;
}

// List invoices
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, search, start_date, end_date } = req.query;
    let where = ["1=1"];
    const params = [];
    let idx = 1;

    if (status && status !== "all") {
      where.push(`i.status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      where.push(`(i.invoice_number ILIKE $${idx} OR i.customer_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (start_date) {
      where.push(`DATE(i.created_at) >= $${idx++}`);
      params.push(start_date);
    }
    if (end_date) {
      where.push(`DATE(i.created_at) <= $${idx++}`);
      params.push(end_date);
    }

    const { rows } = await pool.query(
      `SELECT i.*, u.email as created_by_email
       FROM invoices i
       LEFT JOIN users u ON i.created_by = u.id
       WHERE ${where.join(" AND ")}
       ORDER BY i.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    return sendError(res, err);
  }
});

// Get single invoice with items and payments
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: inv } = await pool.query(
      `SELECT i.*, u.email as created_by_email
       FROM invoices i LEFT JOIN users u ON i.created_by = u.id
       WHERE i.id = $1`,
      [id]
    );
    if (inv.length === 0) return res.status(404).json({ error: "Not found" });

    const { rows: items } = await pool.query(
      "SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id",
      [id]
    );
    const { rows: payments } = await pool.query(
      `SELECT ip.*, u.email as recorded_by_email
       FROM invoice_payments ip LEFT JOIN users u ON ip.recorded_by = u.id
       WHERE ip.invoice_id = $1 ORDER BY ip.created_at`,
      [id]
    );
    res.json({ ...inv[0], items, payments });
  } catch (err) {
    return sendError(res, err);
  }
});

// Create invoice
router.post("/", requireAuth, async (req, res) => {
  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");
    const {
      customer_name, customer_email, customer_phone,
      pos_sale_id, price_list_id,
      subtotal, tax_amount, discount_amount, total_amount,
      due_date, notes, items = []
    } = req.body;

    const invoice_number = await nextInvoiceNumber();
    const { rows } = await client.query(
      `INSERT INTO invoices
         (invoice_number, customer_name, customer_email, customer_phone,
          pos_sale_id, price_list_id, subtotal, tax_amount, discount_amount,
          total_amount, paid_amount, status, due_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,'unpaid',$11,$12,$13)
       RETURNING *`,
      [
        invoice_number, customer_name, customer_email || null, customer_phone || null,
        pos_sale_id || null, price_list_id || null,
        subtotal || 0, tax_amount || 0, discount_amount || 0, total_amount || 0,
        due_date || null, notes || null, req.user.id
      ]
    );
    const invoice = rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_items
           (invoice_id, product_id, product_name, quantity, unit_price, discount_amount, total_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          invoice.id, item.product_id || null, item.product_name,
          item.quantity, item.unit_price, item.discount_amount || 0,
          item.quantity * item.unit_price - (item.discount_amount || 0)
        ]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(invoice);
  } catch (err) {
    await client.query("ROLLBACK");
    return sendError(res, err);
  } finally {
    client.release();
  }
});

// Update invoice (notes, due_date)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { notes, due_date, customer_email, customer_phone } = req.body;
    const { rows } = await pool.query(
      `UPDATE invoices SET notes=$1, due_date=$2, customer_email=$3, customer_phone=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [notes || null, due_date || null, customer_email || null, customer_phone || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    return sendError(res, err);
  }
});

// Record payment
router.post("/:id/payments", requireAuth, async (req, res) => {
  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");
    const { amount, payment_method, notes } = req.body;
    const invoiceId = req.params.id;
    const paidNow = parseFloat(amount);
    if (!paidNow || paidNow <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "A positive amount is required" });
    }

    const { rows: inv } = await client.query(
      "SELECT * FROM invoices WHERE id = $1 FOR UPDATE",
      [invoiceId]
    );
    if (inv.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found" });
    }

    const invoice = inv[0];
    if (invoice.status === 'voided') {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "This invoice has been voided — reactivate it first before recording a payment" });
    }
    const totalAmount = Number(invoice.total_amount);
    const newPaid = Number(invoice.paid_amount) + paidNow;
    const balance = totalAmount - newPaid;
    const status = balance <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";

    await client.query(
      `INSERT INTO invoice_payments (invoice_id, amount, payment_method, notes, recorded_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [invoiceId, paidNow, payment_method || "Cash", notes || null, req.user.id]
    );

    const clampedPaid = Math.min(newPaid, totalAmount);
    const { rows } = await client.query(
      `UPDATE invoices SET paid_amount=$1, balance=$2, status=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [clampedPaid, totalAmount - clampedPaid, status, invoiceId]
    );

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    return sendError(res, err);
  } finally {
    client.release();
  }
});

// Void invoice
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "UPDATE invoices SET status='voided', updated_at=NOW() WHERE id=$1",
      [req.params.id]
    );
    res.json({ message: "Invoice voided" });
  } catch (err) {
    return sendError(res, err);
  }
});

export default router;
