const BASE = import.meta.env.VITE_API_URL || "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("cms_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type ApiProduct = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  price: number;
  tag: string;
  description: string;
  specs: { label: string; value: string }[];
  image_url: string;
  in_stock: boolean;
  is_featured: boolean;
  category: string;
  created_at: string;
  updated_at: string;
};

export type ApiCategory = {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type ApiUser = {
  id: number;
  email: string;
  role: string;
  created_at: string;
};

export type ApiOrderStats = {
  total: number;
  by_product: { name: string; category: string; order_count: number }[];
  recent: { id: number; product_name: string; created_at: string; category: string }[];
};

// Products
export const api = {
  products: {
    list: (category?: string, featured?: boolean) => {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (featured) params.set("featured", "true");
      const qs = params.toString();
      return request<ApiProduct[]>(`/api/products${qs ? `?${qs}` : ""}`);
    },
    get: (slug: string) => request<ApiProduct>(`/api/products/${slug}`),
    create: (data: Partial<ApiProduct>) =>
      request<ApiProduct>("/api/products", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<ApiProduct>) =>
      request<ApiProduct>(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/api/products/${id}`, { method: "DELETE" }),
  },
  orders: {
    track: (product_id: number, product_name: string) =>
      request("/api/orders", { method: "POST", body: JSON.stringify({ product_id, product_name }) }),
    stats: () => request<ApiOrderStats>("/api/orders/stats"),
  },
  categories: {
    list: () => request<ApiCategory[]>("/api/categories"),
    create: (data: { slug: string; name: string; sort_order: number }) =>
      request<ApiCategory>("/api/categories", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<ApiCategory>) =>
      request<ApiCategory>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/api/categories/${id}`, { method: "DELETE" }),
  },
  users: {
    list: () => request<ApiUser[]>("/api/users"),
    create: (email: string, password: string) =>
      request<ApiUser>("/api/users", { method: "POST", body: JSON.stringify({ email, password }) }),
    update: (id: number, email: string, password?: string) =>
      request<ApiUser>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify({ email, password: password || undefined }) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/api/users/${id}`, { method: "DELETE" }),
  },
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: number; email: string; role: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      request<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),
  },
};
