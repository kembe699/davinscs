import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../utils/audit.js";
import { sendError } from "../utils/errorResponse.js";

const router = express.Router();

// List all customers
router.get("/", requireAuth, async (req, res) => {
  try {
    const { search } = req.query;
    let where = "1=1";
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      where = `(c.name ILIKE $1 OR c.email ILIKE $1 OR c.phone ILIKE $1)`;
    }
    const { rows } = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM pos_sales s WHERE s.customer_id = c.id AND s.voided = false) as order_count,
        (SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id OR LOWER(i.customer_email) = LOWER(c.email)) as invoice_count,
        (SELECT COALESCE(SUM(s.total_amount),0) FROM pos_sales s WHERE s.customer_id = c.id AND s.voided = false) as total_spent
       FROM customers c
       WHERE ${where}
       ORDER BY c.name ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    return sendError(res, err);
  }
});

// Get single customer with POS sales + invoices
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: cRows } = await pool.query("SELECT * FROM customers WHERE id = $1", [id]);
    if (!cRows[0]) return res.status(404).json({ error: "Customer not found" });

    const { rows: posOrders } = await pool.query(
      `SELECT s.id, s.sale_number as order_number, s.total_amount, s.created_at,
              pt.name as payment_type_name, s.sale_type
       FROM pos_sales s
       LEFT JOIN payment_types pt ON s.payment_type_id = pt.id
       WHERE s.customer_id = $1 AND s.voided = false ORDER BY s.created_at DESC LIMIT 50`,
      [id]
    );
    const { rows: invoices } = await pool.query(
      `SELECT id, invoice_number, status, total_amount, paid_amount, (total_amount - paid_amount) as balance, due_date, created_at
       FROM invoices WHERE customer_id = $1 OR (customer_email IS NOT NULL AND LOWER(customer_email) = (SELECT LOWER(email) FROM customers WHERE id = $1))
       ORDER BY created_at DESC LIMIT 50`,
      [id]
    );

    // Credit sales rung up in the POS (sale_type='credit', see POST /api/pos/sales)
    // — what this customer actually owes, itemized per sale, oldest first so
    // it reads like a running tab.
    const { rows: creditSales } = await pool.query(
      `SELECT cs.id, cs.sale_id, s.sale_number, cs.total_amount, cs.paid_amount, cs.balance,
              cs.due_date, cs.status, cs.created_at
       FROM credit_sales cs
       JOIN pos_sales s ON s.id = cs.sale_id
       WHERE cs.customer_id = $1
       ORDER BY cs.created_at ASC`,
      [id]
    );

    res.json({ customer: cRows[0], posOrders, invoices, creditSales });
  } catch (err) {
    return sendError(res, err);
  }
});

// Create customer
router.post("/", requireAuth, async (req, res) => {
  const { name, email, phone, address, city, postal_code, country, credit_limit, payment_terms, notes } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO customers (name, email, phone, address, city, postal_code, country, credit_limit, payment_terms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, email || null, phone || null, address || null, city || null, postal_code || null, country || null, credit_limit || 0, payment_terms || 30]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    return sendError(res, err);
  }
});

