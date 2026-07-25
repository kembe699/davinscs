import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../utils/audit.js";

const router = express.Router();

// PUBLIC VERIFY ENDPOINT (No Auth Required)
router.get("/verify/:sale_number", async (req, res) => {
  let schema = req.headers["x-schema-name"] || req.query.schema;

  // Fallback: resolve schema from tenant_slug if schema not provided directly
  if (!schema && req.query.tenant_slug) {
    try {
      const slugRes = await pool.query(
        'SELECT schema_name FROM public.tenants WHERE tenant_slug = $1',
        [req.query.tenant_slug]
      );
      schema = slugRes.rows[0]?.schema_name;
    } catch (slugErr) {
      console.error('Error resolving schema from slug:', slugErr.message);
    }
  }

  if (!schema) return res.status(400).json({ error: "Schema name is required" });

  try {
    const saleResult = await pool.query(`SELECT * FROM "${schema}".pos_sales WHERE sale_number = $1`, [req.params.sale_number]);
    const sale = saleResult.rows[0];
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const itemsResult = await pool.query(
      `SELECT si.*, COALESCE(p.name, si.product_name) as product_name, p.barcode
       FROM "${schema}".pos_sale_items si
       LEFT JOIN "${schema}".products p ON si.product_id = p.id
       WHERE si.sale_id = $1`,
      [sale.id]
    );
    const items = itemsResult.rows;

    const companyResult = await pool.query(`SELECT * FROM "${schema}".company_settings WHERE id = 1`);
    const company = companyResult.rows[0] || {};

    res.json({
      sale,
      items,
      company: {
        name: company.company_name,
        address: company.address,
        phone: company.phone,
        email: company.email,
        tax_id: company.tax_id,
        logo: company.logo_url
      }
    });
  } catch (error) {
    console.error("Error verifying sale:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Generate sale number
function generateSaleNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
  return `POS-${year}${month}${day}-${time}`;
}

// Create new sale
router.post("/sales", requireAuth, async (req, res) => {
  const { customer_id, customer_name, items, payment_type_id, discount_amount, sale_type, notes, status, price_list_id, promotion_id, sale_currency_id, table_id } = req.body;
  const user_id = req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Items are required" });
  }

  if (!payment_type_id) {
    return res.status(400).json({ error: "Payment type is required" });
  }

  const client = await getSchemaClient();

  try {
    await client.query("BEGIN");

    // A table can only have one running order at a time — guard against two
    // cashiers holding a sale against the same table concurrently.
    if (table_id && status === 'held') {
      const clash = await client.query(
        "SELECT id FROM pos_sales WHERE table_id = $1 AND status = 'held' AND voided = false",
        [table_id]
      );
      if (clash.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "This table already has a running order. Refresh and try again." });
      }
    }

    // Get current cash drawer session
    const sessionResult = await client.query(
      "SELECT id FROM cash_drawer_sessions WHERE user_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
      [user_id]
    );
    
    let session_id = sessionResult.rows[0]?.id || null;
    
    // Auto-open cash drawer session if none exists
    if (!session_id) {
      const openSessionResult = await client.query(
        "INSERT INTO cash_drawer_sessions (user_id, status, opened_at) VALUES ($1, 'open', NOW()) RETURNING id",
        [user_id]
      );
      session_id = openSessionResult.rows[0].id;
    }

    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;
    const processedItems = [];
    
    for (const item of items) {
      const productResult = await client.query(
        `SELECT p.*, COALESCE(t.rate, 0) as tax_rate 
         FROM products p 
         LEFT JOIN tax_rates t ON p.tax_rate_id = t.id 
         WHERE p.id = $1`,
        [item.product_id]
      );
      
      if (!productResult.rows[0]) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      
      const product = productResult.rows[0];
      
      // Check stock for non-service products
      const isService = product.product_type === 'service';
      if (!isService) {
        const available = product.quantity_on_hand - product.quantity_reserved;
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }
      
      const unit_price = Number(item.unit_price || product.price);
      const item_discount = Number(item.discount_amount || 0);
      const item_subtotal = (unit_price * item.quantity) - item_discount;
      const item_tax = Math.round(item_subtotal * (product.tax_rate / 100));
      
      subtotal += item_subtotal;
      tax_amount += item_tax;
      
      processedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price,
        discount_amount: item_discount,
        tax_amount: item_tax,
        subtotal: item_subtotal,
        cogs: Math.round((product.cost_price || 0) * item.quantity),
      });
      
      if (!isService) {
        if (status === 'held') {
          // Hold — reserve the stock so it can't be sold elsewhere, but don't
          // deduct it yet. Deduction happens when the hold is confirmed/paid.
          await client.query(
            "UPDATE products SET quantity_reserved = quantity_reserved + $1, updated_at = NOW() WHERE id = $2",
            [item.quantity, product.id]
          );
          await client.query(
            `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
             VALUES ($1, 'hold', $2, 'pos_sale', 0, $3, 'POS Sale Held')`,
            [product.id, item.quantity, user_id]
          );
        } else {
          // Update inventory
          await client.query(
            "UPDATE products SET quantity_on_hand = quantity_on_hand - $1, updated_at = NOW() WHERE id = $2",
            [item.quantity, product.id]
          );

          // Record stock movement
          await client.query(
            `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
             VALUES ($1, 'sale', $2, 'pos_sale', 0, $3, 'POS Sale')`,
            [product.id, -item.quantity, user_id]
          );
        }
      }
    }

    const total_discount = discount_amount || 0;
    const total_amount = subtotal + tax_amount - total_discount;
    const sale_number = generateSaleNumber();
    
    // ── Currency snapshot ──────────────────────────────────────────────
    // Resolve the base currency and snapshot the exchange rate at moment of sale.
    // If a foreign sale_currency_id is provided, look up its active rate.
    // If no rate exists for a non-base currency, the sale is blocked.
    const baseCurrResult = await client.query(
      "SELECT id FROM currencies WHERE is_base = TRUE LIMIT 1"
    );
    const baseCurrId = baseCurrResult.rows[0]?.id || null;

    let resolved_currency_id = sale_currency_id || baseCurrId;
    let resolved_exchange_rate = 1.0;

    if (resolved_currency_id && baseCurrId && resolved_currency_id !== baseCurrId) {
      // Foreign currency sale — must have a rate on record for today
      const rateResult = await client.query(`
        SELECT rate FROM exchange_rates
        WHERE from_currency_id = $1 AND to_currency_id = $2
          AND is_active = TRUE
          AND effective_date <= CURRENT_DATE
          AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
        ORDER BY effective_date DESC LIMIT 1`,
        [baseCurrId, resolved_currency_id]
      );
      if (!rateResult.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(422).json({
          error: "No exchange rate configured for the selected currency. Sale blocked — please add a rate in Currency Management first."
        });
      }
      resolved_exchange_rate = parseFloat(rateResult.rows[0].rate);
    }

    // Look up promotion name if a promotion was applied
    let promo_name = null;
    let resolved_promotion_id = promotion_id || null;
    if (resolved_promotion_id) {
      const promoRes = await client.query('SELECT name FROM promotions WHERE id = $1', [resolved_promotion_id]);
      promo_name = promoRes.rows[0]?.name || null;
    }
    
    // Determine payment status
    const payment_status = sale_type === 'credit' ? 'pending' : 'paid';
    
    // Create sale
    const saleResult = await client.query(
      `INSERT INTO pos_sales (sale_number, customer_id, customer_name, user_id, session_id, price_list_id, subtotal, tax_amount,
                              discount_amount, total_amount, payment_type_id, payment_status, sale_type, status, notes,
                              promotion_id, promotion_name, sale_currency_id, exchange_rate_used, table_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
      [sale_number, customer_id, customer_name, user_id, session_id, price_list_id || null, subtotal, tax_amount, total_discount,
       total_amount, payment_type_id, payment_status, sale_type || 'regular', status || 'completed', notes,
       resolved_promotion_id, promo_name, resolved_currency_id, resolved_exchange_rate, table_id || null]
    );
    
    const sale = saleResult.rows[0];
    
    // Create sale items
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO pos_sale_items (sale_id, product_id, product_name, quantity, unit_price, 
                                      discount_amount, tax_amount, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [sale.id, item.product_id, item.product_name, item.quantity, item.unit_price, 
         item.discount_amount, item.tax_amount, item.subtotal]
      );
    }
    
    // ── Accounting journal entries ─────────────────────────────────────
    // Held sales aren't confirmed revenue yet — entries post when the hold
    // is completed via PUT /sales/:id/complete instead.
    if ((status || 'completed') === 'completed') {
    try {
      const acctRows = await client.query(
        `SELECT id, code FROM accounts WHERE code IN ('1000','1100','1200','4000','5000') AND is_active = true`
      );
      const acct = {};
      acctRows.rows.forEach(r => { acct[r.code] = r.id; });
      const today = new Date().toISOString().split('T')[0];

      // Revenue entry: DR Cash(1000)/AR(1100)  CR Sales Revenue(4000)
      if (total_amount > 0 && acct['4000']) {
        const drAcct = sale_type === 'credit' ? (acct['1100'] || acct['1000']) : (acct['1000'] || acct['1100']);
        if (drAcct) {
          const { rows: tx1 } = await client.query(
            `INSERT INTO transactions (transaction_date, reference, description, created_by) VALUES ($1,$2,$3,$4) RETURNING id`,
            [today, sale_number, `POS Sale Revenue – ${sale_number}`, user_id]
          );
          const tid1 = tx1[0].id;
          await client.query(`INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES ($1,$2,$3,0)`, [tid1, drAcct, total_amount]);
          await client.query(`INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES ($1,$2,0,$3)`, [tid1, acct['4000'], total_amount]);
        }
      }

      // COGS entry: DR Cost of Goods Sold(5000)  CR Inventory(1200)
      const total_cogs = processedItems.reduce((s, it) => s + it.cogs, 0);
      if (total_cogs > 0 && acct['5000'] && acct['1200']) {
        const { rows: tx2 } = await client.query(
          `INSERT INTO transactions (transaction_date, reference, description, created_by) VALUES ($1,$2,$3,$4) RETURNING id`,
          [today, sale_number, `COGS – ${sale_number}`, user_id]
        );
        const tid2 = tx2[0].id;
        await client.query(`INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES ($1,$2,$3,0)`, [tid2, acct['5000'], total_cogs]);
        await client.query(`INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES ($1,$2,0,$3)`, [tid2, acct['1200'], total_cogs]);
      }
    } catch (acctErr) {
      // Non-fatal: log but don't fail the sale
      console.error('Accounting journal error (sale still saved):', acctErr.message);
    }
    }

    // Auto-record cash sales as cash_movements 'in' for the active session
    if (session_id && sale_type !== 'credit' && (status || 'completed') === 'completed') {
      const ptResult = await client.query(
        "SELECT code FROM payment_types WHERE id = $1",
        [payment_type_id]
      );
      if (ptResult.rows[0]?.code === 'cash') {
        await client.query(
          `INSERT INTO cash_movements (session_id, user_id, type, amount, reason)
           VALUES ($1, $2, 'in', $3, $4)`,
          [session_id, user_id, total_amount, `POS Sale ${sale_number}`]
        );
      }
    }

    // If credit sale, create credit record
    if (sale_type === 'credit' && customer_id) {
      const due_date = new Date();
      due_date.setDate(due_date.getDate() + 30); // Default 30 days
      
      await client.query(
        `INSERT INTO credit_sales (sale_id, customer_id, total_amount, balance, due_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale.id, customer_id, total_amount, total_amount, due_date]
      );
      
      // Update customer balance
      await client.query(
        "UPDATE customers SET balance = balance + $1 WHERE id = $2",
        [total_amount, customer_id]
      );
    }
    
    await client.query("COMMIT");
    
    // Fetch complete sale with items
    const completeSale = await pool.query(
      `SELECT s.*, 
              json_agg(json_build_object(
                'id', si.id,
                'product_id', si.product_id,
                'product_name', si.product_name,
                'quantity', si.quantity,
                'unit_price', si.unit_price,
                'discount_amount', si.discount_amount,
                'tax_amount', si.tax_amount,
                'subtotal', si.subtotal
              )) as items
       FROM pos_sales s
       LEFT JOIN pos_sale_items si ON s.id = si.sale_id
       WHERE s.id = $1
       GROUP BY s.id`,
      [sale.id]
    );
    
    await logAudit({ userId: user_id, userEmail: req.user.email, action: 'SALE_CREATED', entityType: 'sale', entityId: sale.id, details: { sale_number, total_amount, payment_type_id, sale_type: sale_type || 'regular', items_count: items.length }, ip: req.ip });
    res.json(completeSale.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("SALE_ERROR_DUMP:", err.stack || err);
    res.status(500).json({ error: err.message || "Server error" });
  } finally {
    client.release();
  }
});

