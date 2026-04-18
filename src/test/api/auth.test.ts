/**
 * Auth API integration tests
 * Requires the server to be running on http://localhost:3001
 */
import { describe, it, expect } from "vitest";

const BASE = "http://localhost:3001";

async function post(path: string, body: object, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function get(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// ─── Login ────────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns 200 + JWT token with correct credentials", async () => {
    const { status, body } = await post("/api/auth/login", {
      email: "admin@divinsstore.com",
      password: "12345678",
    });
    expect(status).toBe(200);
    expect(body).toHaveProperty("token");
    expect(typeof body.token).toBe("string");
    expect(body.token.length).toBeGreaterThan(10);
  });

  it("returns user object with email on successful login", async () => {
    const { body } = await post("/api/auth/login", {
      email: "admin@divinsstore.com",
      password: "12345678",
    });
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe("admin@divinsstore.com");
  });

  it("returns 401 with wrong password", async () => {
    const { status } = await post("/api/auth/login", {
      email: "admin@divinsstore.com",
      password: "wrongpassword",
    });
    expect(status).toBe(401);
  });

  it("returns 401 with unknown email", async () => {
    const { status } = await post("/api/auth/login", {
      email: "nobody@nowhere.com",
      password: "12345678",
    });
    expect(status).toBe(401);
  });

  it("returns 400 when email is missing", async () => {
    const { status } = await post("/api/auth/login", { password: "12345678" });
    expect(status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const { status } = await post("/api/auth/login", {
      email: "admin@divinsstore.com",
    });
    expect(status).toBe(400);
  });
});

// ─── Protected routes require a valid token ──────────────────────────────────

describe("Protected routes — /api/users", () => {
  it("returns 200 with valid token", async () => {
    const loginRes = await post("/api/auth/login", {
      email: "admin@divinsstore.com",
      password: "12345678",
    });
    const token = loginRes.body.token as string;
    const { status, body } = await get("/api/users", token);
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((u: any) => u.email === "admin@divinsstore.com")).toBe(true);
  });

  it("returns 401 without token", async () => {
    const { status } = await get("/api/users");
    expect(status).toBe(401);
  });

  it("returns 401 with an invalid token", async () => {
    const { status } = await get("/api/users", "invalid.token.here");
    expect(status).toBe(401);
  });
});
