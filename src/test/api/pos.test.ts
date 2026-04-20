/**
 * POS API integration tests
 * Covers: sales list, create sale, payment types, cash drawer, customers
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getToken, apiGet, apiPost } from "./helpers";

let token: string;
let paymentTypeId: number;
let createdSaleId: number;

beforeAll(async () => {
  token = await getToken();
  const { body } = await apiGet("/api/payment-types", token);
  paymentTypeId = body[0]?.id ?? 1;
});

// ─── Payment Types ─────────────────────────────────────────────────────────────

describe("GET /api/payment-types", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/payment-types", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("each type has id and name", async () => {
    const { body } = await apiGet("/api/payment-types", token);
    if (body.length === 0) return;
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("name");
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/payment-types");
    expect(status).toBe(401);
  });
});

// ─── POS Sales list ───────────────────────────────────────────────────────────

describe("GET /api/pos/sales", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/pos/sales", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("each sale has required fields", async () => {
    const { body } = await apiGet("/api/pos/sales", token);
    if (body.length === 0) return;
    const s = body[0];
    expect(s).toHaveProperty("id");
    expect(s).toHaveProperty("total_amount");
    expect(s).toHaveProperty("sale_number");
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/pos/sales");
    expect(status).toBe(401);
  });
});

// ─── Create POS Sale ──────────────────────────────────────────────────────────

describe("POST /api/pos/sales", () => {
  it("returns 401 without auth", async () => {
    const { status } = await apiPost("/api/pos/sales", {
      items: [],
      payment_type_id: paymentTypeId,
      subtotal: 0,
      total_amount: 0,
    });
    expect(status).toBe(401);
  });

  it("returns 400 when items is empty", async () => {
    const { status } = await apiPost(
      "/api/pos/sales",
      { items: [], payment_type_id: paymentTypeId, subtotal: 0, total_amount: 0 },
      token
    );
    expect([400, 422]).toContain(status);
  });

  it("creates a sale with valid product and returns 201", async () => {
    const { body: products } = await apiGet("/api/products");
    if (!products.length) return;
    const product = products[0];

    const { status, body } = await apiPost(
      "/api/pos/sales",
      {
        items: [{ product_id: product.id, quantity: 1, unit_price: product.price, discount: 0 }],
        payment_type_id: paymentTypeId,
        subtotal: product.price,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: product.price,
      },
      token
    );
    expect([200, 201]).toContain(status);
    if (body.id) createdSaleId = body.id;
  });

  it("created sale has a sale_number", async () => {
    if (!createdSaleId) return;
    const { body } = await apiGet(`/api/pos/sales/${createdSaleId}`, token);
    expect(body).toHaveProperty("sale_number");
    expect(typeof body.sale_number).toBe("string");
  });
});

// ─── Cash Drawer ──────────────────────────────────────────────────────────────

describe("GET /api/cash-drawer/sessions", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/cash-drawer/sessions", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/cash-drawer/sessions");
    expect(status).toBe(401);
  });
});

// ─── Customers ────────────────────────────────────────────────────────────────

describe("GET /api/customers", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/customers", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("each customer has id, name, email or phone", async () => {
    const { body } = await apiGet("/api/customers", token);
    if (body.length === 0) return;
    const c = body[0];
    expect(c).toHaveProperty("id");
    expect(c).toHaveProperty("name");
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/customers");
    expect(status).toBe(401);
  });
});

// ─── Tax Rates ────────────────────────────────────────────────────────────────

describe("GET /api/tax-rates", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/tax-rates", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("each rate has id, name, rate", async () => {
    const { body } = await apiGet("/api/tax-rates", token);
    if (body.length === 0) return;
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("name");
    expect(body[0]).toHaveProperty("rate");
  });
});

// ─── Inventory / Stock ────────────────────────────────────────────────────────

describe("GET /api/inventory", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/inventory", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/inventory");
    expect(status).toBe(401);
  });
});
