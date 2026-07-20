/**
 * LayoutContext tests
 * Covers: data loading, companyName/logo propagation, refreshLayout trigger
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

const mockCompanyData = {
  name: "Test Store",
  logo: "data:image/png;base64,abc",
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
  const { logo, companyName, loading } = useLayout();
  return (
    <div>
      <span data-testid="logo">{logo}</span>
      <span data-testid="name">{companyName}</span>
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

  it("provides companyName from API data", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("name").textContent).toBe("Test Store"));
  });

  it("provides logo from API data", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("logo").textContent).toBe(mockCompanyData.logo));
  });

  it("transitions from loading to ready", async () => {
    render(<LayoutProvider><Consumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("ready"));
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
});

// ─── RefreshLayout ────────────────────────────────────────────────────────────

function RefreshConsumer() {
  const { companyName, refreshLayout } = useLayout();
  return (
    <div>
      <span data-testid="name">{companyName}</span>
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
        name: callCount === 1 ? "First" : "Refreshed",
      });
    });

    render(<LayoutProvider><RefreshConsumer /></LayoutProvider>);
    await waitFor(() => expect(screen.getByTestId("name").textContent).toBe("First"));

    await act(async () => {
      screen.getByRole("button", { name: "Refresh" }).click();
    });

    await waitFor(() => expect(screen.getByTestId("name").textContent).toBe("Refreshed"));
    expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
