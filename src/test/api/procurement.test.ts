/**
 * Procurement API integration tests
 * Covers: suppliers, purchase orders, GRNs, bills, payments
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getToken, apiGet, apiPost, apiPut, apiDelete } from "./helpers";

let token: string;
let createdPoId: number;

beforeAll(async () => {
  token = await getToken();
});

afterAll(async () => {
  // Clean up test PO if created
  if (createdPoId) {
    await apiDelete(`/api/procurement/purchase-orders/${createdPoId}`, token).catch(() => {});
  }
});

// ─── Suppliers ────────────────────────────────────────────────────────────────

describe("GET /api/procurement/suppliers", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/procurement/suppliers", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("contains exactly one supplier: Nile Hive Concept Co. Ltd", async () => {
    const { body } = await apiGet("/api/procurement/suppliers", token);
    expect(body.length).toBe(1);
    expect(body[0].name).toBe("Nile Hive Concept Co. Ltd");
  });

  it("supplier has required fields", async () => {
    const { body } = await apiGet("/api/procurement/suppliers", token);
    const s = body[0];
    expect(s).toHaveProperty("id");
    expect(s).toHaveProperty("name");
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/procurement/suppliers");
    expect(status).toBe(401);
  });
});

// ─── Purchase Orders ──────────────────────────────────────────────────────────

describe("GET /api/procurement/purchase-orders", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/procurement/purchase-orders", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/procurement/purchase-orders");
    expect(status).toBe(401);
  });

  it("each PO has required fields when list is non-empty", async () => {
    const { body } = await apiGet("/api/procurement/purchase-orders", token);
    if (body.length === 0) return;
    const po = body[0];
    expect(po).toHaveProperty("id");
    expect(po).toHaveProperty("po_number");
    expect(po).toHaveProperty("status");
    expect(po).toHaveProperty("total_amount");
  });

  it("each PO includes currency fields", async () => {
    const { body } = await apiGet("/api/procurement/purchase-orders", token);
    if (body.length === 0) return;
    const po = body[0];
    expect(po).toHaveProperty("currency_code");
    expect(po).toHaveProperty("currency_symbol");
  });
});

describe("POST /api/procurement/purchase-orders", () => {
  it("returns 400 when supplier_id is missing", async () => {
    const { status } = await apiPost(
      "/api/procurement/purchase-orders",
      { order_date: "2025-01-01", items: [{ item_name: "Test Item", quantity: 1, unit_price: 5000 }] },
      token
    );
    expect(status).toBe(400);
  });

  it("returns 400 when items array is empty", async () => {
    const { body: suppliers } = await apiGet("/api/procurement/suppliers", token);
    const supplierId = suppliers[0]?.id;
    if (!supplierId) return;

    const { status } = await apiPost(
      "/api/procurement/purchase-orders",
      { supplier_id: supplierId, order_date: "2025-01-01", items: [] },
      token
    );
    expect(status).toBe(400);
  });

  it("creates a PO and returns 201 with PO data", async () => {
    const { body: suppliers } = await apiGet("/api/procurement/suppliers", token);
    const supplierId = suppliers[0]?.id;
    if (!supplierId) return;

    const { status, body } = await apiPost(
      "/api/procurement/purchase-orders",
      {
        supplier_id: supplierId,
        order_date: new Date().toISOString().split("T")[0],
        currency_code: "UGX",
        currency_symbol: "UGX",
        notes: "Test PO from automated test",
        items: [
          { item_name: "Test Tripod", quantity: 2, unit_price: 15000 },
        ],
      },
      token
    );
    expect(status).toBe(201);
    expect(body).toHaveProperty("id");
    expect(body.po_number).toMatch(/^PO-/);
    createdPoId = body.id;
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiPost("/api/procurement/purchase-orders", {
      supplier_id: 1,
      order_date: "2025-01-01",
      items: [{ item_name: "x", quantity: 1, unit_price: 100 }],
    });
    expect(status).toBe(401);
  });
});

describe("GET /api/procurement/purchase-orders/:id", () => {
  it("returns 200 with items array for a valid PO", async () => {
    if (!createdPoId) return;
    const { status, body } = await apiGet(
      `/api/procurement/purchase-orders/${createdPoId}`,
      token
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("returns 404 for a non-existent PO", async () => {
    const { status } = await apiGet("/api/procurement/purchase-orders/999999", token);
    expect(status).toBe(404);
  });
});

// ─── Bills ────────────────────────────────────────────────────────────────────

describe("GET /api/procurement/bills", () => {
  it("returns 200 with an array (may be empty)", async () => {
    const { status, body } = await apiGet("/api/procurement/bills", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/procurement/bills");
    expect(status).toBe(401);
  });
});

// ─── Payments ─────────────────────────────────────────────────────────────────

describe("GET /api/procurement/payments", () => {
  it("returns 200 with an array (may be empty)", async () => {
    const { status, body } = await apiGet("/api/procurement/payments", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/procurement/payments");
    expect(status).toBe(401);
  });
});

// ─── GRNs ─────────────────────────────────────────────────────────────────────

describe("GET /api/procurement/grn", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/procurement/grn", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/procurement/grn");
    expect(status).toBe(401);
  });
});
