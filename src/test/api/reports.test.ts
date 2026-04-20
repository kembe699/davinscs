/**
 * Reports API integration tests
 * Covers: expenses summary, by-category, cash-drawer, income-statement, sales reports
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getToken, apiGet } from "./helpers";

let token: string;
const today = new Date().toISOString().split("T")[0];
const yearStart = `${new Date().getFullYear()}-01-01`;

beforeAll(async () => {
  token = await getToken();
});

// ─── Expenses Summary ─────────────────────────────────────────────────────────

describe("GET /api/reports/expenses/summary", () => {
  it("returns 200 with summary object", async () => {
    const { status, body } = await apiGet(
      `/api/reports/expenses/summary?start_date=${yearStart}&end_date=${today}`,
      token
    );
    expect(status).toBe(200);
    expect(body).toHaveProperty("accounting_expenses");
    expect(body).toHaveProperty("cash_drawer_expenses");
    expect(body).toHaveProperty("procurement_payments");
    expect(body).toHaveProperty("total_expenses");
  });

  it("total_expenses equals sum of all three sources", async () => {
    const { body } = await apiGet(
      `/api/reports/expenses/summary?start_date=${yearStart}&end_date=${today}`,
      token
    );
    const expected =
      Number(body.accounting_expenses) +
      Number(body.cash_drawer_expenses) +
      Number(body.procurement_payments);
    expect(Number(body.total_expenses)).toBeCloseTo(expected, 0);
  });

  it("all monetary fields are non-negative numbers", async () => {
    const { body } = await apiGet(
      `/api/reports/expenses/summary?start_date=${yearStart}&end_date=${today}`,
      token
    );
    expect(Number(body.accounting_expenses)).toBeGreaterThanOrEqual(0);
    expect(Number(body.cash_drawer_expenses)).toBeGreaterThanOrEqual(0);
    expect(Number(body.procurement_payments)).toBeGreaterThanOrEqual(0);
    expect(Number(body.total_expenses)).toBeGreaterThanOrEqual(0);
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/reports/expenses/summary");
    expect(status).toBe(401);
  });

  it("works without date params (defaults to last 30 days)", async () => {
    const { status } = await apiGet("/api/reports/expenses/summary", token);
    expect(status).toBe(200);
  });
});

// ─── Expenses by Category ─────────────────────────────────────────────────────

describe("GET /api/reports/expenses/by-category", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet(
      `/api/reports/expenses/by-category?start_date=${yearStart}&end_date=${today}`,
      token
    );
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("each row has code, category_name, transaction_count, total_amount", async () => {
    const { body } = await apiGet(
      `/api/reports/expenses/by-category?start_date=${yearStart}&end_date=${today}`,
      token
    );
    if (body.length === 0) return;
    const row = body[0];
    expect(row).toHaveProperty("code");
    expect(row).toHaveProperty("category_name");
    expect(row).toHaveProperty("transaction_count");
    expect(row).toHaveProperty("total_amount");
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/reports/expenses/by-category");
    expect(status).toBe(401);
  });
});

// ─── Cash Drawer Expenses ─────────────────────────────────────────────────────

describe("GET /api/reports/expenses/cash-drawer", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet(
      `/api/reports/expenses/cash-drawer?start_date=${yearStart}&end_date=${today}`,
      token
    );
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/reports/expenses/cash-drawer");
    expect(status).toBe(401);
  });
});

// ─── Income Statement ─────────────────────────────────────────────────────────

describe("GET /api/reports/income-statement", () => {
  it("returns 200 with the full P&L structure", async () => {
    const { status, body } = await apiGet(
      `/api/reports/income-statement?start_date=${yearStart}&end_date=${today}`,
      token
    );
    expect(status).toBe(200);
    expect(body).toHaveProperty("revenue");
    expect(body).toHaveProperty("total_revenue");
    expect(body).toHaveProperty("expenses");
    expect(body).toHaveProperty("total_expenses");
    expect(body).toHaveProperty("net_income");
  });

  it("revenue and expenses are arrays", async () => {
    const { body } = await apiGet(
      `/api/reports/income-statement?start_date=${yearStart}&end_date=${today}`,
      token
    );
    expect(Array.isArray(body.revenue)).toBe(true);
    expect(Array.isArray(body.expenses)).toBe(true);
  });

  it("net_income = gross_profit - total_expenses (COGS deducted first)", async () => {
    const { body } = await apiGet(
      `/api/reports/income-statement?start_date=${yearStart}&end_date=${today}`,
      token
    );
    // gross_profit = total_revenue - cogs; net_income = gross_profit - total_expenses
    const grossProfit = Number(body.gross_profit ?? (Number(body.total_revenue) - Number(body.cogs ?? 0)));
    const expected = grossProfit - Number(body.total_expenses);
    expect(Number(body.net_income)).toBeCloseTo(expected, 0);
  });

  it("each revenue line has label and amount", async () => {
    const { body } = await apiGet(
      `/api/reports/income-statement?start_date=${yearStart}&end_date=${today}`,
      token
    );
    for (const line of body.revenue) {
      expect(line).toHaveProperty("label");
      expect(line).toHaveProperty("amount");
      expect(Number(line.amount)).toBeGreaterThanOrEqual(0);
    }
  });

  it("each expense line has label and amount", async () => {
    const { body } = await apiGet(
      `/api/reports/income-statement?start_date=${yearStart}&end_date=${today}`,
      token
    );
    for (const line of body.expenses) {
      expect(line).toHaveProperty("label");
      expect(line).toHaveProperty("amount");
      expect(Number(line.amount)).toBeGreaterThanOrEqual(0);
    }
  });

  it("uses default dates when none provided", async () => {
    const { status } = await apiGet("/api/reports/income-statement", token);
    expect(status).toBe(200);
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/reports/income-statement");
    expect(status).toBe(401);
  });
});

// ─── Sales Reports ────────────────────────────────────────────────────────────

describe("GET /api/reports/sales/daily", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet(
      `/api/reports/sales/daily?start_date=${yearStart}&end_date=${today}`,
      token
    );
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("each daily row has date and revenue fields", async () => {
    const { body } = await apiGet(
      `/api/reports/sales/daily?start_date=${yearStart}&end_date=${today}`,
      token
    );
    if (body.length === 0) return;
    const row = body[0];
    expect(row).toHaveProperty("date");
    expect(row).toHaveProperty("total_revenue");
    expect(row).toHaveProperty("total_sales");
  });

  it("returns 401 without auth", async () => {
    const { status } = await apiGet("/api/reports/sales/daily");
    expect(status).toBe(401);
  });
});

describe("GET /api/reports/sales/by-product", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet(
      `/api/reports/sales/by-product?start_date=${yearStart}&end_date=${today}`,
      token
    );
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("GET /api/reports/sales/by-user", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet(
      `/api/reports/sales/by-user?start_date=${yearStart}&end_date=${today}`,
      token
    );
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

// ─── Inventory Reports ────────────────────────────────────────────────────────

describe("GET /api/reports/inventory/low-stock", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/reports/inventory/low-stock", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("GET /api/reports/inventory/out-of-stock", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet("/api/reports/inventory/out-of-stock", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("GET /api/reports/inventory/stock-movement", () => {
  it("returns 200 with an array", async () => {
    const { status, body } = await apiGet(
      `/api/reports/inventory/stock-movement?start_date=${yearStart}&end_date=${today}`,
      token
    );
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});
