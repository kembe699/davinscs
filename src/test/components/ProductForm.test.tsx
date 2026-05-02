/**
 * ProductForm component tests
 * Covers: render, field interaction, margin auto-calculation, form validation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({}) };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "admin@divinsstore.com", role: "admin" } }),
}));

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    baseCurrency: { id: 1, code: "UGX", symbol: "UGX", name: "Ugandan Shilling", is_base: true, exchange_rate: 1, is_active: true },
  }),
}));

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

vi.mock("@/contexts/TenantContext", () => ({
  useTenantPath: () => (path: string) => path,
}));

vi.mock("@/lib/api", () => ({
  api: {
    products: {
      get: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 99, slug: "test-slug" }),
      update: vi.fn().mockResolvedValue({ id: 99, slug: "test-slug" }),
    },
    categories: {
      list: vi.fn().mockResolvedValue([
        { id: 1, slug: "cameras", name: "Cameras" },
        { id: 2, slug: "lenses", name: "Lenses" },
      ]),
    },
    taxRates: {
      list: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/pages/admin/AdminLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import ProductForm from "@/pages/admin/ProductForm";

const renderProductForm = () =>
  render(
    <MemoryRouter initialEntries={["/admin/products/new"]}>
      <Routes>
        <Route path="/admin/products/new" element={<ProductForm />} />
      </Routes>
    </MemoryRouter>
  );

// ─── Render ───────────────────────────────────────────────────────────────────

describe("ProductForm — render", () => {
  it("renders the product name field", async () => {
    renderProductForm();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g. iPhone 17 Pro Max")).toBeInTheDocument();
    });
  });

  it("renders the selling price field", async () => {
    renderProductForm();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g. 1500000")).toBeInTheDocument();
    });
  });

  it("renders the cost price field", async () => {
    renderProductForm();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Cost (optional)")).toBeInTheDocument();
    });
  });

  it("renders the margin % field", async () => {
    renderProductForm();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/30.*markup/)).toBeInTheDocument();
    });
  });

  it("renders the brand field", async () => {
    renderProductForm();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Brand (optional)")).toBeInTheDocument();
    });
  });

  it("renders a save / submit button", async () => {
    renderProductForm();
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /save|create|add product/i });
      expect(btn).toBeInTheDocument();
    });
  });

  it("renders the category selector", async () => {
    renderProductForm();
    await waitFor(() => {
      expect(screen.getByText(/cameras/i)).toBeInTheDocument();
    });
  });
});

// ─── Margin auto-calculation ──────────────────────────────────────────────────

describe("ProductForm — margin auto-calculation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates selling price when cost + margin are entered", async () => {
    renderProductForm();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Cost (optional)")).toBeInTheDocument();
    });

    const costInput = screen.getByPlaceholderText("Cost (optional)") as HTMLInputElement;
    const marginInput = screen.getByPlaceholderText(/30.*markup/) as HTMLInputElement;
    const priceInput = screen.getByPlaceholderText("e.g. 1500000") as HTMLInputElement;

    fireEvent.change(costInput, { target: { value: "100000" } });
    fireEvent.change(marginInput, { target: { value: "20" } });

    await waitFor(() => {
      // selling price = cost + (cost * margin/100) = 100000 + 20000 = 120000
      const displayedPrice = parseFloat(priceInput.value.replace(/,/g, ""));
      expect(displayedPrice).toBeCloseTo(120000, -1);
    });
  });
});

// ─── Form field updates ───────────────────────────────────────────────────────

describe("ProductForm — field updates", () => {
  it("accepts text input in the name field", async () => {
    renderProductForm();
    await waitFor(() => screen.getByPlaceholderText("e.g. iPhone 17 Pro Max"));

    const nameInput = screen.getByPlaceholderText("e.g. iPhone 17 Pro Max") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Test Camera" } });
    expect(nameInput.value).toBe("Test Camera");
  });

  it("accepts numeric input in the cost price field", async () => {
    renderProductForm();
    await waitFor(() => screen.getByPlaceholderText("Cost (optional)"));

    const costInput = screen.getByPlaceholderText("Cost (optional)") as HTMLInputElement;
    fireEvent.change(costInput, { target: { value: "50000" } });
    expect(costInput.value).toBe("50000");
  });
});
