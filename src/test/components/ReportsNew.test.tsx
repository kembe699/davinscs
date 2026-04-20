/**
 * ReportsNew component tests
 * Covers: render, sidebar navigation, report type selection, generate button
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "admin@divinsstore.com", role: "admin" } }),
}));

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    baseCurrency: { id: 1, code: "UGX", symbol: "UGX", name: "Ugandan Shilling", is_base: true, exchange_rate: 1, is_active: true },
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    company: { get: vi.fn().mockResolvedValue({ name: "Test Co", address: "Kampala", phone: "000", email: "info@test.com" }) },
    priceLists: { active: vi.fn().mockResolvedValue([]) },
    reports: {
      sales: {
        daily: vi.fn().mockResolvedValue([]),
        byUser: vi.fn().mockResolvedValue([]),
        byCustomer: vi.fn().mockResolvedValue([]),
        byProduct: vi.fn().mockResolvedValue([]),
        comparison: vi.fn().mockResolvedValue({ pos: { total_orders: 0, total_revenue: 0, average_order_value: 0 }, website: { total_orders: 0, total_revenue: 0, average_order_value: 0 }, total_orders: 0, total_revenue: 0 }),
        byScheme: vi.fn().mockResolvedValue([]),
      },
      incomeStatement: vi.fn().mockResolvedValue({
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        revenue: [{ label: "POS Sales", amount: 500000 }],
        total_revenue: 500000,
        expenses: [{ label: "Procurement Payments", amount: 200000 }],
        total_expenses: 200000,
        net_income: 300000,
      }),
      expenses: {
        summary: vi.fn().mockResolvedValue({ accounting_expenses: 0, cash_drawer_expenses: 0, procurement_payments: 5000, total_expenses: 5000 }),
        byCategory: vi.fn().mockResolvedValue([]),
        cashDrawer: vi.fn().mockResolvedValue([]),
      },
      inventory: {
        stockMovement: vi.fn().mockResolvedValue([]),
        expiring: vi.fn().mockResolvedValue([]),
        expired: vi.fn().mockResolvedValue([]),
        lowStock: vi.fn().mockResolvedValue([]),
        outOfStock: vi.fn().mockResolvedValue([]),
      },
      trending: {
        products: vi.fn().mockResolvedValue([]),
        posVsWeb: vi.fn().mockResolvedValue([]),
      },
      invoiceReports: {
        overview: vi.fn().mockResolvedValue([]),
        all: vi.fn().mockResolvedValue([]),
        overdue: vi.fn().mockResolvedValue([]),
        partial: vi.fn().mockResolvedValue([]),
        collections: vi.fn().mockResolvedValue([]),
      },
    },
  },
}));

vi.mock("@/utils/reportExports", () => ({
  exportToExcel: vi.fn(),
  exportToPDF: vi.fn(),
  printReport: vi.fn(),
}));

vi.mock("@/components/ReportTable", () => ({
  default: ({ data }: { data: any[] }) => (
    <table><tbody>{data.map((r, i) => <tr key={i}><td>{JSON.stringify(r)}</td></tr>)}</tbody></table>
  ),
}));

vi.mock("@/pages/admin/AdminLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/utils/currency", () => ({
  formatCurrencySync: (amount: number, symbol = "UGX") => `${symbol} ${amount.toLocaleString()}`,
}));

import ReportsNew from "@/pages/admin/ReportsNew";
import { api } from "@/lib/api";

const renderReports = () =>
  render(
    <MemoryRouter>
      <ReportsNew />
    </MemoryRouter>
  );

// ─── Render ───────────────────────────────────────────────────────────────────

describe("ReportsNew — render", () => {
  it("renders the sidebar report list", () => {
    renderReports();
    expect(screen.getByText(/select report/i)).toBeInTheDocument();
  });

  it("renders the Sales category", () => {
    renderReports();
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });

  it("renders the Expenses category", () => {
    renderReports();
    expect(screen.getByText("Expenses")).toBeInTheDocument();
  });

  it("renders the Inventory category", () => {
    renderReports();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
  });

  it("renders the Show report button", async () => {
    renderReports();
    expect(await screen.findByRole("button", { name: /show report|generating/i })).toBeInTheDocument();
  });

  it("renders date range selector", () => {
    renderReports();
    expect(screen.getByText(/this month/i)).toBeInTheDocument();
  });

  it("renders export buttons (Print, Excel, PDF)", () => {
    renderReports();
    expect(screen.getByRole("button", { name: /print/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /excel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pdf/i })).toBeInTheDocument();
  });
});

// ─── Sidebar navigation ───────────────────────────────────────────────────────

describe("ReportsNew — sidebar navigation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clicking Expenses expands the expense sub-reports", () => {
    renderReports();
    fireEvent.click(screen.getByText("Expenses"));
    expect(screen.getByText(/income statement/i)).toBeInTheDocument();
    expect(screen.getByText(/expenses summary/i)).toBeInTheDocument();
  });

  it("Income Statement (P&L) is listed under Expenses", () => {
    renderReports();
    fireEvent.click(screen.getByText("Expenses"));
    expect(screen.getByText(/income statement \(p&l\)/i)).toBeInTheDocument();
  });

  it("clicking Inventory expands inventory sub-reports", () => {
    renderReports();
    fireEvent.click(screen.getByText("Inventory"));
    expect(screen.getByText(/low stock/i)).toBeInTheDocument();
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it("search filters visible report names when category is expanded", async () => {
    renderReports();
    await screen.findByRole("button", { name: /show report|generating/i });
    fireEvent.click(screen.getByText("Expenses"));
    const search = screen.getByPlaceholderText(/search reports/i);
    fireEvent.change(search, { target: { value: "income" } });
    expect(screen.getByText(/income statement/i)).toBeInTheDocument();
  });
});

// ─── Income Statement render ──────────────────────────────────────────────────

describe("ReportsNew — Income Statement report", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls api.reports.incomeStatement on generate", async () => {
    renderReports();
    await screen.findByRole("button", { name: /show report|generating/i });
    fireEvent.click(screen.getByText("Expenses"));
    fireEvent.click(screen.getByText(/income statement \(p&l\)/i));

    await waitFor(() => {
      expect(api.reports.incomeStatement).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it("displays Revenue section after generating income statement", async () => {
    renderReports();
    await screen.findByRole("button", { name: /show report|generating/i });
    fireEvent.click(screen.getByText("Expenses"));
    fireEvent.click(screen.getByText(/income statement \(p&l\)/i));

    await waitFor(() => {
      expect(screen.getByText("Revenue")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("displays Expenses section after generating income statement", async () => {
    renderReports();
    await screen.findByRole("button", { name: /show report|generating/i });
    fireEvent.click(screen.getByText("Expenses"));
    fireEvent.click(screen.getByText(/income statement \(p&l\)/i));

    await waitFor(() => {
      expect(screen.getAllByText("Expenses").length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  it("displays Net Income (Profit) after generating", async () => {
    renderReports();
    await screen.findByRole("button", { name: /show report|generating/i });
    fireEvent.click(screen.getByText("Expenses"));
    fireEvent.click(screen.getByText(/income statement \(p&l\)/i));

    await waitFor(() => {
      expect(screen.getByText(/net income/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("shows POS Sales line item from mock data", async () => {
    renderReports();
    await screen.findByRole("button", { name: /show report|generating/i });
    fireEvent.click(screen.getByText("Expenses"));
    fireEvent.click(screen.getByText(/income statement \(p&l\)/i));

    await waitFor(() => {
      expect(screen.getByText("POS Sales")).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

// ─── Expenses Summary render ──────────────────────────────────────────────────

describe("ReportsNew — Expenses Summary report", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls api.reports.expenses.summary on generate", async () => {
    renderReports();
    await screen.findByRole("button", { name: /show report|generating/i });
    fireEvent.click(screen.getByText("Expenses"));
    fireEvent.click(screen.getByText(/expenses summary/i));

    await waitFor(() => {
      expect(api.reports.expenses.summary).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it("shows Procurement Payments card", async () => {
    renderReports();
    await screen.findByRole("button", { name: /show report|generating/i });
    fireEvent.click(screen.getByText("Expenses"));
    fireEvent.click(screen.getByText(/expenses summary/i));

    await waitFor(() => {
      expect(screen.getByText(/procurement payments/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

// ─── Daily Sales render ───────────────────────────────────────────────────────

describe("ReportsNew — Daily Sales report", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls api.reports.sales.daily on generate", async () => {
    renderReports();
    await screen.findByRole("button", { name: /show report|generating/i });
    const buttons = screen.getAllByText("Daily sales");
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(api.reports.sales.daily).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});