// Get all held sales — visible to every cashier (shared queue), any date
router.get("/sales/held", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, COALESCE(c.name, s.customer_name) as customer_name, u.email as user_email, u.name as user_name,
             json_agg(json_build_object(
               'id', si.id,
               'product_id', si.product_id,
               'product_name', si.product_name,
               'quantity', si.quantity,
               'unit_price', si.unit_price,
               'discount_amount', si.discount_amount,
               'tax_amount', si.tax_amount,
               'subtotal', si.subtotal
             ) ORDER BY si.id) as items
      FROM pos_sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN pos_sale_items si ON s.id = si.sale_id
      WHERE s.status = 'held' AND s.voided = false
      GROUP BY s.id, c.id, u.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Confirm payment on a held sale — releases the reservation, deducts stock,
// and posts the accounting/cash entries now that it's actually paid.
router.put("/sales/:id/complete", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { payment_type_id } = req.body;
  const user_id = req.user.id;

  if (!payment_type_id) {
    return res.status(400).json({ error: "Payment type is required" });
  }

  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");

    const saleResult = await client.query(
      "SELECT * FROM pos_sales WHERE id = $1 AND status = 'held' AND voided = false FOR UPDATE",
      [id]
    );
    if (!saleResult.rows[0]) {
      throw new Error("Held sale not found or already resolved");
    }
    const sale = saleResult.rows[0];

    const itemsResult = await client.query(
      `SELECT si.*, p.product_type, p.cost_price
       FROM pos_sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1`,
      [id]
    );

    // Get or auto-open a cash drawer session for this user
    const sessionResult = await client.query(
      "SELECT id FROM cash_drawer_sessions WHERE user_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
      [user_id]
    );
    let session_id = sessionResult.rows[0]?.id || null;
    if (!session_id) {
      const openSessionResult = await client.query(
        "INSERT INTO cash_drawer_sessions (user_id, status, opened_at) VALUES ($1, 'open', NOW()) RETURNING id",
        [user_id]
      );
      session_id = openSessionResult.rows[0].id;
    }

    for (const item of itemsResult.rows) {
      if (item.product_type !== 'service') {
        // Release the hold and consume the stock
        await client.query(
          "UPDATE products SET quantity_on_hand = quantity_on_hand - $1, quantity_reserved = quantity_reserved - $1, updated_at = NOW() WHERE id = $2",
          [item.quantity, item.product_id]
        );
        await client.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
           VALUES ($1, 'sale', $2, 'pos_sale', $3, $4, 'Held sale completed')`,
          [item.product_id, -item.quantity, id, user_id]
        );
      }
    }

    await client.query(
      "UPDATE pos_sales SET status = 'completed', payment_status = 'paid', payment_type_id = $1, session_id = $2 WHERE id = $3",
      [payment_type_id, session_id, id]
    );

    // Accounting journal entries — same shape as a normal completed sale
    try {
      const acctRows = await client.query(
        `SELECT id, code FROM accounts WHERE code IN ('1000','1100','1200','4000','5000') AND is_active = true`
      );
      const acct = {};
      acctRows.rows.forEach(r => { acct[r.code] = r.id; });
      const today = new Date().toISOString().split('T')[0];

      if (sale.total_amount > 0 && acct['4000']) {
        const drAcct = sale.sale_type === 'credit' ? (acct['1100'] || acct['1000']) : (acct['1000'] || acct['1100']);
        if (drAcct) {
          const { rows: tx1 } = await client.query(
            `INSERT INTO transactions (transaction_date, reference, description, created_by) VALUES ($1,$2,$3,$4) RETURNING id`,
            [today, sale.sale_number, `POS Sale Revenue – ${sale.sale_number}`, user_id]
          );
          const tid1 = tx1[0].id;
          await client.query(`INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES ($1,$2,$3,0)`, [tid1, drAcct, sale.total_amount]);
          await client.query(`INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES ($1,$2,0,$3)`, [tid1, acct['4000'], sale.total_amount]);
        }
      }

      const total_cogs = itemsResult.rows.reduce((s, it) => s + Math.round((it.cost_price || 0) * it.quantity), 0);
      if (total_cogs > 0 && acct['5000'] && acct['1200']) {
        const { rows: tx2 } = await client.query(
          `INSERT INTO transactions (transaction_date, reference, description, created_by) VALUES ($1,$2,$3,$4) RETURNING id`,
          [today, sale.sale_number, `COGS – ${sale.sale_number}`, user_id]
        );
        const tid2 = tx2[0].id;
        await client.query(`INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES ($1,$2,$3,0)`, [tid2, acct['5000'], total_cogs]);
        await client.query(`INSERT INTO transaction_lines (transaction_id, account_id, debit, credit) VALUES ($1,$2,0,$3)`, [tid2, acct['1200'], total_cogs]);
      }
    } catch (acctErr) {
      console.error('Accounting journal error (hold completed, entries skipped):', acctErr.message);
    }

    // Cash movement, if paid in cash
    const ptResult = await client.query("SELECT code FROM payment_types WHERE id = $1", [payment_type_id]);
    if (ptResult.rows[0]?.code === 'cash') {
      await client.query(
        `INSERT INTO cash_movements (session_id, user_id, type, amount, reason) VALUES ($1, $2, 'in', $3, $4)`,
        [session_id, user_id, sale.total_amount, `POS Sale ${sale.sale_number}`]
      );
    }

    await client.query("COMMIT");

    const completeSale = await pool.query(
      `SELECT s.*, json_agg(json_build_object(
          'id', si.id, 'product_id', si.product_id, 'product_name', si.product_name,
          'quantity', si.quantity, 'unit_price', si.unit_price,
          'discount_amount', si.discount_amount, 'tax_amount', si.tax_amount, 'subtotal', si.subtotal
        ) ORDER BY si.id) as items
       FROM pos_sales s
       LEFT JOIN pos_sale_items si ON s.id = si.sale_id
       WHERE s.id = $1
       GROUP BY s.id`,
      [id]
    );

    await logAudit({ userId: user_id, userEmail: req.user.email, action: 'HELD_SALE_COMPLETED', entityType: 'sale', entityId: parseInt(id), details: { sale_number: sale.sale_number, total_amount: sale.total_amount }, ip: req.ip });
    res.json(completeSale.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  } finally {
    client.release();
  }
});

// Cancel a held sale — releases the reservation, never touched quantity_on_hand
router.put("/sales/:id/cancel-hold", requireAuth, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");

    const saleResult = await client.query(
      "SELECT * FROM pos_sales WHERE id = $1 AND status = 'held' AND voided = false FOR UPDATE",
      [id]
    );
    if (!saleResult.rows[0]) {
      throw new Error("Held sale not found or already resolved");
    }
    const sale = saleResult.rows[0];

    const itemsResult = await client.query(
      `SELECT si.*, p.product_type FROM pos_sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = $1`,
      [id]
    );

    for (const item of itemsResult.rows) {
      if (item.product_type !== 'service') {
        await client.query(
          "UPDATE products SET quantity_reserved = quantity_reserved - $1, updated_at = NOW() WHERE id = $2",
          [item.quantity, item.product_id]
        );
        await client.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
           VALUES ($1, 'hold_release', $2, 'pos_sale', $3, $4, 'Held sale cancelled')`,
          [item.product_id, item.quantity, id, user_id]
        );
      }
    }

    await client.query(
      "UPDATE pos_sales SET voided = true, voided_at = NOW(), voided_by = $1 WHERE id = $2",
      [user_id, id]
    );

    await client.query("COMMIT");
    await logAudit({ userId: user_id, userEmail: req.user.email, action: 'HELD_SALE_CANCELLED', entityType: 'sale', entityId: parseInt(id), details: { sale_number: sale.sale_number }, ip: req.ip });
    res.json({ message: "Held sale cancelled" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  } finally {
    client.release();
  }
});

