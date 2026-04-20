/**
 * Company Settings API integration tests
 * Covers: GET company, POST company (general + storefront_settings)
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

  it("includes required fields: name, logo, site_layout", async () => {
    const { body } = await apiGet("/api/company");
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("logo");
    expect(body).toHaveProperty("site_layout");
  });

  it("includes storefront_settings as an object", async () => {
    const { body } = await apiGet("/api/company");
    expect(body).toHaveProperty("storefront_settings");
    expect(typeof body.storefront_settings).toBe("object");
    expect(body.storefront_settings).not.toBeNull();
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
      { site_layout: "tech_grid" },
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

  it("saves storefront_settings and returns them", async () => {
    const sf = {
      hero_tagline: "Test Tagline",
      hero_heading_1: "CAPTURE",
      hero_heading_2: "EVERYTHING",
      hero_subtext: "Test subtext",
      hero_brands_count: "50+",
      hero_products_count: "2,400+",
      about_tagline: "About Us",
      about_heading: "Built for creators",
      about_body: "Test body text",
      about_stat_1_value: "7+",
      about_stat_1_label: "Years",
      about_stat_2_value: "12K+",
      about_stat_2_label: "Customers",
      about_stat_3_value: "4.9★",
      about_stat_3_label: "Rating",
      ticker_bg: "#ffffff",
      ticker_text_color: "#000000",
      ticker_items: ["30-Day Returns", "Price Match Guarantee"],
    };
    const payload = { ...(originalData || {}), name: originalData?.name || "Test Store", storefront_settings: sf };
    const { status, body } = await apiPost("/api/company", payload, token);
    expect(status).toBe(200);
    expect(body.storefront_settings.hero_tagline).toBe("Test Tagline");
    expect(body.storefront_settings.ticker_bg).toBe("#ffffff");
    expect(body.storefront_settings.ticker_text_color).toBe("#000000");
    expect(Array.isArray(body.storefront_settings.ticker_items)).toBe(true);
    expect(body.storefront_settings.ticker_items).toContain("30-Day Returns");
  });

  it("GET returns the saved storefront_settings after POST", async () => {
    const sf = { hero_tagline: "Persisted Tagline" };
    await apiPost(
      "/api/company",
      { ...(originalData || {}), name: originalData?.name || "Test Store", storefront_settings: sf },
      token
    );
    const { body } = await apiGet("/api/company");
    expect(body.storefront_settings.hero_tagline).toBe("Persisted Tagline");
  });

  it("saves ticker_items array correctly", async () => {
    const items = ["Free Shipping", "Expert Support", "30-Day Returns"];
    await apiPost(
      "/api/company",
      { ...(originalData || {}), name: originalData?.name || "Test Store", storefront_settings: { ticker_items: items } },
      token
    );
    const { body } = await apiGet("/api/company");
    expect(body.storefront_settings.ticker_items).toEqual(items);
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
