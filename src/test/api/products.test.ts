/**
 * Products API integration tests
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getToken, apiGet, apiPost, apiPut, apiDelete } from "./helpers";

let token: string;
let createdProductId: number;
const testSlug = `test-product-${Date.now()}`;

beforeAll(async () => {
  token = await getToken();
});

afterAll(async () => {
  if (createdProductId) {
    await apiDelete(`/api/products/${createdProductId}`, token);
  }
});

// ─── List ─────────────────────────────────────────────────────────────────────

describe("GET /api/products", () => {
  it("returns 200 with an array of products", async () => {
    const { status, body } = await apiGet("/api/products");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("each product has required fields", async () => {
    const { body } = await apiGet("/api/products");
    const p = body[0];
    expect(p).toHaveProperty("id");
    expect(p).toHaveProperty("name");
    expect(p).toHaveProperty("price");
    expect(p).toHaveProperty("slug");
    expect(p).toHaveProperty("category");
  });

  it("returns products without needing auth", async () => {
    const { status } = await apiGet("/api/products");
    expect(status).toBe(200);
  });
});

// ─── Get by slug ──────────────────────────────────────────────────────────────

describe("GET /api/products/:slug", () => {
  it("returns 200 with product data for a known slug", async () => {
    const listRes = await apiGet("/api/products");
    const slug = listRes.body[0]?.slug;
    if (!slug) return;
    const { status, body } = await apiGet(`/api/products/${slug}`);
    expect(status).toBe(200);
    expect(body.slug).toBe(slug);
  });

  it("returns 404 for an unknown slug", async () => {
    const { status } = await apiGet("/api/products/this-slug-does-not-exist-xyz");
    expect(status).toBe(404);
  });
});

// ─── Create ───────────────────────────────────────────────────────────────────

describe("POST /api/products", () => {
  it("returns 401 without auth token", async () => {
    const { status } = await apiPost("/api/products", {
      slug: testSlug,
      name: "Test Product",
      brand: "TestBrand",
      price: 10000,
      category: "cameras",
    });
    expect(status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const { status } = await apiPost(
      "/api/products",
      { name: "Missing Fields" },
      token
    );
    expect(status).toBe(400);
  });

  it("creates a product and returns 201 with the new product", async () => {
    const { status, body } = await apiPost(
      "/api/products",
      {
        slug: testSlug,
        name: "Test Camera Product",
        brand: "TestBrand",
        price: 50000,
        cost_price: 35000,
        category: "cameras",
        tag: "TEST",
        description: "Created by automated test",
        in_stock: true,
        is_featured: false,
      },
      token
    );
    expect(status).toBe(201);
    expect(body.slug).toBe(testSlug);
    expect(body.id).toBeDefined();
    createdProductId = body.id;
  });

  it("stores cost_price correctly", async () => {
    if (!createdProductId) return;
    const { body } = await apiGet(`/api/products/${testSlug}`);
    expect(Number(body.cost_price)).toBe(35000);
  });
});

// ─── Update ───────────────────────────────────────────────────────────────────

describe("PUT /api/products/:id", () => {
  it("returns 401 without auth token", async () => {
    if (!createdProductId) return;
    const { status } = await apiPut(`/api/products/${createdProductId}`, {
      name: "Updated Name",
    });
    expect(status).toBe(401);
  });

  it("updates a product and returns 200", async () => {
    if (!createdProductId) return;
    const { status, body } = await apiPut(
      `/api/products/${createdProductId}`,
      {
        slug: testSlug,
        name: "Updated Test Camera",
        brand: "UpdatedBrand",
        price: 60000,
        cost_price: 40000,
        category: "cameras",
        tag: "UPDATED",
        description: "Updated by test",
        in_stock: true,
        is_featured: false,
      },
      token
    );
    expect(status).toBe(200);
    expect(body.name).toBe("Updated Test Camera");
    expect(Number(body.cost_price)).toBe(40000);
  });
});

// ─── Delete ───────────────────────────────────────────────────────────────────

describe("DELETE /api/products/:id", () => {
  it("returns 401 without auth token", async () => {
    if (!createdProductId) return;
    const { status } = await apiDelete(`/api/products/${createdProductId}`);
    expect(status).toBe(401);
  });

  it("deletes the test product and returns 200", async () => {
    if (!createdProductId) return;
    const { status } = await apiDelete(`/api/products/${createdProductId}`, token);
    expect(status).toBe(200);
    createdProductId = 0;
  });
});