// Get all sales
router.get("/sales", requireAuth, async (req, res) => {
  const { start_date, end_date, customer_id, payment_status, sale_type, include_voided } = req.query;
  const isAdmin = req.user.role === 'admin';
  // Only admins may opt in to seeing voided sales (e.g. to permanently delete them) —
  // everyone else, and the default view, still only sees active sales.
  const showVoided = include_voided === 'true' && isAdmin;

  try {
    let query = `
      SELECT s.*, COALESCE(c.name, s.customer_name) as customer_name, u.email as user_email, u.name as user_name, pt.name as payment_type_name
      FROM pos_sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN payment_types pt ON s.payment_type_id = pt.id
      WHERE s.status != 'held' ${showVoided ? '' : 'AND s.voided = false'}
    `;
    const params = [];
    let paramCount = 1;

    // Non-admins only see their own sales
    if (!isAdmin) {
      query += ` AND s.user_id = $${paramCount}`;
      params.push(req.user.id);
      paramCount++;
    }

    if (start_date) {
      query += ` AND s.created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }
    
    if (end_date) {
      query += ` AND s.created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }
    
    if (customer_id) {
      query += ` AND s.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }
    
    if (payment_status) {
      query += ` AND s.payment_status = $${paramCount}`;
      params.push(payment_status);
      paramCount++;
    }
    
    if (sale_type) {
      query += ` AND s.sale_type = $${paramCount}`;
      params.push(sale_type);
      paramCount++;
    }
    
    query += " ORDER BY s.created_at DESC";
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get sale by ID
router.get("/sales/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      `SELECT s.*, 
              COALESCE(c.name, s.customer_name) as customer_name, c.email as customer_email, c.phone as customer_phone,
              u.email as user_email, u.name as user_name,
              pt.name as payment_type_name,
              json_agg(json_build_object(
                'id', si.id,
                'product_id', si.product_id,
                'product_name', si.product_name,
                'quantity', si.quantity,
                'unit_price', si.unit_price,
                'discount_amount', si.discount_amount,
                'tax_amount', si.tax_amount,
                'subtotal', si.subtotal
              )) as items
       FROM pos_sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN payment_types pt ON s.payment_type_id = pt.id
       LEFT JOIN pos_sale_items si ON s.id = si.sale_id
       WHERE s.id = $1
       GROUP BY s.id, c.id, u.id, pt.id`,
      [id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: "Sale not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Void sale (admin only)
router.post("/sales/:id/void", requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Only an admin can delete/void a sale" });
  }

  const { id } = req.params;
  const user_id = req.user.id;

  const client = await getSchemaClient();
  
  try {
    await client.query("BEGIN");
    
    // Get sale details
    const saleResult = await client.query(
      "SELECT * FROM pos_sales WHERE id = $1 AND voided = false",
      [id]
    );
    
    if (!saleResult.rows[0]) {
      throw new Error("Sale not found or already voided");
    }
    
    const sale = saleResult.rows[0];
    
    // Get sale items with product info
    const itemsResult = await client.query(
      `SELECT si.*, p.product_type 
       FROM pos_sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1`,
      [id]
    );
    
    // Restore inventory
    for (const item of itemsResult.rows) {
      if (item.product_type !== 'service') {
        await client.query(
          "UPDATE products SET quantity_on_hand = quantity_on_hand + $1, updated_at = NOW() WHERE id = $2",
          [item.quantity, item.product_id]
        );
        
        // Record stock movement
        await client.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
           VALUES ($1, 'adjustment', $2, 'void_sale', $3, $4, 'Sale voided')`,
          [item.product_id, item.quantity, id, user_id]
        );
      }
    }
    
    // If credit sale, update customer balance
    if (sale.sale_type === 'credit' && sale.customer_id) {
      await client.query(
        "UPDATE customers SET balance = balance - $1 WHERE id = $2",
        [sale.total_amount, sale.customer_id]
      );
      
      await client.query(
        "UPDATE credit_sales SET status = 'voided' WHERE sale_id = $1",
        [id]
      );
    }
    
    // Mark sale as voided
    await client.query(
      "UPDATE pos_sales SET voided = true, voided_at = NOW(), voided_by = $1 WHERE id = $2",
      [user_id, id]
    );
    
    await client.query("COMMIT");
    await logAudit({ userId: user_id, userEmail: req.user.email, action: 'SALE_VOIDED', entityType: 'sale', entityId: parseInt(id), details: { sale_number: sale.sale_number, total_amount: sale.total_amount }, ip: req.ip });
    res.json({ message: "Sale voided successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  } finally {
    client.release();
  }
});

