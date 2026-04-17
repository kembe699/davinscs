const BASE = import.meta.env.VITE_API_URL || "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("cms_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
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

export type ApiInventoryItem = {
  id: number;
  name: string;
  slug: string;
  category: string;
  price: number;
  cost_price: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_level: number;
  available: number;
  supplier_name?: string;
};

export type ApiStockMovement = {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  movement_type: string;
  quantity: number;
  reference_type?: string;
  reference_id?: number;
  notes?: string;
  created_at: string;
  created_by_email?: string;
};

export type ApiSupplier = {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ApiPurchaseOrder = {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name?: string;
  order_date: string;
  status: string;
  total_amount: number;
  notes?: string;
  item_count?: number;
  created_at: string;
  updated_at: string;
};

export type ApiPurchaseOrderItem = {
  id: number;
  po_id: number;
  product_id: number;
  product_name?: string;
  product_slug?: string;
  quantity: number;
  unit_price: number;
  received_quantity: number;
};

export type ApiAccount = {
  id: number;
  code: string;
  name: string;
  account_type: string;
  parent_id?: number;
  parent_name?: string;
  is_active: boolean;
  created_at: string;
};

export type ApiTransaction = {
  id: number;
  transaction_date: string;
  reference?: string;
  description?: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
  created_by_email?: string;
};

export type ApiTransactionLine = {
  id: number;
  transaction_id: number;
  account_id: number;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
};

export type ApiCartItem = {
  id: number;
  product_id: number;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  quantity: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  available: number;
  created_at: string;
};

export type ApiCustomerOrder = {
  id: number;
  order_number: string;
  customer_id?: number;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: ApiOrderItem[];
};

export type ApiOrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
};

