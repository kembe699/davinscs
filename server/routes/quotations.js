import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { roundToCents } from "../utils/money.js";
import { sendError } from "../utils/errorResponse.js";

const router = express.Router();

async function nextQuoteNumber() {
  const client = await getSchemaClient();
  try {
    const { rows } = await client.query("SELECT quote_number FROM quotations ORDER BY id DESC LIMIT 1");
    if (!rows[0]) return "QUO-0001";
    const num = parseInt(rows[0].quote_number.replace(/\D/g, ""), 10) || 0;
    return `QUO-${String(num + 1).padStart(4, "0")}`;
  } finally {
    client.release();
  }
}

// List quotations
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    let where = ["1=1"];
    const params = [];
    let idx = 1;
    if (status && status !== "all") { where.push(`q.status = $${idx++}`); params.push(status); }
    if (search) {
      where.push(`(q.quote_number ILIKE $${idx} OR q.customer_name ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    const { rows } = await pool.query(
      `SELECT q.*, u.email as created_by_email
       FROM quotations q LEFT JOIN users u ON q.created_by = u.id
       WHERE ${where.join(" AND ")} ORDER BY q.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { return sendError(res, err); }
});

// Get single quotation with items
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { rows: qRows } = await pool.query("SELECT * FROM quotations WHERE id = $1", [req.params.id]);
    if (!qRows[0]) return res.status(404).json({ error: "Quotation not found" });
    const { rows: items } = await pool.query(
      "SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY id",
      [req.params.id]
    );
    res.json({ ...qRows[0], items });
  } catch (err) { return sendError(res, err); }
});

// Create quotation
router.post("/", requireAuth, async (req, res) => {
  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");
    const { customer_id, customer_name, customer_email, customer_phone, customer_address,
            valid_until, notes, items = [], discount_amount = 0 } = req.body;
    if (!customer_name) return res.status(400).json({ error: "Customer name is required" });

    const quote_number = await nextQuoteNumber();
    let subtotal = 0, tax_amount = 0;
    for (const item of items) {
      subtotal += (item.unit_price * item.quantity);
      tax_amount += roundToCents(item.unit_price * item.quantity * (item.tax_rate || 0) / 100);
    }
    const total_amount = subtotal + tax_amount - (discount_amount || 0);

    const { rows } = await client.query(
      `INSERT INTO quotations (quote_number, customer_id, customer_name, customer_email, customer_phone,
        customer_address, valid_until, notes, subtotal, tax_amount, discount_amount, total_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [quote_number, customer_id || null, customer_name, customer_email || null, customer_phone || null,
       customer_address || null, valid_until || null, notes || null,
       subtotal, tax_amount, discount_amount, total_amount, req.user.id]
    );
    const quot = rows[0];

    for (const item of items) {
      const itemSubtotal = item.unit_price * item.quantity;
      await client.query(
        `INSERT INTO quotation_items (quotation_id, product_id, product_name, description, quantity, unit_price, tax_rate, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [quot.id, item.product_id || null, item.product_name, item.description || null,
         item.quantity, item.unit_price, item.tax_rate || 0, itemSubtotal]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(quot);
  } catch (err) {
    await client.query("ROLLBACK");
    return sendError(res, err);
  } finally { client.release(); }
});

// Update quotation
router.put("/:id", requireAuth, async (req, res) => {
  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");
    const { customer_id, customer_name, customer_email, customer_phone, customer_address,
            status, valid_until, notes, items = [], discount_amount = 0 } = req.body;

    let subtotal = 0, tax_amount = 0;
    for (const item of items) {
      subtotal += (item.unit_price * item.quantity);
      tax_amount += roundToCents(item.unit_price * item.quantity * (item.tax_rate || 0) / 100);
    }
    const total_amount = subtotal + tax_amount - (discount_amount || 0);

    const { rows } = await client.query(
      `UPDATE quotations SET customer_id=$1, customer_name=$2, customer_email=$3, customer_phone=$4,
        customer_address=$5, status=$6, valid_until=$7, notes=$8,
        subtotal=$9, tax_amount=$10, discount_amount=$11, total_amount=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [customer_id || null, customer_name, customer_email || null, customer_phone || null,
       customer_address || null, status || 'draft', valid_until || null, notes || null,
       subtotal, tax_amount, discount_amount, total_amount, req.params.id]
    );
    if (!rows[0]) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Not found" }); }

    await client.query("DELETE FROM quotation_items WHERE quotation_id = $1", [req.params.id]);
    for (const item of items) {
      const itemSubtotal = item.unit_price * item.quantity;
      await client.query(
        `INSERT INTO quotation_items (quotation_id, product_id, product_name, description, quantity, unit_price, tax_rate, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [req.params.id, item.product_id || null, item.product_name, item.description || null,
         item.quantity, item.unit_price, item.tax_rate || 0, itemSubtotal]
      );
    }

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    return sendError(res, err);
  } finally { client.release(); }
});

// Update status only
router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await pool.query(
      "UPDATE quotations SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) { return sendError(res, err); }
});

// Convert quotation to invoice
router.post("/:id/convert", requireAuth, async (req, res) => {
  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");
    const { rows: qRows } = await client.query(
      "SELECT * FROM quotations WHERE id = $1", [req.params.id]
    );
    if (!qRows[0]) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Quotation not found" }); }
    const q = qRows[0];
    if (q.status === 'converted') { await client.query("ROLLBACK"); return res.status(400).json({ error: "Already converted" }); }

    const { rows: items } = await client.query(
      "SELECT * FROM quotation_items WHERE quotation_id = $1", [q.id]
    );

    // Generate invoice number
    const { rows: lastInv } = await client.query("SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1");
    const lastNum = lastInv[0] ? parseInt(lastInv[0].invoice_number.replace(/\D/g, ""), 10) || 0 : 0;
    const invoice_number = `INV-${String(lastNum + 1).padStart(4, "0")}`;

    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 30);

    const { rows: invRows } = await client.query(
      `INSERT INTO invoices (invoice_number, customer_id, customer_name, customer_email, customer_phone,
        customer_address, status, due_date, subtotal, tax_amount, discount_amount, total_amount,
        paid_amount, balance, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'unpaid',$7,$8,$9,$10,$11,0,$11,$12,$13) RETURNING *`,
      [invoice_number, q.customer_id, q.customer_name, q.customer_email, q.customer_phone,
       q.customer_address, due_date.toISOString().split('T')[0],
       q.subtotal, q.tax_amount, q.discount_amount, q.total_amount, q.notes, req.user.id]
    );
    const inv = invRows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, product_id, product_name, description, quantity, unit_price, tax_rate, subtotal, discount_amount, total_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$8)`,
        [inv.id, item.product_id, item.product_name, item.description || null, item.quantity, item.unit_price, item.tax_rate || 0, item.subtotal]
      );
    }

    await client.query(
      "UPDATE quotations SET status='converted', converted_invoice_id=$1, updated_at=NOW() WHERE id=$2",
      [inv.id, q.id]
    );

    await client.query("COMMIT");
    res.json({ invoice: inv, invoice_id: inv.id });
  } catch (err) {
    await client.query("ROLLBACK");
    return sendError(res, err);
  } finally { client.release(); }
});

// Delete quotation
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM quotations WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) { return sendError(res, err); }
});

export default router;