// Permanently delete a sale (admin only) — unlike /void (which keeps the
// record for the audit trail), this actually removes the row and everything
// tied to it, so it stops blocking product deletion via the FK on
// pos_sale_items.product_id.
router.delete("/sales/:id", requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Only an admin can permanently delete a sale" });
  }

  const { id } = req.params;
  const user_id = req.user.id;

  const client = await getSchemaClient();

  try {
    await client.query("BEGIN");

    const saleResult = await client.query("SELECT * FROM pos_sales WHERE id = $1", [id]);
    if (!saleResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Sale not found" });
    }
    const sale = saleResult.rows[0];

    // If this sale was never voided, apply the same side effects voiding
    // would have (restore inventory, reverse credit balance) before removing
    // it, so deleting an active sale doesn't silently leave stock/balances wrong.
    if (!sale.voided) {
      const itemsResult = await client.query(
        `SELECT si.*, p.product_type FROM pos_sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = $1`,
        [id]
      );
      for (const item of itemsResult.rows) {
        if (item.product_type !== 'service') {
          await client.query(
            "UPDATE products SET quantity_on_hand = quantity_on_hand + $1, updated_at = NOW() WHERE id = $2",
            [item.quantity, item.product_id]
          );
        }
      }
      if (sale.sale_type === 'credit' && sale.customer_id) {
        await client.query("UPDATE customers SET balance = balance - $1 WHERE id = $2", [sale.total_amount, sale.customer_id]);
      }
    }

    // Remove any refund sales recorded against this one first
    const refundRows = await client.query("SELECT id FROM pos_sales WHERE original_sale_id = $1", [id]);
    for (const r of refundRows.rows) {
      await client.query("DELETE FROM customer_payments WHERE credit_sale_id IN (SELECT id FROM credit_sales WHERE sale_id = $1)", [r.id]);
      await client.query("DELETE FROM credit_sales WHERE sale_id = $1", [r.id]);
      await client.query("DELETE FROM pos_sales WHERE id = $1", [r.id]); // cascades to pos_sale_items
    }

    // Remove credit-sale / customer-payment records tied to this sale
    await client.query("DELETE FROM customer_payments WHERE credit_sale_id IN (SELECT id FROM credit_sales WHERE sale_id = $1)", [id]);
    await client.query("DELETE FROM credit_sales WHERE sale_id = $1", [id]);

    // Deleting the sale cascades to pos_sale_items automatically
    await client.query("DELETE FROM pos_sales WHERE id = $1", [id]);

    await client.query("COMMIT");
    await logAudit({ userId: user_id, userEmail: req.user.email, action: 'SALE_DELETED', entityType: 'sale', entityId: parseInt(id), details: { sale_number: sale.sale_number, total_amount: sale.total_amount }, ip: req.ip });
    res.json({ message: "Sale permanently deleted" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  } finally {
    client.release();
  }
});

