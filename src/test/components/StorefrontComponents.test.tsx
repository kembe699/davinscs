/**
 * Storefront component tests
 * Covers: HeroSection, AboutSection, MarqueeBanner — dynamic content via LayoutContext
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Shared mocks ──────────────────────────────────────────────────────────────

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    baseCurrency: { id: 1, code: "UGX", symbol: "UGX", name: "Ugandan Shilling", is_base: true, exchange_rate: 1, is_active: true },
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    products: { list: vi.fn().mockResolvedValue([]) },
    company: { get: vi.fn().mockResolvedValue(null) },
  },
}));

// ─── LayoutContext mock factory ───────────────────────────────────────────────

function mockLayout(sf: Record<string, any> = {}) {
  vi.doMock("@/contexts/LayoutContext", () => ({
    useLayout: () => ({
      layout: "tech_grid",
      logo: "",
      companyName: "Test Co",
      storefrontSettings: sf,
      loading: false,
      refreshLayout: vi.fn(),
    }),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MarqueeBanner
// ═══════════════════════════════════════════════════════════════════════════════

describe("MarqueeBanner — defaults", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLayout({});
  });

  it("renders default ticker items when storefront_settings is empty", async () => {
    const { default: MarqueeBanner } = await import("@/components/MarqueeBanner");
    render(<MarqueeBanner />);
    expect(screen.getAllByText(/free shipping/i).length).toBeGreaterThan(0);
  });

  it("renders with white background by default", async () => {
    const { default: MarqueeBanner } = await import("@/components/MarqueeBanner");
    const { container } = render(<MarqueeBanner />);
    const banner = container.firstChild as HTMLElement;
    expect(banner.style.background).toMatch(/rgb\(255,\s*255,\s*255\)|#ffffff/i);
  });

  it("renders with black text by default", async () => {
    const { default: MarqueeBanner } = await import("@/components/MarqueeBanner");
    render(<MarqueeBanner />);
    const spans = screen.getAllByText(/free shipping/i);
    expect(spans[0].style.color).toMatch(/rgb\(0,\s*0,\s*0\)|#000000/i);
  });
});

describe("MarqueeBanner — dynamic content", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLayout({
      ticker_items: ["Custom Item A", "Custom Item B"],
      ticker_bg: "#ff0000",
      ticker_text_color: "#ffffff",
    });
  });

  it("renders custom ticker items", async () => {
    const { default: MarqueeBanner } = await import("@/components/MarqueeBanner");
    render(<MarqueeBanner />);
    expect(screen.getAllByText(/custom item a/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/custom item b/i).length).toBeGreaterThan(0);
  });

  it("uses custom background color", async () => {
    const { default: MarqueeBanner } = await import("@/components/MarqueeBanner");
    const { container } = render(<MarqueeBanner />);
    const banner = container.firstChild as HTMLElement;
    expect(banner.style.background).toMatch(/rgb\(255,\s*0,\s*0\)|#ff0000/i);
  });

  it("uses custom text color", async () => {
    const { default: MarqueeBanner } = await import("@/components/MarqueeBanner");
    render(<MarqueeBanner />);
    const spans = screen.getAllByText(/custom item a/i);
    expect(spans[0].style.color).toMatch(/rgb\(255,\s*255,\s*255\)|#ffffff/i);
  });

  it("does NOT render default items when custom items are provided", async () => {
    const { default: MarqueeBanner } = await import("@/components/MarqueeBanner");
    render(<MarqueeBanner />);
    expect(screen.queryByText(/authorized dealer/i)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AboutSection
// ═══════════════════════════════════════════════════════════════════════════════

describe("AboutSection — defaults", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLayout({});
  });

  it("renders fallback tagline when no setting set", async () => {
    const { default: AboutSection } = await import("@/components/AboutSection");
    render(<AboutSection />);
    expect(screen.getByText("About Davin's")).toBeInTheDocument();
  });

  it("renders fallback stat values", async () => {
    const { default: AboutSection } = await import("@/components/AboutSection");
    render(<AboutSection />);
    expect(screen.getByText("7+")).toBeInTheDocument();
    expect(screen.getByText("12K+")).toBeInTheDocument();
  });

  it("renders fallback stat labels", async () => {
    const { default: AboutSection } = await import("@/components/AboutSection");
    render(<AboutSection />);
    expect(screen.getByText("Years")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
  });
});

describe("AboutSection — dynamic content", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLayout({
      about_tagline: "Our Story",
      about_heading: "We love cameras",
      about_body: "Dynamic body text here",
      about_stat_1_value: "10+",
      about_stat_1_label: "Years",
      about_stat_2_value: "20K+",
      about_stat_2_label: "Happy Clients",
      about_stat_3_value: "5.0★",
      about_stat_3_label: "Stars",
    });
  });

  it("renders custom tagline", async () => {
    const { default: AboutSection } = await import("@/components/AboutSection");
    render(<AboutSection />);
    expect(screen.getByText("Our Story")).toBeInTheDocument();
  });

  it("renders custom heading", async () => {
    const { default: AboutSection } = await import("@/components/AboutSection");
    render(<AboutSection />);
    expect(screen.getByText("We love cameras")).toBeInTheDocument();
  });

  it("renders custom body text", async () => {
    const { default: AboutSection } = await import("@/components/AboutSection");
    render(<AboutSection />);
    expect(screen.getByText("Dynamic body text here")).toBeInTheDocument();
  });

  it("renders custom stat values", async () => {
    const { default: AboutSection } = await import("@/components/AboutSection");
    render(<AboutSection />);
    expect(screen.getByText("10+")).toBeInTheDocument();
    expect(screen.getByText("20K+")).toBeInTheDocument();
    expect(screen.getByText("5.0★")).toBeInTheDocument();
  });

  it("renders custom stat labels", async () => {
    const { default: AboutSection } = await import("@/components/AboutSection");
    render(<AboutSection />);
    expect(screen.getByText("Happy Clients")).toBeInTheDocument();
    expect(screen.getByText("Stars")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HeroSection
// ═══════════════════════════════════════════════════════════════════════════════

describe("HeroSection — defaults", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLayout({});
  });

  it("renders the default tagline badge", async () => {
    const { default: HeroSection } = await import("@/components/HeroSection");
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText("Your Vision / Our Gear")).toBeInTheDocument();
  });

  it("renders the default heading words", async () => {
    const { default: HeroSection } = await import("@/components/HeroSection");
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText("CAPTURE")).toBeInTheDocument();
    expect(screen.getByText("EVERYTHING")).toBeInTheDocument();
  });

  it("renders the default brand count", async () => {
    const { default: HeroSection } = await import("@/components/HeroSection");
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText("50+")).toBeInTheDocument();
  });

  it("renders the default product count", async () => {
    const { default: HeroSection } = await import("@/components/HeroSection");
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText("2,400+")).toBeInTheDocument();
  });

  it("renders Browse Equipment button", async () => {
    const { default: HeroSection } = await import("@/components/HeroSection");
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText(/browse equipment/i)).toBeInTheDocument();
  });
});

describe("HeroSection — dynamic content", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLayout({
      hero_tagline: "Your Custom Tagline",
      hero_heading_1: "SHOOT",
      hero_heading_2: "BETTER",
      hero_subtext: "Custom subtext content",
      hero_brands_count: "100+",
      hero_products_count: "5,000+",
      hero_badge_1: "[AUTH] Custom badge one",
      hero_badge_2: "[SHIP] Custom badge two",
      hero_badge_3: "[SUPPORT] Custom badge three",
    });
  });

  it("renders custom tagline", async () => {
    const { default: HeroSection } = await import("@/components/HeroSection");
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText("Your Custom Tagline")).toBeInTheDocument();
  });

  it("renders custom heading lines", async () => {
    const { default: HeroSection } = await import("@/components/HeroSection");
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText("SHOOT")).toBeInTheDocument();
    expect(screen.getByText("BETTER")).toBeInTheDocument();
  });

  it("renders custom subtext", async () => {
    const { default: HeroSection } = await import("@/components/HeroSection");
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText("Custom subtext content")).toBeInTheDocument();
  });

  it("renders custom brand and product counts", async () => {
    const { default: HeroSection } = await import("@/components/HeroSection");
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText("100+")).toBeInTheDocument();
    expect(screen.getByText("5,000+")).toBeInTheDocument();
  });

  it("renders custom badges when set", async () => {
    const { default: HeroSection } = await import("@/components/HeroSection");
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText("[AUTH] Custom badge one")).toBeInTheDocument();
    expect(screen.getByText("[SHIP] Custom badge two")).toBeInTheDocument();
    expect(screen.getByText("[SUPPORT] Custom badge three")).toBeInTheDocument();
  });

  it("does NOT render default badges when custom ones are set", async () => {
    const { default: HeroSection } = await import("@/components/HeroSection");
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.queryByText(/authorized dealer for sony/i)).toBeNull();
  });
});