// Update customer
router.put("/:id", requireAuth, async (req, res) => {
  const { name, email, phone, address, city, postal_code, country, credit_limit, payment_terms } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE customers SET name=$1, email=$2, phone=$3, address=$4, city=$5,
        postal_code=$6, country=$7, credit_limit=$8, payment_terms=$9
       WHERE id=$10 RETURNING *`,
      [name, email || null, phone || null, address || null, city || null, postal_code || null, country || null, credit_limit || 0, payment_terms || 30, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Customer not found" });
    res.json(rows[0]);
  } catch (err) {
    return sendError(res, err);
  }
});

// Delete customer
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM customers WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Customer not found" });
    res.json({ success: true });
  } catch (err) {
    if (err.code === "23503") return res.status(409).json({ error: "Cannot delete: customer has linked records" });
    return sendError(res, err);
  }
});

// Settle a customer's running credit balance — a payment (partial or full)
// applied FIFO across their open credit sales (oldest first), same balance
// customers.balance already tracks (incremented when a credit sale is rung
// up in POST /api/pos/sales). No existing endpoint recorded a payment
// against it before this.
router.post("/:id/settle", requireAuth, async (req, res) => {
  const { amount, payment_type_id, notes } = req.body;
  const customerId = req.params.id;
  const paid = Number(amount);
  if (!paid || paid <= 0) return res.status(400).json({ error: "A positive amount is required" });

  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");

    const { rows: cRows } = await client.query("SELECT * FROM customers WHERE id = $1 FOR UPDATE", [customerId]);
    if (!cRows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Customer not found" });
    }

    const { rows: openSales } = await client.query(
      `SELECT * FROM credit_sales WHERE customer_id = $1 AND balance > 0 ORDER BY created_at ASC FOR UPDATE`,
      [customerId]
    );

    let remaining = paid;
    const applied = [];
    for (const sale of openSales) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Number(sale.balance));
      const newPaidAmount = Number(sale.paid_amount) + take;
      const newBalance = Number(sale.balance) - take;
      const status = newBalance <= 0 ? "paid" : "pending";

      await client.query(
        `UPDATE credit_sales SET paid_amount = $1, balance = $2, status = $3 WHERE id = $4`,
        [newPaidAmount, newBalance, status, sale.id]
      );
      // The original pos_sales row was written with payment_status='pending'
      // at sale time (see POST /api/pos/sales) — without this, the sale
      // itself (and anywhere it's shown, e.g. Sales History) would look
      // unpaid forever even once the customer had actually settled up.
      if (status === "paid") {
        await client.query(`UPDATE pos_sales SET payment_status = 'paid' WHERE id = $1`, [sale.sale_id]);
      }
      const { rows: paymentRows } = await client.query(
        `INSERT INTO customer_payments (credit_sale_id, customer_id, amount, payment_type_id, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [sale.id, customerId, take, payment_type_id || null, notes || null]
      );
      applied.push(paymentRows[0]);
      remaining -= take;
    }

    const totalApplied = paid - remaining;
    if (totalApplied > 0) {
      await client.query(
        `UPDATE customers SET balance = GREATEST(balance - $1, 0) WHERE id = $2`,
        [totalApplied, customerId]
      );

      // If this was actually collected as cash, it needs to land in the
      // current cash-drawer session's movements — otherwise real cash taken
      // in for a settlement never counts toward "expected cash", and the
      // drawer looks like it has an unexplained overage at close.
      if (payment_type_id) {
        const { rows: ptRows } = await client.query("SELECT code FROM payment_types WHERE id = $1", [payment_type_id]);
        if (ptRows[0]?.code === "cash") {
          const { rows: sessionRows } = await client.query(
            "SELECT id FROM cash_drawer_sessions WHERE user_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
            [req.user.id]
          );
          if (sessionRows[0]) {
            await client.query(
              `INSERT INTO cash_movements (session_id, user_id, type, amount, reason)
               VALUES ($1, $2, 'in', $3, $4)`,
              [sessionRows[0].id, req.user.id, totalApplied, `Credit settlement — ${cRows[0].name}`]
            );
          }
        }
      }
    }

    await client.query("COMMIT");

    await logAudit({
      userId: req.user.id, userEmail: req.user.email, action: "CUSTOMER_PAYMENT",
      entityType: "customer", entityId: Number(customerId),
      details: { amount_requested: paid, amount_applied: totalApplied, sales_touched: applied.length }, ip: req.ip,
    });

    const { rows: updatedCustomer } = await pool.query("SELECT * FROM customers WHERE id = $1", [customerId]);
    res.json({ customer: updatedCustomer[0], applied, amountApplied: totalApplied, unapplied: remaining });
  } catch (err) {
    await client.query("ROLLBACK");
    return sendError(res, err);
  } finally {
    client.release();
  }
});

export default router;