// Process refund
router.post("/sales/:id/refund", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { items, refund_method, reason } = req.body; // items: [{product_id, quantity}]
  const user_id = req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No items selected for refund" });
  }

  const client = await getSchemaClient();

  try {
    await client.query("BEGIN");

    // Get original sale
    const saleResult = await client.query(
      "SELECT * FROM pos_sales WHERE id = $1 AND voided = false AND sale_type != 'refund'",
      [id]
    );
    if (!saleResult.rows[0]) throw new Error("Sale not found or already refunded");
    const sale = saleResult.rows[0];

    let refund_subtotal = 0;
    let refund_tax = 0;
    const refundLineItems = [];

    for (const refundItem of items) {
      const itemResult = await client.query(
        `SELECT si.*, p.product_type 
         FROM pos_sale_items si
         JOIN products p ON si.product_id = p.id
         WHERE si.sale_id = $1 AND si.product_id = $2`,
        [id, refundItem.product_id]
      );
      if (!itemResult.rows[0]) throw new Error(`Item not found in sale`);
      const item = itemResult.rows[0];
      if (refundItem.quantity > item.quantity) throw new Error(`Refund quantity exceeds sold quantity for ${item.product_name}`);

      const ratio = refundItem.quantity / item.quantity;
      const line_subtotal = Math.round(item.subtotal * ratio);
      const line_tax     = Math.round((item.tax_amount || 0) * ratio);
      refund_subtotal += line_subtotal;
      refund_tax      += line_tax;

      refundLineItems.push({
        product_id:   item.product_id,
        product_name: item.product_name,
        quantity:     refundItem.quantity,
        unit_price:   item.unit_price,
        subtotal:     line_subtotal,
        tax_amount:   line_tax,
        discount_amount: 0,
      });

      if (item.product_type !== 'service') {
        // Restore inventory
        await client.query(
          "UPDATE products SET quantity_on_hand = quantity_on_hand + $1, updated_at = NOW() WHERE id = $2",
          [refundItem.quantity, refundItem.product_id]
        );
        // Stock movement
        await client.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
           VALUES ($1, 'return', $2, 'refund', $3, $4, $5)`,
          [refundItem.product_id, refundItem.quantity, id, user_id, reason || 'Customer return']
        );
      }
      
      // Reduce original sale item quantity (net remaining after return)
      await client.query(
        `UPDATE pos_sale_items SET quantity = quantity - $1
         WHERE sale_id = $2 AND product_id = $3`,
        [refundItem.quantity, id, refundItem.product_id]
      );
    }

    const refund_total = refund_subtotal + refund_tax;
    const refund_number = `REF-${Date.now().toString().slice(-6)}-${sale.sale_number}`;

    // Create refund sale record (negative amounts)
    // Carry over the original sale's currency and rate snapshot — never recalculate
    const refundSaleResult = await client.query(
      `INSERT INTO pos_sales
        (sale_number, customer_id, customer_name, user_id, session_id,
         subtotal, tax_amount, discount_amount, total_amount,
         payment_type_id, payment_status, sale_type, notes,
         original_sale_id, refund_method, refund_reason,
         sale_currency_id, exchange_rate_used)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'refunded','refund',$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        refund_number, sale.customer_id, sale.customer_name, user_id, sale.session_id,
        -refund_subtotal, -refund_tax, 0, -refund_total,
        sale.payment_type_id,
        reason || 'Customer return',
        parseInt(id),
        refund_method || sale.payment_type_id,
        reason || null,
        sale.sale_currency_id,      // immutable: use original sale's currency
        sale.exchange_rate_used,    // immutable: use original sale's rate snapshot
      ]
    );
    const refundSaleId = refundSaleResult.rows[0].id;

    // Insert refund line items (negative quantities)
    for (const li of refundLineItems) {
      await client.query(
        `INSERT INTO pos_sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal, tax_amount, discount_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [refundSaleId, li.product_id, li.product_name, -li.quantity, li.unit_price, -li.subtotal, -li.tax_amount, 0]
      );
    }

    await client.query("COMMIT");

    await logAudit({ userId: user_id, userEmail: req.user.email, action: 'SALE_REFUNDED', entityType: 'sale', entityId: parseInt(id), details: { refund_number, refund_total, reason }, ip: req.ip });
    res.json({
      message: "Refund processed successfully",
      refund_amount: refund_total,
      refund_number,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    require('fs').appendFileSync('/tmp/pos_error.log', new Date().toISOString() + ' ERROR: ' + (error.stack || error) + '\n');
    console.error("Sale error:", error);
    res.status(500).json({ error: "Failed to process sale" });
  } finally {
    client.release();
  }
});

export default router;
