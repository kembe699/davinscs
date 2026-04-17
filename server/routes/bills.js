import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET all bills
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, supplier_id } = req.query;
    const conditions = [];
    const params = [];
    
    if (status) {
      params.push(status);
      conditions.push(`sb.status = $${params.length}`);
    }
    
    if (supplier_id) {
      params.push(supplier_id);
      conditions.push(`sb.supplier_id = $${params.length}`);
    }
    
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    
    const { rows } = await pool.query(`
      SELECT 
        sb.*,
        s.name as supplier_name,
        grn.grn_number,
        po.po_number,
        (sb.total_amount - sb.paid_amount) as balance
      FROM supplier_bills sb
      LEFT JOIN suppliers s ON sb.supplier_id = s.id
      LEFT JOIN goods_received_notes grn ON sb.grn_id = grn.id
      LEFT JOIN purchase_orders po ON sb.po_id = po.id
      ${where}
      ORDER BY sb.created_at DESC
    `, params);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET single bill
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const billResult = await pool.query(`
      SELECT 
        sb.*,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        s.address as supplier_address,
        grn.grn_number,
        po.po_number,
        (sb.total_amount - sb.paid_amount) as balance
      FROM supplier_bills sb
      LEFT JOIN suppliers s ON sb.supplier_id = s.id
      LEFT JOIN goods_received_notes grn ON sb.grn_id = grn.id
      LEFT JOIN purchase_orders po ON sb.po_id = po.id
      WHERE sb.id = $1
    `, [req.params.id]);
    
    if (!billResult.rows[0]) {
      return res.status(404).json({ error: "Bill not found" });
    }
    
    // Get payment history
    const paymentsResult = await pool.query(`
      SELECT * FROM supplier_payments
      WHERE bill_id = $1
      ORDER BY payment_date DESC
    `, [req.params.id]);
    
    res.json({
      ...billResult.rows[0],
      payments: paymentsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST create bill
router.post("/", requireAuth, async (req, res) => {
  const { supplier_id, grn_id, po_id, bill_date, due_date, total_amount, notes } = req.body;
  
  if (!supplier_id || !bill_date || !total_amount) {
    return res.status(400).json({ error: "Supplier, date, and amount required" });
  }
  
  try {
    const billNumber = `BILL-${Date.now()}`;
    
    const { rows } = await pool.query(`
      INSERT INTO supplier_bills 
      (bill_number, supplier_id, grn_id, po_id, bill_date, due_date, total_amount, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [billNumber, supplier_id, grn_id, po_id, bill_date, due_date, total_amount, notes, req.user.id]);
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT update bill
router.put("/:id", requireAuth, async (req, res) => {
  const { bill_date, due_date, total_amount, notes, status } = req.body;
  
  try {
    const { rows } = await pool.query(`
      UPDATE supplier_bills
      SET bill_date = COALESCE($1, bill_date),
          due_date = COALESCE($2, due_date),
          total_amount = COALESCE($3, total_amount),
          notes = COALESCE($4, notes),
          status = COALESCE($5, status),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [bill_date, due_date, total_amount, notes, status, req.params.id]);
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Bill not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE bill
router.delete("/:id", requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Check if bill has payments
    const paymentsResult = await client.query(
      "SELECT COUNT(*) as count FROM supplier_payments WHERE bill_id = $1",
      [req.params.id]
    );
    
    if (parseInt(paymentsResult.rows[0].count) > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cannot delete bill with payments" });
    }
    
    const { rowCount } = await client.query(
      "DELETE FROM supplier_bills WHERE id = $1",
      [req.params.id]
    );
    
    if (rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Bill not found" });
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

// GET bill print data
router.get("/:id/print", requireAuth, async (req, res) => {
  try {
    const billResult = await pool.query(`
      SELECT 
        sb.*,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        s.address as supplier_address,
        grn.grn_number,
        po.po_number,
        (sb.total_amount - sb.paid_amount) as balance
      FROM supplier_bills sb
      LEFT JOIN suppliers s ON sb.supplier_id = s.id
      LEFT JOIN goods_received_notes grn ON sb.grn_id = grn.id
      LEFT JOIN purchase_orders po ON sb.po_id = po.id
      WHERE sb.id = $1
    `, [req.params.id]);
    
    if (!billResult.rows[0]) {
      return res.status(404).json({ error: "Bill not found" });
    }
    
    // Get GRN items if linked
    let items = [];
    if (billResult.rows[0].grn_id) {
      const itemsResult = await pool.query(`
        SELECT 
          gi.*,
          COALESCE(p.name, poi.item_name) as product_name
        FROM grn_items gi
        LEFT JOIN products p ON gi.product_id = p.id
        LEFT JOIN purchase_order_items poi ON gi.po_item_id = poi.id
        WHERE gi.grn_id = $1
      `, [billResult.rows[0].grn_id]);
      items = itemsResult.rows;
    }
    
    res.json({
      ...billResult.rows[0],
      items
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