export type PaymentType = {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type TaxRate = {
  id: number;
  name: string;
  rate: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
};

export type PriceList = {
  id: number;
  name: string;
  description: string;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
};

export type Promotion = {
  id: number;
  name: string;
  description: string;
  discount_type: string;
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

export type Country = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type CompanySettings = {
  name: string;
  logo: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  tax_id: string;
  website: string;
  description: string;
};

export type POSSale = {
  id: number;
  sale_number: string;
  customer_id: number;
  user_id: number;
  session_id: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_type_id: number;
  payment_status: string;
  sale_type: string;
  notes: string;
  voided: boolean;
  voided_at: string;
  voided_by: number;
  created_at: string;
  items?: POSSaleItem[];
  customer_name?: string;
  payment_type_name?: string;
};

export type POSSaleItem = {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  subtotal: number;
  created_at: string;
};

export type CashDrawerSession = {
  id: number;
  user_id: number;
  opening_cash: number;
  closing_cash: number;
  expected_cash: number;
  cash_difference: number;
  opened_at: string;
  closed_at: string;
  status: string;
  notes: string;
};

export type CashMovement = {
  id: number;
  session_id: number;
  user_id: number;
  type: string;
  amount: number;
  reason: string;
  created_at: string;
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
  inventory: {
    list: () => request<ApiInventoryItem[]>("/api/inventory"),
    lowStock: () => request<ApiInventoryItem[]>("/api/inventory/low-stock"),
    movements: (product_id?: number) => {
      const params = product_id ? `?product_id=${product_id}` : "";
      return request<ApiStockMovement[]>(`/api/inventory/movements${params}`);
    },
    adjust: (product_id: number, quantity: number, notes?: string) =>
      request<{ success: boolean; new_quantity: number }>("/api/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({ product_id, quantity, notes }),
      }),
    valuation: () => request<{ total_value: number; total_products: number; total_units: number }>("/api/inventory/valuation"),
  },
  procurement: {
    suppliers: {
      list: () => request<ApiSupplier[]>("/api/procurement/suppliers"),
      create: (data: Partial<ApiSupplier>) =>
        request<ApiSupplier>("/api/procurement/suppliers", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: Partial<ApiSupplier>) =>
        request<ApiSupplier>(`/api/procurement/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) =>
        request<{ success: boolean }>(`/api/procurement/suppliers/${id}`, { method: "DELETE" }),
    },
    purchaseOrders: {
      list: () => request<ApiPurchaseOrder[]>("/api/procurement/purchase-orders"),
      get: (id: number) => request<ApiPurchaseOrder & { items: ApiPurchaseOrderItem[] }>(`/api/procurement/purchase-orders/${id}`),
      create: (data: { supplier_id: number; order_date: string; items: { product_id: number; quantity: number; unit_price: number }[]; notes?: string }) =>
        request<ApiPurchaseOrder>("/api/procurement/purchase-orders", { method: "POST", body: JSON.stringify(data) }),
      updateStatus: (id: number, status: string) =>
        request<ApiPurchaseOrder>(`/api/procurement/purchase-orders/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
      receive: (id: number, items: { id: number; received_quantity: number }[]) =>
        request<{ success: boolean; status: string }>(`/api/procurement/purchase-orders/${id}/receive`, {
          method: "POST",
          body: JSON.stringify({ items }),
        }),
    },
  },
  accounting: {
    accounts: {
      list: () => request<ApiAccount[]>("/api/accounting/accounts"),
      create: (data: { code: string; name: string; account_type: string; parent_id?: number }) =>
        request<ApiAccount>("/api/accounting/accounts", { method: "POST", body: JSON.stringify(data) }),
    },
    transactions: {
      list: (start_date?: string, end_date?: string) => {
        const params = new URLSearchParams();
        if (start_date) params.set("start_date", start_date);
        if (end_date) params.set("end_date", end_date);
        const qs = params.toString();
        return request<ApiTransaction[]>(`/api/accounting/transactions${qs ? `?${qs}` : ""}`);
      },
      get: (id: number) => request<ApiTransaction & { lines: ApiTransactionLine[] }>(`/api/accounting/transactions/${id}`),
      create: (data: { transaction_date: string; reference?: string; description?: string; lines: { account_id: number; debit?: number; credit?: number }[] }) =>
        request<ApiTransaction>("/api/accounting/transactions", { method: "POST", body: JSON.stringify(data) }),
    },
    reports: {
      trialBalance: (as_of_date?: string) => {
        const params = as_of_date ? `?as_of_date=${as_of_date}` : "";
        return request<{ accounts: any[]; total_debit: number; total_credit: number }>(`/api/accounting/trial-balance${params}`);
      },
      incomeStatement: (start_date: string, end_date: string) =>
        request<{ revenue: any[]; expenses: any[]; total_revenue: number; total_expenses: number; net_income: number }>(`/api/accounting/income-statement?start_date=${start_date}&end_date=${end_date}`),
      balanceSheet: (as_of_date: string) =>
        request<{ assets: any[]; liabilities: any[]; equity: any[]; total_assets: number; total_liabilities: number; total_equity: number }>(`/api/accounting/balance-sheet?as_of_date=${as_of_date}`),
    },
  },
  cart: {
    get: () => request<ApiCartItem[]>("/api/cart", { credentials: "include" }),
    add: (product_id: number, quantity: number) =>
      request<ApiCartItem>("/api/cart/add", {
        method: "POST",
        body: JSON.stringify({ product_id, quantity }),
        credentials: "include",
      }),
    update: (id: number, quantity: number) =>
      request<ApiCartItem>(`/api/cart/update/${id}`, {
        method: "PUT",
        body: JSON.stringify({ quantity }),
        credentials: "include",
      }),
    remove: (id: number) =>
      request<{ success: boolean }>(`/api/cart/remove/${id}`, {
        method: "DELETE",
        credentials: "include",
      }),
    clear: () =>
      request<{ success: boolean }>("/api/cart/clear", {
        method: "DELETE",
        credentials: "include",
      }),
  },
  checkout: {
    submit: (data: {
      customer_name: string;
      customer_email: string;
      customer_phone?: string;
      shipping_address: string;
      shipping_city: string;
      shipping_postal_code: string;
      shipping_country: string;
      notes?: string;
    }) =>
      request<ApiCustomerOrder>("/api/checkout", {
        method: "POST",
        body: JSON.stringify(data),
        credentials: "include",
      }),
    getOrder: (id: number) => request<ApiCustomerOrder>(`/api/checkout/orders/${id}`),
  },
  paymentTypes: {
    list: () => request<PaymentType[]>("/api/payment-types"),
    active: () => request<PaymentType[]>("/api/payment-types/active"),
    create: (data: Partial<PaymentType>) =>
      request<PaymentType>("/api/payment-types", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<PaymentType>) =>
      request<PaymentType>(`/api/payment-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ message: string }>(`/api/payment-types/${id}`, { method: "DELETE" }),
  },
  taxRates: {
    list: () => request<TaxRate[]>("/api/tax-rates"),
    active: () => request<TaxRate[]>("/api/tax-rates/active"),
    default: () => request<TaxRate>("/api/tax-rates/default"),
    create: (data: Partial<TaxRate>) =>
      request<TaxRate>("/api/tax-rates", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<TaxRate>) =>
      request<TaxRate>(`/api/tax-rates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ message: string }>(`/api/tax-rates/${id}`, { method: "DELETE" }),
  },
  priceLists: {
    list: () => request<PriceList[]>("/api/price-lists"),
    active: () => request<PriceList[]>("/api/price-lists/active"),
    create: (data: Partial<PriceList>) =>
      request<PriceList>("/api/price-lists", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<PriceList>) =>
      request<PriceList>(`/api/price-lists/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ message: string }>(`/api/price-lists/${id}`, { method: "DELETE" }),
  },
  promotions: {
    list: () => request<Promotion[]>("/api/promotions"),
    active: () => request<Promotion[]>("/api/promotions/active"),
    create: (data: Partial<Promotion>) =>
      request<Promotion>("/api/promotions", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Promotion>) =>
      request<Promotion>(`/api/promotions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ message: string }>(`/api/promotions/${id}`, { method: "DELETE" }),
  },
  countries: {
    list: () => request<Country[]>("/api/countries"),
    active: () => request<Country[]>("/api/countries/active"),
    create: (data: Partial<Country>) =>
      request<Country>("/api/countries", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Country>) =>
      request<Country>(`/api/countries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ message: string }>(`/api/countries/${id}`, { method: "DELETE" }),
  },
  company: {
    get: () => request<CompanySettings>("/api/company"),
    save: (data: Partial<CompanySettings>) =>
      request<CompanySettings>("/api/company", { method: "POST", body: JSON.stringify(data) }),
  },
  pos: {
    createSale: (data: {
      customer_id?: number;
      items: Array<{ product_id: number; quantity: number; unit_price?: number; discount_amount?: number }>;
      payment_type_id: number;
      discount_amount?: number;
      sale_type?: string;
      notes?: string;
    }) => request<POSSale>("/api/pos/sales", { method: "POST", body: JSON.stringify(data) }),
    getSales: (params?: {
      start_date?: string;
      end_date?: string;
      customer_id?: number;
      payment_status?: string;
      sale_type?: string;
    }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<POSSale[]>(`/api/pos/sales${qs ? `?${qs}` : ""}`);
    },
    getSale: (id: number) => request<POSSale>(`/api/pos/sales/${id}`),
    voidSale: (id: number) =>
      request<{ message: string }>(`/api/pos/sales/${id}/void`, { method: "POST" }),
    refundSale: (id: number, items: Array<{ product_id: number; quantity: number }>) =>
      request<{ message: string; refund_amount: number }>(`/api/pos/sales/${id}/refund`, {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
  },
  cashDrawer: {
    getCurrent: () => request<CashDrawerSession>("/api/cash-drawer/current"),
    open: (opening_cash: number) =>
      request<CashDrawerSession>("/api/cash-drawer/open", {
        method: "POST",
        body: JSON.stringify({ opening_cash }),
      }),
    close: (closing_cash: number, notes?: string) =>
      request<CashDrawerSession>("/api/cash-drawer/close", {
        method: "POST",
        body: JSON.stringify({ closing_cash, notes }),
      }),
    cashIn: (amount: number, reason: string) =>
      request<CashMovement>("/api/cash-drawer/cash-in", {
        method: "POST",
        body: JSON.stringify({ amount, reason }),
      }),
    cashOut: (amount: number, reason: string) =>
      request<CashMovement>("/api/cash-drawer/cash-out", {
        method: "POST",
        body: JSON.stringify({ amount, reason }),
      }),
    getSessions: (params?: { start_date?: string; end_date?: string; user_id?: number }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<CashDrawerSession[]>(`/api/cash-drawer/sessions${qs ? `?${qs}` : ""}`);
    },
    getMovements: (sessionId: number) =>
      request<CashMovement[]>(`/api/cash-drawer/sessions/${sessionId}/movements`),
  },
  posReports: {
    dailySales: (date?: string) => {
      const qs = date ? `?date=${date}` : "";
      return request<any>(`/api/pos-reports/daily-sales${qs}`);
    },
    hourlySales: (date?: string) => {
      const qs = date ? `?date=${date}` : "";
      return request<any[]>(`/api/pos-reports/hourly-sales${qs}`);
    },
    topProducts: (params?: { start_date?: string; end_date?: string; limit?: number }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<any[]>(`/api/pos-reports/top-products${qs ? `?${qs}` : ""}`);
    },
    topCustomers: (params?: { start_date?: string; end_date?: string; limit?: number }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<any[]>(`/api/pos-reports/top-customers${qs ? `?${qs}` : ""}`);
    },
    paymentMethods: (params?: { start_date?: string; end_date?: string }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<any[]>(`/api/pos-reports/payment-methods${qs ? `?${qs}` : ""}`);
    },
    monthlySales: (year?: number) => {
      const qs = year ? `?year=${year}` : "";
      return request<any[]>(`/api/pos-reports/monthly-sales${qs}`);
    },
    endOfDay: (params?: { date?: string; session_id?: number }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<any>(`/api/pos-reports/end-of-day${qs ? `?${qs}` : ""}`);
    },
  },
};
