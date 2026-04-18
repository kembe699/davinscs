/**
 * Login component tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    auth: {
      login: vi.fn(),
      forgotPassword: vi.fn(),
    },
  },
}));

import Login from "@/pages/admin/Login";
import { api } from "@/lib/api";

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

// ─── Render ───────────────────────────────────────────────────────────────────

describe("Login — render", () => {
  it("renders the email input", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("admin@divinsstore.com")).toBeInTheDocument();
  });

  it("renders the password input", () => {
    renderLogin();
    // password input has a bullet placeholder
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
  });

  it("renders a Sign In button", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders a forgot password link", () => {
    renderLogin();
    expect(screen.getByText("Forgot?")).toBeInTheDocument();
  });
});

// ─── Form interaction ─────────────────────────────────────────────────────────

describe("Login — form interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates email field as the user types", () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText("admin@divinsstore.com") as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    expect(emailInput.value).toBe("test@example.com");
  });

  it("updates password field as the user types", () => {
    renderLogin();
    const pwInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(pwInput, { target: { value: "secret123" } });
    expect(pwInput.value).toBe("secret123");
  });

  it("calls api.auth.login with entered credentials on submit", async () => {
    (api.auth.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "test-token",
      user: { email: "admin@divinsstore.com" },
    });

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("admin@divinsstore.com"), {
      target: { value: "admin@divinsstore.com" },
    });
    fireEvent.change(document.querySelector('input[type="password"]')!, {
      target: { value: "12345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(api.auth.login).toHaveBeenCalledWith(
        "admin@divinsstore.com",
        "12345678"
      );
    });
  });

  it("calls context login() and navigates to /admin on success", async () => {
    (api.auth.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "test-token",
      user: { email: "admin@divinsstore.com" },
    });

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("admin@divinsstore.com"), {
      target: { value: "admin@divinsstore.com" },
    });
    fireEvent.change(document.querySelector('input[type="password"]')!, {
      target: { value: "12345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({ email: "admin@divinsstore.com" })
      );
      expect(mockNavigate).toHaveBeenCalledWith("/admin");
    });
  });

  it("shows an error message on failed login", async () => {
    (api.auth.login as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Invalid credentials")
    );

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("admin@divinsstore.com"), {
      target: { value: "admin@divinsstore.com" },
    });
    fireEvent.change(document.querySelector('input[type="password"]')!, {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});

// ─── Forgot password panel ────────────────────────────────────────────────────

describe("Login — forgot password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the reset panel when Forgot? is clicked", () => {
    renderLogin();
    fireEvent.click(screen.getByText("Forgot?"));
    expect(screen.getByText(/reset password/i)).toBeInTheDocument();
  });

  it("calls api.auth.forgotPassword with the entered email", async () => {
    (api.auth.forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      message: "Reset link sent",
    });

    renderLogin();
    fireEvent.click(screen.getByText("Forgot?"));

    const emailInput = screen.getByPlaceholderText("admin@divinsstore.com");
    fireEvent.change(emailInput, { target: { value: "admin@divinsstore.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(api.auth.forgotPassword).toHaveBeenCalledWith(
        "admin@divinsstore.com"
      );
    });
  });
});
