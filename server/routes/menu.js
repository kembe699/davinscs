import express from "express";
import pool, { getSchemaClient } from "../db.js";
import { tenantStorage } from "../tenantStorage.js";
import { notifyAdmins } from "../utils/notifications.js";
import { roundToCents } from "../utils/money.js";
import { sendError } from "../utils/errorResponse.js";

const router = express.Router();

// Same shape as pos.js's own generateSaleNumber() — not exported from there,
// so duplicated here rather than reaching across route files for one helper.
function generateSaleNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const time = String(now.getHours()).padStart(2, "0") + String(now.getMinutes()).padStart(2, "0") + String(now.getSeconds()).padStart(2, "0");
  return `POS-${year}${month}${day}-${time}`;
}

async function resolveSchema(tenantSlug) {
  if (!tenantSlug) return null;
  const { rows } = await pool.query("SELECT schema_name FROM public.tenants WHERE tenant_slug = $1", [tenantSlug.toLowerCase().trim()]);
  return rows[0]?.schema_name || null;
}

// Public — the QR-code menu a diner sees after scanning the code on their
// table: this tenant's categories, in-stock products, and configured tables
// to order against. No auth — a customer's phone never has a session.
router.get("/:tenantSlug", async (req, res) => {
  const schema = await resolveSchema(req.params.tenantSlug);
  if (!schema) return res.status(404).json({ error: "Store not found" });

  try {
    let payload;
    await tenantStorage.run(schema, async () => {
      const companyRes = await pool.query("SELECT * FROM company_settings ORDER BY updated_at DESC LIMIT 1");
      const company = companyRes.rows[0] || {};

      const { rows: categories } = await pool.query(
        "SELECT id, slug, name FROM categories ORDER BY sort_order ASC, name ASC"
      );

      const { rows: products } = await pool.query(
        `SELECT id, slug, name, description, price, image_url, category, product_type,
                (quantity_on_hand - quantity_reserved) as available_stock
         FROM products
         WHERE in_stock = true
         ORDER BY category ASC, name ASC`
      );

      const { rows: tables } = await pool.query(
        "SELECT id, location, label, kind, amenities, description FROM restaurant_tables ORDER BY kind DESC, location ASC, label ASC"
      );

      payload = {
        company: {
          name: company.company_name || "",
          logo: company.logo_url || "",
          currency: company.currency || "UGX",
        },
        categories,
        products,
        tables,
      };
    });
    res.json(payload);
  } catch (err) {
    console.error("Public menu error:", err);
    return sendError(res, err);
  }
});

