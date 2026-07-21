/**
 * Company Settings API integration tests
 * Covers: GET company, POST company
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getToken, apiGet, apiPost } from "./helpers";

let token: string;
let originalData: any;

beforeAll(async () => {
  token = await getToken();
  const { body } = await apiGet("/api/company");
  originalData = body;
});

// ─── GET /api/company ──────────────────────────────────────────────────────────

describe("GET /api/company", () => {
  it("returns 200 with company object", async () => {
    const { status, body } = await apiGet("/api/company");
    expect(status).toBe(200);
    expect(body).not.toBeNull();
  });

  it("includes required fields: name, logo", async () => {
    const { body } = await apiGet("/api/company");
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("logo");
  });

  it("includes brand color fields", async () => {
    const { body } = await apiGet("/api/company");
    expect(body).toHaveProperty("brand_color_start");
    expect(body).toHaveProperty("brand_color_mid");
    expect(body).toHaveProperty("brand_color_end");
  });

  it("is accessible without auth token", async () => {
    const { status } = await apiGet("/api/company");
    expect(status).toBe(200);
  });
});

// ─── POST /api/company ────────────────────────────────────────────────────────

describe("POST /api/company", () => {
  it("returns 401 without auth token", async () => {
    const { status } = await apiPost("/api/company", { name: "Hack Attempt" });
    expect(status).toBe(401);
  });

  it("returns 400 when company name is missing", async () => {
    const { status } = await apiPost(
      "/api/company",
      { logo: "test-logo.png" },
      token
    );
    expect(status).toBe(400);
  });

  it("saves and returns updated company name", async () => {
    const payload = { ...(originalData || {}), name: originalData?.name || "Test Store" };
    const { status, body } = await apiPost("/api/company", payload, token);
    expect(status).toBe(200);
    expect(body.name).toBe(payload.name);
  });

  it("returns brand colors in response", async () => {
    const payload = {
      ...(originalData || {}),
      name: originalData?.name || "Test Store",
      brand_color_start: "#001122",
      brand_color_mid: "#334455",
      brand_color_end: "#667788",
    };
    const { body } = await apiPost("/api/company", payload, token);
    expect(body.brand_color_start).toBe("#001122");
    expect(body.brand_color_mid).toBe("#334455");
    expect(body.brand_color_end).toBe("#667788");
  });
});
