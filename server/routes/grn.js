import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET all GRNs
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        grn.id,
        grn.grn_number,
        grn.po_id,
        grn.supplier_id,
        grn.received_date,
        grn.status,
        grn.notes,
        grn.created_at,
        grn.updated_at,
        s.name as supplier_name,
        po.po_number,
        COUNT(gi.id) as item_count
      FROM goods_received_notes grn
      LEFT JOIN suppliers s ON grn.supplier_id = s.id
      LEFT JOIN purchase_orders po ON grn.po_id = po.id
      LEFT JOIN grn_items gi ON grn.id = gi.grn_id
      GROUP BY grn.id, grn.grn_number, grn.po_id, grn.supplier_id, grn.received_date, 
               grn.status, grn.notes, grn.created_at, grn.updated_at, s.name, po.po_number
      ORDER BY grn.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET single GRN with items
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const grnResult = await pool.query(`
      SELECT 
        grn.*,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        s.address as supplier_address,
        po.po_number
      FROM goods_received_notes grn
      LEFT JOIN suppliers s ON grn.supplier_id = s.id
      LEFT JOIN purchase_orders po ON grn.po_id = po.id
      WHERE grn.id = $1
    `, [req.params.id]);
    
    if (!grnResult.rows[0]) {
      return res.status(404).json({ error: "GRN not found" });
    }
    
    const itemsResult = await pool.query(`
      SELECT 
        gi.*,
        p.name as product_name,
        p.barcode,
        poi.item_name
      FROM grn_items gi
      LEFT JOIN products p ON gi.product_id = p.id
      LEFT JOIN purchase_order_items poi ON gi.po_item_id = poi.id
      WHERE gi.grn_id = $1
    `, [req.params.id]);
    
    res.json({
      ...grnResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST create new GRN
router.post("/", requireAuth, async (req, res) => {
  const { po_id, received_date, items, notes } = req.body;
  
  if (!po_id || !received_date || !items || items.length === 0) {
    return res.status(400).json({ error: "PO, date, and items required" });
  }
  
  const client = await getSchemaClient();
  try {
    await client.query("BEGIN");
    
    // Get PO details
    const poResult = await client.query(
      "SELECT supplier_id FROM purchase_orders WHERE id = $1",
      [po_id]
    );
    
    if (!poResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Purchase order not found" });
    }
    
    const { supplier_id } = poResult.rows[0];
    const grnNumber = `GRN-${Date.now()}`;
    
    // Create GRN
    const grnResult = await client.query(`
      INSERT INTO goods_received_notes 
      (grn_number, po_id, supplier_id, received_date, notes, created_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'completed')
      RETURNING *
    `, [grnNumber, po_id, supplier_id, received_date, notes, req.user.id]);
    
    const grnId = grnResult.rows[0].id;
    let billTotal = 0;

    // Process each item
    for (const item of items) {
      const { po_item_id, received_quantity, notes: itemNotes, storage_location_id, show_in_pos } = item;
      // Receiving stock doesn't mean it's ready to sell — staff decide that
      // explicitly per item, and silence defaults to "not yet".
      const showInPos = show_in_pos === true;

      if (received_quantity <= 0) continue;

      if (!storage_location_id) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Which storage location is this item being received into?" });
      }

      // Get PO item details
      const poItemResult = await client.query(
        "SELECT product_id, item_name, quantity, unit_price, received_quantity, uom FROM purchase_order_items WHERE id = $1",
        [po_item_id]
      );

      if (!poItemResult.rows[0]) continue;

      const { product_id, item_name, quantity, unit_price, received_quantity: currentReceived, uom } = poItemResult.rows[0];
      const newReceived = currentReceived + received_quantity;

      if (newReceived > quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Cannot receive more than ordered for item` });
      }

      let finalProductId = product_id;

      // If item_name exists but no product_id, create new product
      if (!product_id && item_name) {
        const slug = item_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        // The PO item was added by typing a name rather than picking from
        // the catalog, so it may well match a product that already
        // exists — e.g. "Lemon" was typed again even though a Lemon
        // product is already in Products. Reuse it instead of trying to
        // insert a second row with the same slug, which trips
        // products_slug_key and fails the whole GRN with no indication
        // of why.
        const existingProduct = (await client.query(
          `SELECT id FROM products WHERE slug = $1`,
          [slug]
        )).rows[0];

        if (existingProduct) {
          finalProductId = existingProduct.id;
        } else {
          let defaultCategory = (await client.query(
            `SELECT slug FROM categories ORDER BY sort_order ASC, name ASC LIMIT 1`
          )).rows[0]?.slug;
          if (!defaultCategory) {
            defaultCategory = 'uncategorized';
            await client.query(
              `INSERT INTO categories (slug, name, sort_order, image_url) VALUES ($1,$2,$3,$4) ON CONFLICT (slug) DO NOTHING`,
              [defaultCategory, 'Uncategorized', 999, '']
            );
          }

          const productResult = await client.query(`
            INSERT INTO products
            (slug, name, brand, price, category, in_stock, quantity_on_hand, product_type, uom, storage_location_id, show_in_pos)
            VALUES ($1, $2, $3, $4, $5, true, 0, 'product', $6, $7, $8)
            RETURNING id
          `, [slug, item_name, '', unit_price, defaultCategory, uom || 'pcs', storage_location_id, showInPos]);

          finalProductId = productResult.rows[0].id;
        }

        // Update PO item with the resolved product_id either way
        await client.query(
          "UPDATE purchase_order_items SET product_id = $1 WHERE id = $2",
          [finalProductId, po_item_id]
        );
      }

      // Create GRN item
      await client.query(`
        INSERT INTO grn_items
        (grn_id, po_item_id, product_id, ordered_quantity, received_quantity, unit_price, notes, storage_location_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [grnId, po_item_id, finalProductId, quantity, received_quantity, unit_price, itemNotes, storage_location_id]);

      // Update PO item received quantity
      await client.query(
        "UPDATE purchase_order_items SET received_quantity = $1 WHERE id = $2",
        [newReceived, po_item_id]
      );

      // Update product inventory — this receipt's chosen location becomes the
      // product's current location (last-received-location wins; this app
      // tracks one location per product, not a per-location stock split).
      // show_in_pos is likewise set fresh from this receipt's choice every
      // time, not just when the product is first created — receiving stock
      // is exactly the moment staff decide whether it's ready to sell yet.
      await client.query(
        "UPDATE products SET quantity_on_hand = quantity_on_hand + $1, storage_location_id = $2, show_in_pos = $3 WHERE id = $4",
        [received_quantity, storage_location_id, showInPos, finalProductId]
      );

      // Create stock movement
      await client.query(`
        INSERT INTO stock_movements
        (product_id, movement_type, quantity, reference_type, reference_id, created_by)
        VALUES ($1, 'purchase', $2, 'grn', $3, $4)
      `, [finalProductId, received_quantity, grnId, req.user.id]);

      billTotal += received_quantity * unit_price;
    }

    // Auto-generate the supplier bill for what was actually received in this GRN
    let bill = null;
    if (billTotal > 0) {
      const billNumber = `BILL-${Date.now()}`;
      const dueDate = new Date(received_date);
      dueDate.setDate(dueDate.getDate() + 30);

      const billResult = await client.query(`
        INSERT INTO supplier_bills
        (bill_number, supplier_id, grn_id, po_id, bill_date, due_date, total_amount, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [billNumber, supplier_id, grnId, po_id, received_date, dueDate.toISOString().split('T')[0], billTotal, `Auto-generated from GRN ${grnNumber}`, req.user.id]);

      bill = billResult.rows[0];
    }

    // Update PO status
    const allItemsResult = await client.query(
      "SELECT SUM(quantity) as total_qty, SUM(received_quantity) as total_received FROM purchase_order_items WHERE po_id = $1",
      [po_id]
    );
    
    const { total_qty, total_received } = allItemsResult.rows[0];
    const newStatus = total_received >= total_qty ? 'completed' : 'partial';
    
    await client.query(
      "UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2",
      [newStatus, po_id]
    );
    
    await client.query("COMMIT");
    res.status(201).json({ ...grnResult.rows[0], bill });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// GET GRN print data
router.get("/:id/print", requireAuth, async (req, res) => {
  try {
    const grnResult = await pool.query(`
      SELECT 
        grn.*,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        s.address as supplier_address,
        po.po_number,
        u.email as created_by_email
      FROM goods_received_notes grn
      LEFT JOIN suppliers s ON grn.supplier_id = s.id
      LEFT JOIN purchase_orders po ON grn.po_id = po.id
      LEFT JOIN users u ON grn.created_by = u.id
      WHERE grn.id = $1
    `, [req.params.id]);
    
    if (!grnResult.rows[0]) {
      return res.status(404).json({ error: "GRN not found" });
    }
    
    const itemsResult = await pool.query(`
      SELECT 
        gi.*,
        COALESCE(p.name, poi.item_name) as product_name,
        p.barcode
      FROM grn_items gi
      LEFT JOIN products p ON gi.product_id = p.id
      LEFT JOIN purchase_order_items poi ON gi.po_item_id = poi.id
      WHERE gi.grn_id = $1
    `, [req.params.id]);
    
    res.json({
      ...grnResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
