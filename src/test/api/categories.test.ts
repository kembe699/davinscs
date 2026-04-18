/**
 * Categories & Dashboard API integration tests
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getToken, apiGet, apiPost, apiPut, apiDelete } from "./helpers";

let token: string;
let createdCategoryId: number;

beforeAll(async () => {
  token = await getToken();
});

// ─── Categories ───────────────────────────────────────────────────────────────

describe("GET /api/categories", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/categories");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("each category has id, name, slug", async () => {
    const { body } = await apiGet("/api/categories");
    if (body.length === 0) return;
    const c = body[0];
    expect(c).toHaveProperty("id");
    expect(c).toHaveProperty("name");
    expect(c).toHaveProperty("slug");
  });

  it("is accessible without auth", async () => {
    const { status } = await apiGet("/api/categories");
    expect(status).toBe(200);
  });
});

describe("POST /api/categories", () => {
  it("returns 401 without auth", async () => {
    const { status } = await apiPost("/api/categories", { name: "Test", slug: "test-cat" });
    expect(status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const { status } = await apiPost("/api/categories", { slug: "missing-name" }, token);
    expect(status).toBe(400);
  });

  it("creates a category and returns 201", async () => {
    const slug = `test-cat-${Date.now()}`;
    const { status, body } = await apiPost(
      "/api/categories",
      { name: "Test Category", slug },
      token
    );
    expect(status).toBe(201);
    expect(body.name).toBe("Test Category");
    createdCategoryId = body.id;
  });
});

describe("PUT /api/categories/:id", () => {
  it("updates the category name", async () => {
    if (!createdCategoryId) return;
    const { status, body } = await apiPut(
      `/api/categories/${createdCategoryId}`,
      { name: "Updated Test Category", slug: `updated-cat-${Date.now()}` },
      token
    );
    expect(status).toBe(200);
    expect(body.name).toBe("Updated Test Category");
  });
});

describe("DELETE /api/categories/:id", () => {
  it("deletes the test category", async () => {
    if (!createdCategoryId) return;
    const { status } = await apiDelete(`/api/categories/${createdCategoryId}`, token);
    expect([200, 204]).toContain(status);
  });
});

// ─── Dashboard ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/dashboard/sales-summary", () => {
  it("returns 200 with summary stats", async () => {
    const { status, body } = await apiGet("/api/dashboard/sales-summary", token);
    expect(status).toBe(200);
    expect(body).toBeDefined();
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/dashboard/sales-summary");
    expect(status).toBe(401);
  });

  it("GET /api/dashboard/top-products returns 200", async () => {
    const { status, body } = await apiGet("/api/dashboard/top-products", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────

describe("GET /api/users", () => {
  it("returns 200 with array of users", async () => {
    const { status, body } = await apiGet("/api/users", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("each user has id and email", async () => {
    const { body } = await apiGet("/api/users", token);
    const u = body[0];
    expect(u).toHaveProperty("id");
    expect(u).toHaveProperty("email");
  });

  it("password_hash is NOT exposed in the response", async () => {
    const { body } = await apiGet("/api/users", token);
    body.forEach((u: any) => {
      expect(u).not.toHaveProperty("password_hash");
    });
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/users");
    expect(status).toBe(401);
  });
});

// ─── Company Settings ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/company", () => {
  it("returns 200 with company data (no auth required)", async () => {
    const { status, body } = await apiGet("/api/company");
    expect(status).toBe(200);
    // Returns null if no company row exists, or object with name field
    if (body !== null) {
      expect(body).toHaveProperty("name");
    }
  });

  it("returns 401 when POST without auth", async () => {
    const { status } = await apiPost("/api/company", { name: "Test" });
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
});

// ─── Payment Types ────────────────────────────────────────────────────────────

describe("GET /api/payment-types", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/payment-types", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});
