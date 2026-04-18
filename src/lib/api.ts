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
  barcode?: string;
  tag: string;
  description: string;
  specs: { label: string; value: string }[];
  image_url: string;
  in_stock: boolean;
  is_featured: boolean;
  category: string;
  quantity_on_hand?: number;
  quantity_reserved?: number;
  reorder_level?: number;
  quick_sale?: boolean;
  tax_rate_id?: number | null;
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
  item_name?: string;
  product_name?: string;
  product_slug?: string;
  quantity: number;
  unit_price: number;
  received_quantity: number;
};

export type ApiGRN = {
  id: number;
  grn_number: string;
  po_id: number;
  po_number?: string;
  supplier_id: number;
  supplier_name?: string;
  received_date: string;
  status: string;
  notes?: string;
  item_count?: number;
  created_at: string;
  updated_at: string;
};

export type ApiGRNItem = {
  id: number;
  grn_id: number;
  po_item_id: number;
  product_id: number;
  product_name?: string;
  barcode?: string;
  ordered_quantity: number;
  received_quantity: number;
  unit_price: number;
  notes?: string;
};

export type ApiSupplierBill = {
  id: number;
  bill_number: string;
  supplier_id: number;
  supplier_name?: string;
  grn_id?: number;
  grn_number?: string;
  po_id?: number;
  po_number?: string;
  bill_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  balance?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type ApiSupplierPayment = {
  id: number;
  payment_number: string;
  supplier_id: number;
  supplier_name?: string;
  bill_id?: number;
  bill_number?: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
  created_at: string;
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
  tracking_number?: string;
  notes?: string;
  item_count?: number;
  cancelled_at?: string;
  cancelled_by?: number;
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
  currency_id?: number | null;
  currency_code?: string | null;
  currency_symbol?: string | null;
  is_active: boolean;
  created_at: string;
};

export type PriceListItem = {
  id: number;
  price_list_id: number;
  product_id: number;
  product_name?: string;
  price: number;
  created_at?: string;
  updated_at?: string;
};

export type ApiCurrency = {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_base: boolean;
  exchange_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MonthlyData = {
  month: string;
  sales: number;
  count: number;
};

export type TopProduct = {
  name: string;
  category: string;
  quantity: number;
  total: number;
};

export type SalesSummary = {
  totalSales: number;
  totalCount: number;
  topMonth: string;
  topMonthAmount: number;
};

export type HourlyData = {
  hour: string;
  amount: number;
  count: number;
};

export type ApiExchangeRate = {
  id: number;
  from_currency_id: number;
  to_currency_id: number;
  rate: number;
  effective_date: string;
  expiry_date: string | null;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  from_currency_code?: string;
  from_currency_name?: string;
  from_currency_symbol?: string;
  to_currency_code?: string;
  to_currency_name?: string;
  to_currency_symbol?: string;
};

// Report Types
export type DailySalesReport = {
  date: string;
  total_sales: number;
  total_revenue: number;
  total_tax: number;
  total_discounts: number;
  average_sale: number;
};

export type SalesByUserReport = {
  user_id: number;
  user_email: string;
  total_sales: number;
  total_revenue: number;
  total_tax: number;
  average_sale: number;
};

export type SalesByCustomerReport = {
  customer_name: string;
  customer_id: number | null;
  total_purchases: number;
  total_spent: number;
  average_purchase: number;
  last_purchase: string;
};

export type SalesByProductReport = {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_tax: number;
  times_sold: number;
  average_price: number;
};

export type SalesComparisonReport = {
  pos: {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
  };
  website: {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
  };
  total_revenue: number;
  total_orders: number;
};

export type ExpensesSummaryReport = {
  accounting_expenses: number;
  cash_drawer_expenses: number;
  total_expenses: number;
};

export type ExpensesByCategoryReport = {
  code: string;
  category_name: string;
  transaction_count: number;
  total_amount: number;
};

export type CashDrawerExpenseReport = {
  id: number;
  amount: number;
  reason: string;
  created_at: string;
  user_email: string;
  session_id: number;
};

export type StockMovementReport = {
  id: number;
  product_id: number;
  product_name: string;
  movement_type: string;
  quantity: number;
  reference_type: string;
  reference_id: number;
  notes: string;
  created_at: string;
  user_email: string;
};

export type ExpiringProductReport = {
  id: number;
  name: string;
  barcode: string;
  quantity_on_hand: number;
  expiry_date: string;
  days_until_expiry: number;
};

export type ExpiredProductReport = {
  id: number;
  name: string;
  barcode: string;
  quantity_on_hand: number;
  expiry_date: string;
  days_expired: number;
};

export type LowStockReport = {
  id: number;
  name: string;
  barcode: string;
  quantity_on_hand: number;
  reorder_level: number;
  units_below_reorder: number;
};

export type OutOfStockReport = {
  id: number;
  name: string;
  barcode: string;
  reorder_level: number;
  in_stock: boolean;
  updated_at: string;
};

export type TrendingProductReport = {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  pos_quantity: number;
  pos_revenue: number;
  web_quantity: number;
  web_revenue: number;
};

export type POSvsWebReport = {
  date: string;
  pos_orders: number;
  pos_revenue: number;
  web_orders: number;
  web_revenue: number;
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
      create: (data: { supplier_id: number; order_date: string; items: { product_id?: number; item_name?: string; quantity: number; unit_price: number }[]; notes?: string }) =>
        request<ApiPurchaseOrder>("/api/procurement/purchase-orders", { method: "POST", body: JSON.stringify(data) }),
      updateStatus: (id: number, status: string) =>
        request<ApiPurchaseOrder>(`/api/procurement/purchase-orders/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
      receive: (id: number, items: { id: number; received_quantity: number }[]) =>
        request<{ success: boolean; status: string }>(`/api/procurement/purchase-orders/${id}/receive`, {
          method: "POST",
          body: JSON.stringify({ items }),
        }),
      print: (id: number) => request<any>(`/api/procurement/purchase-orders/${id}/pdf`),
    },
    grn: {
      list: () => request<ApiGRN[]>("/api/procurement/grn"),
      get: (id: number) => request<ApiGRN & { items: ApiGRNItem[] }>(`/api/procurement/grn/${id}`),
      create: (data: { po_id: number; received_date: string; items: { po_item_id: number; received_quantity: number; notes?: string }[]; notes?: string }) =>
        request<ApiGRN>("/api/procurement/grn", { method: "POST", body: JSON.stringify(data) }),
      print: (id: number) => request<any>(`/api/procurement/grn/${id}/print`),
    },
    bills: {
      list: (status?: string, supplier_id?: number) => {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (supplier_id) params.set("supplier_id", supplier_id.toString());
        const qs = params.toString();
        return request<ApiSupplierBill[]>(`/api/procurement/bills${qs ? `?${qs}` : ""}`);
      },
      get: (id: number) => request<ApiSupplierBill & { payments: ApiSupplierPayment[] }>(`/api/procurement/bills/${id}`),
      create: (data: { supplier_id: number; grn_id?: number; po_id?: number; bill_date: string; due_date?: string; total_amount: number; notes?: string }) =>
        request<ApiSupplierBill>("/api/procurement/bills", { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: Partial<ApiSupplierBill>) =>
        request<ApiSupplierBill>(`/api/procurement/bills/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) =>
        request<{ success: boolean }>(`/api/procurement/bills/${id}`, { method: "DELETE" }),
      print: (id: number) => request<any>(`/api/procurement/bills/${id}/print`),
    },
    payments: {
      list: (supplier_id?: number, payment_method?: string) => {
        const params = new URLSearchParams();
        if (supplier_id) params.set("supplier_id", supplier_id.toString());
        if (payment_method) params.set("payment_method", payment_method);
        const qs = params.toString();
        return request<ApiSupplierPayment[]>(`/api/procurement/payments${qs ? `?${qs}` : ""}`);
      },
      get: (id: number) => request<ApiSupplierPayment>(`/api/procurement/payments/${id}`),
      getBySupplier: (supplierId: number) => request<ApiSupplierPayment[]>(`/api/procurement/payments/supplier/${supplierId}`),
      create: (data: { supplier_id: number; bill_id?: number; payment_date: string; amount: number; payment_method: string; reference?: string; notes?: string }) =>
        request<ApiSupplierPayment>("/api/procurement/payments", { method: "POST", body: JSON.stringify(data) }),
      delete: (id: number) =>
        request<{ success: boolean }>(`/api/procurement/payments/${id}`, { method: "DELETE" }),
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

    items: (id: number) => request<PriceListItem[]>(`/api/price-lists/${id}/items`),
    upsertItem: (id: number, productId: number, price: number) =>
      request<PriceListItem>(`/api/price-lists/${id}/items/${productId}`, {
        method: "PUT",
        body: JSON.stringify({ price }),
      }),
    deleteItem: (id: number, productId: number) =>
      request<{ message: string }>(`/api/price-lists/${id}/items/${productId}`, { method: "DELETE" }),
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
  customerOrders: {
    list: (params?: { status?: string; search?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<{ orders: ApiCustomerOrder[]; total: number; limit: number; offset: number }>(`/api/customer-orders${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => request<ApiCustomerOrder>(`/api/customer-orders/${id}`),
    updateStatus: (id: number, status: string) =>
      request<ApiCustomerOrder>(`/api/customer-orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    update: (id: number, data: Partial<ApiCustomerOrder>) =>
      request<ApiCustomerOrder>(`/api/customer-orders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    cancel: (id: number) =>
      request<ApiCustomerOrder>(`/api/customer-orders/${id}/cancel`, { method: "POST" }),
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
  currencies: {
    list: () => request<ApiCurrency[]>("/api/currencies"),
    getBase: () => request<ApiCurrency>("/api/currencies/base"),
    create: (data: Partial<ApiCurrency>) =>
      request<ApiCurrency>("/api/currencies", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<ApiCurrency>) =>
      request<ApiCurrency>(`/api/currencies/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    setBase: (id: number) =>
      request<ApiCurrency>(`/api/currencies/${id}/set-base`, {
        method: "PUT",
      }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/api/currencies/${id}`, {
        method: "DELETE",
      }),
  },
  dashboard: {
    monthlySales: (year?: number) => {
      const qs = year ? `?year=${year}` : "";
      return request<MonthlyData[]>(`/api/dashboard/monthly-sales${qs}`);
    },
    topProducts: (limit?: number) => {
      const qs = limit ? `?limit=${limit}` : "";
      return request<TopProduct[]>(`/api/dashboard/top-products${qs}`);
    },
    salesSummary: (year?: number) => {
      const qs = year ? `?year=${year}` : "";
      return request<SalesSummary>(`/api/dashboard/sales-summary${qs}`);
    },
    hourlySales: () =>
      request<HourlyData[]>("/api/dashboard/hourly-sales"),
  },
  exchangeRates: {
    list: () => request<ApiExchangeRate[]>("/api/exchange-rates"),
    getActive: (fromId: number, toId: number) =>
      request<ApiExchangeRate>(`/api/exchange-rates/active/${fromId}/${toId}`),
    convert: (data: { from_currency_id: number; to_currency_id: number; amount: number }) =>
      request<{ from_currency_id: number; to_currency_id: number; original_amount: number; rate: number; converted_amount: number }>("/api/exchange-rates/convert", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    create: (data: Partial<ApiExchangeRate>) =>
      request<ApiExchangeRate>("/api/exchange-rates", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<ApiExchangeRate>) =>
      request<ApiExchangeRate>(`/api/exchange-rates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/api/exchange-rates/${id}`, {
        method: "DELETE",
      }),
  },
  reports: {
    sales: {
      daily: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return request<DailySalesReport[]>(`/api/reports/sales/daily?${params}`);
      },
      byUser: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return request<SalesByUserReport[]>(`/api/reports/sales/by-user?${params}`);
      },
      byCustomer: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return request<SalesByCustomerReport[]>(`/api/reports/sales/by-customer?${params}`);
      },
      byProduct: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return request<SalesByProductReport[]>(`/api/reports/sales/by-product?${params}`);
      },
      comparison: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return request<SalesComparisonReport>(`/api/reports/sales/comparison?${params}`);
      },
      byScheme: (startDate?: string, endDate?: string, schemeId?: number | null) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (schemeId) params.append('price_list_id', String(schemeId));
        return request<any[]>(`/api/reports/sales/by-scheme?${params}`);
      },
    },
    expenses: {
      summary: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return request<ExpensesSummaryReport>(`/api/reports/expenses/summary?${params}`);
      },
      byCategory: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return request<ExpensesByCategoryReport[]>(`/api/reports/expenses/by-category?${params}`);
      },
      cashDrawer: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return request<CashDrawerExpenseReport[]>(`/api/reports/expenses/cash-drawer?${params}`);
      },
    },
    inventory: {
      stockMovement: (startDate?: string, endDate?: string, productId?: number) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (productId) params.append('product_id', productId.toString());
        return request<StockMovementReport[]>(`/api/reports/inventory/stock-movement?${params}`);
      },
      expiring: () => request<ExpiringProductReport[]>("/api/reports/inventory/expiring"),
      expired: () => request<ExpiredProductReport[]>("/api/reports/inventory/expired"),
      lowStock: () => request<LowStockReport[]>("/api/reports/inventory/low-stock"),
      outOfStock: () => request<OutOfStockReport[]>("/api/reports/inventory/out-of-stock"),
    },
    trending: {
      products: (startDate?: string, endDate?: string, limit?: number) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (limit) params.append('limit', limit.toString());
        return request<TrendingProductReport[]>(`/api/reports/trending/products?${params}`);
      },
      posVsWeb: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return request<POSvsWebReport[]>(`/api/reports/trending/pos-vs-web?${params}`);
      },
    },
    invoiceReports: {
      overview: (startDate?: string, endDate?: string) => {
        const p = new URLSearchParams();
        if (startDate) p.append('start_date', startDate);
        if (endDate) p.append('end_date', endDate);
        return request<any>(`/api/reports/invoices/overview?${p}`);
      },
      all: (startDate?: string, endDate?: string) => {
        const p = new URLSearchParams();
        if (startDate) p.append('start_date', startDate);
        if (endDate) p.append('end_date', endDate);
        return request<any[]>(`/api/reports/invoices/all?${p}`);
      },
      overdue: () => request<any[]>('/api/reports/invoices/overdue'),
      partial: (startDate?: string, endDate?: string) => {
        const p = new URLSearchParams();
        if (startDate) p.append('start_date', startDate);
        if (endDate) p.append('end_date', endDate);
        return request<any[]>(`/api/reports/invoices/partial?${p}`);
      },
      collections: (startDate?: string, endDate?: string) => {
        const p = new URLSearchParams();
        if (startDate) p.append('start_date', startDate);
        if (endDate) p.append('end_date', endDate);
        return request<any[]>(`/api/reports/invoices/collections?${p}`);
      },
    },
  },
  invoices: {
    list: (params?: { status?: string; search?: string; start_date?: string; end_date?: string }) => {
      const clean = Object.fromEntries(
        Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
      );
      const qs = new URLSearchParams(clean as any).toString();
      return request<any[]>(`/api/invoices${qs ? `?${qs}` : ''}`);
    },
    get: (id: number) => request<any>(`/api/invoices/${id}`),
    create: (data: any) => request<any>('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    recordPayment: (id: number, data: { amount: number; payment_method?: string; notes?: string }) =>
      request<any>(`/api/invoices/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
    void: (id: number) => request<any>(`/api/invoices/${id}`, { method: 'DELETE' }),
  },
};