// Public — a diner sends their order. Creates a held sale tagged with their
// table, exactly like a cashier holding an order in the POS terminal — so it
// shows up as an "occupied" table there within the POS's existing 10s poll
// (see POSMain.tsx / the app's TablePickerSheet), with zero extra plumbing.
router.post("/:tenantSlug/order", async (req, res) => {
  const schema = await resolveSchema(req.params.tenantSlug);
  if (!schema) return res.status(404).json({ error: "Store not found" });

  const { table_id, items, customer_name, customer_phone, notes } = req.body;
  if (!table_id) return res.status(400).json({ error: "Please choose a table" });
  if (!items || !items.length) return res.status(400).json({ error: "Your order is empty" });

  let response;
  let notifyPayload = null;

  try {
    await tenantStorage.run(schema, async () => {
      const client = await getSchemaClient();
      try {
        await client.query("BEGIN");

        const { rows: placeRows } = await client.query("SELECT kind FROM restaurant_tables WHERE id = $1", [table_id]);
        if (!placeRows[0]) {
          await client.query("ROLLBACK");
          response = { status: 400, body: { error: "Please choose a table" } };
          return;
        }
        const isRoom = placeRows[0].kind === "room";

        // A table can only have one running order at a time — same guard
        // POST /api/pos/sales uses for a cashier-started hold. A hotel room is
        // different: a guest orders room service more than once and pays for
        // it all together, so a further order is added to the room's open one.
        const clash = await client.query(
          "SELECT id FROM pos_sales WHERE table_id = $1 AND status = 'held' AND voided = false",
          [table_id]
        );
        const addToSaleId = isRoom && clash.rows.length > 0 ? clash.rows[0].id : null;
        if (clash.rows.length > 0 && !addToSaleId) {
          await client.query("ROLLBACK");
          response = { status: 409, body: { error: "This table already has an order in progress — please ask a member of staff." } };
          return;
        }

        let subtotal = 0;
        let tax_amount = 0;
        const processedItems = [];

        for (const item of items) {
          const productResult = await client.query(
            `SELECT p.*, COALESCE(t.rate, 0) as tax_rate
             FROM products p
             LEFT JOIN tax_rates t ON p.tax_rate_id = t.id
             WHERE p.id = $1 AND p.in_stock = true`,
            [item.product_id]
          );
          if (!productResult.rows[0]) throw new Error(`One of the items in your order is no longer available`);
          const product = productResult.rows[0];

          const isService = product.product_type === "service";
          if (!isService) {
            const available = product.quantity_on_hand - product.quantity_reserved;
            if (available < item.quantity) throw new Error(`Sorry, we're out of enough ${product.name} for that quantity`);
          }

          const unit_price = Number(product.price);
          const item_subtotal = unit_price * item.quantity;
          const item_tax = roundToCents(item_subtotal * (product.tax_rate / 100));
          subtotal += item_subtotal;
          tax_amount += item_tax;

          processedItems.push({
            product_id: product.id,
            product_name: product.name,
            quantity: item.quantity,
            unit_price,
            tax_amount: item_tax,
            subtotal: item_subtotal,
          });

          if (!isService) {
            await client.query(
              "UPDATE products SET quantity_reserved = quantity_reserved + $1, updated_at = NOW() WHERE id = $2",
              [item.quantity, product.id]
            );
            await client.query(
              `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id, notes)
               VALUES ($1, 'hold', $2, 'pos_sale', 0, NULL, 'Online order (QR menu) held')`,
              [product.id, item.quantity]
            );
          }
        }

        const total_amount = subtotal + tax_amount;
        const sale_number = generateSaleNumber();

        // No payment_type_id yet (it's unpaid until a cashier completes it)
        // and no user_id/session_id — nobody on staff has rung this up.
        const { rows: cashCode } = await client.query("SELECT id FROM payment_types WHERE code ILIKE 'cash%' OR name ILIKE '%cash%' LIMIT 1");
        const saleResult = addToSaleId
          ? await client.query(
              `UPDATE pos_sales SET subtotal = subtotal + $1, tax_amount = tax_amount + $2, total_amount = total_amount + $3
               WHERE id = $4 RETURNING *`,
              [subtotal, tax_amount, total_amount, addToSaleId]
            )
          : await client.query(
          `INSERT INTO pos_sales
             (sale_number, customer_name, subtotal, tax_amount, discount_amount, total_amount,
              payment_type_id, payment_status, sale_type, status, notes, table_id)
           VALUES ($1,$2,$3,$4,0,$5,$6,'pending','regular','held',$7,$8)
           RETURNING *`,
          [
            sale_number,
            customer_name && customer_name.trim() ? customer_name.trim() : "QR menu order",
            subtotal,
            tax_amount,
            total_amount,
            cashCode[0]?.id || null,
            [customer_phone ? `Phone: ${customer_phone}` : null, notes].filter(Boolean).join(" — ") || null,
            table_id,
          ]
        );
        const sale = saleResult.rows[0];

        for (const item of processedItems) {
          await client.query(
            `INSERT INTO pos_sale_items (sale_id, product_id, product_name, quantity, unit_price, discount_amount, tax_amount, subtotal)
             VALUES ($1,$2,$3,$4,$5,0,$6,$7)`,
            [sale.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.tax_amount, item.subtotal]
          );
        }

        await client.query("COMMIT");

        const { rows: tableRows } = await pool.query("SELECT location, label FROM restaurant_tables WHERE id = $1", [table_id]);
        const tableLabel = tableRows[0] ? `${tableRows[0].location} · ${tableRows[0].label}` : `table #${table_id}`;
        notifyPayload = {
          type: "online_order",
          title: `${addToSaleId ? "More items" : "New order"} — ${tableLabel}`,
          body: `${processedItems.length} item(s) · ${total_amount.toLocaleString()}`,
          referenceType: "pos_sale",
          referenceId: sale.id,
        };
        response = { status: 201, body: { sale_number: sale.sale_number, total_amount } };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      if (notifyPayload) {
        await notifyAdmins(notifyPayload).catch(() => {});
      }
    });

    res.status(response.status).json(response.body);
  } catch (err) {
    console.error("Public order error:", err);
    res.status(400).json({ error: err.message || "Could not place your order" });
  }
});

export default router;
