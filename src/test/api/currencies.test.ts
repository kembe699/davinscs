/**
 * Currencies & Exchange Rates API integration tests
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getToken, apiGet } from "./helpers";

let token: string;

beforeAll(async () => {
  token = await getToken();
});

// ─── Currencies ───────────────────────────────────────────────────────────────

describe("GET /api/currencies", () => {
  it("returns 200 with an array of currencies", async () => {
    const { status, body } = await apiGet("/api/currencies");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("each currency has required fields", async () => {
    const { body } = await apiGet("/api/currencies");
    const c = body[0];
    expect(c).toHaveProperty("id");
    expect(c).toHaveProperty("code");
    expect(c).toHaveProperty("name");
    expect(c).toHaveProperty("symbol");
    expect(c).toHaveProperty("is_base");
    expect(c).toHaveProperty("exchange_rate");
    expect(c).toHaveProperty("is_active");
  });

  it("exactly one currency has is_base = true", async () => {
    const { body } = await apiGet("/api/currencies");
    const baseCurrencies = body.filter((c: any) => c.is_base === true);
    expect(baseCurrencies.length).toBe(1);
  });

  it("is accessible without auth", async () => {
    const { status } = await apiGet("/api/currencies");
    expect(status).toBe(200);
  });
});

describe("GET /api/currencies/base", () => {
  it("returns 200 with the base currency object", async () => {
    const { status, body } = await apiGet("/api/currencies/base");
    expect(status).toBe(200);
    expect(body.is_base).toBe(true);
    expect(body).toHaveProperty("code");
    expect(body).toHaveProperty("symbol");
  });
});

// ─── Exchange Rates ───────────────────────────────────────────────────────────

describe("GET /api/exchange-rates", () => {
  it("returns 200 with an array (may be empty)", async () => {
    const { status, body } = await apiGet("/api/exchange-rates", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("GET /api/exchange-rates/active/:fromId/:toId", () => {
  it("returns 200 (with null or rate object) for any ID pair — never 404", async () => {
    const { status } = await apiGet("/api/exchange-rates/active/1/2", token);
    expect(status).toBe(200);
  });

  it("returns null when no active rate exists for the pair", async () => {
    const { status, body } = await apiGet(
      "/api/exchange-rates/active/9999/8888",
      token
    );
    expect(status).toBe(200);
    expect(body).toBeNull();
  });
});
