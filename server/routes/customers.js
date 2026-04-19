import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

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
        (SELECT COUNT(*) FROM customer_orders co WHERE co.customer_id = c.id) as order_count,
        (SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id OR LOWER(i.customer_email) = LOWER(c.email)) as invoice_count,
        (SELECT COALESCE(SUM(co.total),0) FROM customer_orders co WHERE co.customer_id = c.id) as total_spent
       FROM customers c
       WHERE ${where}
       ORDER BY c.name ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single customer with orders + invoices
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: cRows } = await pool.query("SELECT * FROM customers WHERE id = $1", [id]);
    if (!cRows[0]) return res.status(404).json({ error: "Customer not found" });

    const { rows: orders } = await pool.query(
      `SELECT id, order_number, status, total as total_amount, created_at, customer_name
       FROM customer_orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [id]
    );
    const { rows: posOrders } = await pool.query(
      `SELECT s.id, s.sale_number as order_number, s.total_amount, s.created_at,
              pt.name as payment_type_name, s.sale_type
       FROM pos_sales s
       LEFT JOIN payment_types pt ON s.payment_type_id = pt.id
       WHERE s.customer_id = $1 AND s.voided = false ORDER BY s.created_at DESC LIMIT 50`,
      [id]
    );
    const { rows: invoices } = await pool.query(
      `SELECT id, invoice_number, status, total_amount, paid_amount, COALESCE(balance,0) as balance, due_date, created_at
       FROM invoices WHERE customer_id = $1 OR (customer_email IS NOT NULL AND LOWER(customer_email) = (SELECT LOWER(email) FROM customers WHERE id = $1))
       ORDER BY created_at DESC LIMIT 50`,
      [id]
    );

    res.json({ customer: cRows[0], orders, posOrders, invoices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
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
    console.error(err);
    res.status(500).json({ error: "Server error" });
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
    console.error(err);
    res.status(500).json({ error: "Server error" });
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
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
