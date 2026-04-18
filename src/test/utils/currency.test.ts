import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  formatCurrencySync,
  getCurrencySymbol,
  clearCurrencyCache,
  convertAmount,
} from "@/utils/currency";

// ─── formatCurrencySync ───────────────────────────────────────────────────────

describe("formatCurrencySync", () => {
  it("formats zero cents as 0.00 with symbol", () => {
    expect(formatCurrencySync(0, "UGX")).toBe("UGX 0.00");
  });

  it("divides cents by 100 before displaying", () => {
    expect(formatCurrencySync(100000, "UGX")).toBe("UGX 1,000.00");
  });

  it("shows two decimal places by default", () => {
    expect(formatCurrencySync(150, "$")).toBe("$ 1.50");
  });

  it("hides decimals when showDecimals=false", () => {
    expect(formatCurrencySync(100000, "UGX", false)).toBe("UGX 1,000");
  });

  it("uses UGX as default symbol when none provided", () => {
    expect(formatCurrencySync(5000)).toBe("UGX 50.00");
  });

  it("handles large amounts with correct thousand separators", () => {
    expect(formatCurrencySync(500000000, "UGX", false)).toBe("UGX 5,000,000");
  });

  it("handles negative amounts", () => {
    const result = formatCurrencySync(-10000, "UGX", false);
    expect(result).toContain("-100");
  });
});

// ─── getCurrencySymbol ────────────────────────────────────────────────────────

describe("getCurrencySymbol", () => {
  beforeEach(() => {
    clearCurrencyCache();
  });

  it("returns the code itself when cache is empty (no currencies loaded)", () => {
    expect(getCurrencySymbol("USD")).toBe("USD");
  });
});

// ─── clearCurrencyCache ───────────────────────────────────────────────────────

describe("clearCurrencyCache", () => {
  it("runs without throwing", () => {
    expect(() => clearCurrencyCache()).not.toThrow();
  });

  it("can be called multiple times safely", () => {
    clearCurrencyCache();
    clearCurrencyCache();
    expect(getCurrencySymbol("EUR")).toBe("EUR");
  });
});

// ─── convertAmount ────────────────────────────────────────────────────────────

describe("convertAmount", () => {
  beforeEach(() => {
    clearCurrencyCache();
    // Mock fetch so convertAmount can load currencies
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, code: "UGX", name: "Ugandan Shilling", symbol: "UGX", is_base: true,  exchange_rate: 1,    is_active: true },
        { id: 2, code: "USD", name: "US Dollar",        symbol: "$",   is_base: false, exchange_rate: 0.00027, is_active: true },
      ],
    } as Response);
  });

  it("returns the same amount when converting from and to the same currency", async () => {
    const result = await convertAmount(1000, "UGX", "UGX");
    expect(result).toBeCloseTo(1000, 2);
  });

  it("converts UGX to USD using exchange rate", async () => {
    const result = await convertAmount(3700, "UGX", "USD");
    expect(result).toBeCloseTo(3700 * 0.00027, 4);
  });

  it("throws when fromCode is unknown", async () => {
    await expect(convertAmount(100, "XYZ", "UGX")).rejects.toThrow();
  });

  it("throws when toCode is unknown", async () => {
    await expect(convertAmount(100, "UGX", "ABC")).rejects.toThrow();
  });
});
