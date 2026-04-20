/**
 * LayoutContext tests
 * Covers: data loading, storefront_settings propagation, refreshLayout trigger
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

const mockCompanyData = {
  name: "Test Store",
  logo: "data:image/png;base64,abc",
  site_layout: "tech_grid",
  brand_color_start: "#004A99",
  brand_color_mid: "#008B8B",
  brand_color_end: "#32CD32",
  storefront_settings: {
    hero_tagline: "Test Tagline",
    hero_heading_1: "CAPTURE",
    ticker_bg: "#ffffff",
    ticker_text_color: "#000000",
    ticker_items: ["Item A", "Item B"],
  },
};

const mockGet = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  api: {
    company: { get: mockGet },
  },
}));

import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";

// Helper consumer component
function Consumer() {
  const { layout, companyName, storefrontSettings, loading } = useLayout();
  return (
    <div>
      <span data-testid="layout">{layout}</span>
      <span data-testid="name">{companyName}</span>
      <span data-testid="tagline">{storefrontSettings.hero_tagline ?? "none"}</span>
      <span data-testid="ticker-bg">{storefrontSettings.ticker_bg ?? "none"}</span>
      <span data-testid="ticker-items">{(storefrontSettings.ticker_items ?? []).join(",")}</span>
      <span data-testid="loading">{loading ? "loading" : "ready"}</span>
    </div>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LayoutContext — initial load", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(mockCompanyData);
  });

  it("provides layout from API data", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("layout").textContent).toBe("tech_grid"));
  });

  it("provides companyName from API data", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("name").textContent).toBe("Test Store"));
  });

  it("provides storefrontSettings.hero_tagline", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("tagline").textContent).toBe("Test Tagline"));
  });

  it("provides storefrontSettings.ticker_bg", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("ticker-bg").textContent).toBe("#ffffff"));
  });

  it("provides storefrontSettings.ticker_items as array", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("ticker-items").textContent).toBe("Item A,Item B"));
  });

  it("transitions from loading to ready", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("ready"));
  });
});

describe("LayoutContext — empty storefront_settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ ...mockCompanyData, storefront_settings: null });
  });

  it("defaults storefrontSettings to empty object when null", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("tagline").textContent).toBe("none");
      expect(screen.getByTestId("ticker-bg").textContent).toBe("none");
    });
  });
});

describe("LayoutContext — API failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockRejectedValue(new Error("Network error"));
  });

  it("still transitions to ready state after API error", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("ready"));
  });

  it("provides default layout on API failure", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("layout").textContent).toBe("tech_grid"));
  });
});

// ─── RefreshLayout ────────────────────────────────────────────────────────────

function RefreshConsumer() {
  const { storefrontSettings, refreshLayout } = useLayout();
  return (
    <div>
      <span data-testid="tagline">{storefrontSettings.hero_tagline ?? "none"}</span>
      <button onClick={refreshLayout}>Refresh</button>
    </div>
  );
}

describe("LayoutContext — refreshLayout", () => {
  it("re-fetches data when refreshLayout is called", async () => {
    let callCount = 0;
    mockGet.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ...mockCompanyData,
        storefront_settings: { hero_tagline: callCount === 1 ? "First" : "Refreshed" },
      });
    });

    render(<LayoutProvider><RefreshConsumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("tagline").textContent).toBe("First"));

    await act(async () => {
      screen.getByRole("button", { name: "Refresh" }).click();
    });

    await waitFor(() => expect(screen.getByTestId("tagline").textContent).toBe("Refreshed"));
    expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
