import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pool from "./db.js";
import { autoSeed } from "./autoSeed.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import customerOrdersRoutes from "./routes/customer-orders.js";
import categoryRoutes from "./routes/categories.js";
import inventoryRoutes from "./routes/inventory.js";
import procurementRoutes from "./routes/procurement.js";
import grnRoutes from "./routes/grn.js";
import billsRoutes from "./routes/bills.js";
import paymentsRoutes from "./routes/payments.js";
import accountingRoutes from "./routes/accounting.js";
import cartRoutes from "./routes/cart.js";
import checkoutRoutes from "./routes/checkout.js";
import paymentTypesRoutes from "./routes/payment-types.js";
import taxRatesRoutes from "./routes/tax-rates.js";
import priceListsRoutes from "./routes/price-lists.js";
import promotionsRoutes from "./routes/promotions.js";
import countriesRoutes from "./routes/countries.js";
import companyRoutes from "./routes/company.js";
import posRoutes from "./routes/pos.js";
import cashDrawerRoutes from "./routes/cash-drawer.js";
import posReportsRoutes from "./routes/pos-reports.js";
import currenciesRoutes from "./routes/currencies.js";
import dashboardRoutes from "./routes/dashboard.js";
import exchangeRatesRoutes from "./routes/exchangeRates.js";
import reportsRoutes from "./routes/reports.js";
import invoicesRoutes from "./routes/invoices.js";
import rolesRoutes from "./routes/roles.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));

const PgSession = connectPgSimple(session);

app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? process.env.APP_URL 
    : ["http://localhost:5173", "http://localhost:8080"],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(session({
  store: new PgSession({ pool, tableName: "session" }),
  secret: process.env.JWT_SECRET || "fallback-secret-change-in-production",
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  }
}));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customer-orders", customerOrdersRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/procurement/grn", grnRoutes);
app.use("/api/procurement/bills", billsRoutes);
app.use("/api/procurement/payments", paymentsRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/payment-types", paymentTypesRoutes);
app.use("/api/tax-rates", taxRatesRoutes);
app.use("/api/price-lists", priceListsRoutes);
app.use("/api/promotions", promotionsRoutes);
app.use("/api/countries", countriesRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/cash-drawer", cashDrawerRoutes);
app.use("/api/pos-reports", posReportsRoutes);
app.use("/api/currencies", currenciesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/exchange-rates", exchangeRatesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/roles", rolesRoutes);

// Serve React build in production
if (process.env.NODE_ENV === "production") {
  const distPath = join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(255) NOT NULL,
      price INTEGER NOT NULL,
      tag VARCHAR(100) DEFAULT '',
      description TEXT DEFAULT '',
      specs JSONB DEFAULT '[]',
      image_url VARCHAR(500) DEFAULT '',
      in_stock BOOLEAN DEFAULT TRUE,
      is_featured BOOLEAN DEFAULT FALSE,
      category VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_on_hand INTEGER DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_reserved INTEGER DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price INTEGER DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER;
    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(255) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Inventory Module
    CREATE TABLE IF NOT EXISTS stock_movements (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      movement_type VARCHAR(50) NOT NULL,
      quantity INTEGER NOT NULL,
      reference_type VARCHAR(50),
      reference_id INTEGER,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by INTEGER REFERENCES users(id),
      user_id INTEGER REFERENCES users(id)
    );
    
    -- Procurement Module
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id SERIAL PRIMARY KEY,
      po_number VARCHAR(50) UNIQUE NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id),
      order_date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'draft',
      total_amount INTEGER DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by INTEGER REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id SERIAL PRIMARY KEY,
      po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      item_name VARCHAR(255),
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      received_quantity INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS goods_received_notes (
      id SERIAL PRIMARY KEY,
      grn_number VARCHAR(50) UNIQUE NOT NULL,
      po_id INTEGER REFERENCES purchase_orders(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      received_date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'draft',
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS grn_items (
      id SERIAL PRIMARY KEY,
      grn_id INTEGER REFERENCES goods_received_notes(id) ON DELETE CASCADE,
      po_item_id INTEGER REFERENCES purchase_order_items(id),
      product_id INTEGER REFERENCES products(id),
      ordered_quantity INTEGER NOT NULL,
      received_quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS supplier_bills (
      id SERIAL PRIMARY KEY,
      bill_number VARCHAR(50) UNIQUE NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id),
      grn_id INTEGER REFERENCES goods_received_notes(id),
      po_id INTEGER REFERENCES purchase_orders(id),
      bill_date DATE NOT NULL,
      due_date DATE,
      total_amount INTEGER NOT NULL,
      paid_amount INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'unpaid',
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS supplier_payments (
      id SERIAL PRIMARY KEY,
      payment_number VARCHAR(50) UNIQUE NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id),
      bill_id INTEGER REFERENCES supplier_bills(id),
      payment_date DATE NOT NULL,
      amount INTEGER NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      reference VARCHAR(255),
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Accounting Module
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      account_type VARCHAR(50) NOT NULL,
      parent_id INTEGER REFERENCES accounts(id),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      transaction_date DATE NOT NULL,
      reference VARCHAR(100),
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by INTEGER REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS transaction_lines (
      id SERIAL PRIMARY KEY,
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES accounts(id),
      debit INTEGER DEFAULT 0,
      credit INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- E-Commerce Module
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      city VARCHAR(100),
      postal_code VARCHAR(20),
      country VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS customer_orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255),
      customer_phone VARCHAR(50),
      shipping_address TEXT,
      shipping_city VARCHAR(100),
      shipping_postal_code VARCHAR(20),
      shipping_country VARCHAR(100),
      subtotal INTEGER NOT NULL,
      shipping_cost INTEGER DEFAULT 0,
      total INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      tracking_number VARCHAR(100),
      notes TEXT,
      cancelled_at TIMESTAMPTZ,
      cancelled_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES customer_orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name VARCHAR(255) NOT NULL,
      product_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS session (
      sid VARCHAR NOT NULL COLLATE "default",
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL,
      PRIMARY KEY (sid)
    );
    CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
    
    -- POS Tables
    CREATE TABLE IF NOT EXISTS payment_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS tax_rates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      rate DECIMAL(5,2) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS price_lists (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      discount_percent DECIMAL(5,2) DEFAULT 0,
      currency_id INTEGER,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS price_list_items (
      id SERIAL PRIMARY KEY,
      price_list_id INTEGER REFERENCES price_lists(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      price INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(price_list_id, product_id)
    );
    
    CREATE TABLE IF NOT EXISTS promotions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      discount_type VARCHAR(20) NOT NULL,
      discount_value DECIMAL(10,2) NOT NULL,
      start_date DATE,
      end_date DATE,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS countries (
      id SERIAL PRIMARY KEY,
      code VARCHAR(3) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS company_settings (
      id SERIAL PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL,
      address TEXT,
      phone VARCHAR(50),
      email VARCHAR(255),
      tax_id VARCHAR(100),
      currency VARCHAR(10) DEFAULT 'UGX',
      logo_url TEXT,
      receipt_footer TEXT,
      city VARCHAR(100),
      country VARCHAR(100),
      postal_code VARCHAR(20),
      website VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Alter existing table to add missing columns and change logo_url type
    DO $$ 
    BEGIN
      -- Change logo_url to TEXT type
      BEGIN
        ALTER TABLE company_settings ALTER COLUMN logo_url TYPE TEXT;
      EXCEPTION
        WHEN undefined_column THEN NULL;
      END;
      
      -- Add city column if it doesn't exist
      BEGIN
        ALTER TABLE company_settings ADD COLUMN city VARCHAR(100);
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      
      -- Add country column if it doesn't exist
      BEGIN
        ALTER TABLE company_settings ADD COLUMN country VARCHAR(100);
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      
      -- Add postal_code column if it doesn't exist
      BEGIN
        ALTER TABLE company_settings ADD COLUMN postal_code VARCHAR(20);
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      
      -- Add website column if it doesn't exist
      BEGIN
        ALTER TABLE company_settings ADD COLUMN website VARCHAR(255);
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
    END $$;
    
    CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      opening_cash INTEGER NOT NULL,
      closing_cash INTEGER,
      expected_cash INTEGER,
      cash_difference INTEGER,
      opened_at TIMESTAMPTZ DEFAULT NOW(),
      closed_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'open',
      notes TEXT
    );
    
    CREATE TABLE IF NOT EXISTS cash_movements (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES cash_drawer_sessions(id),
      user_id INTEGER REFERENCES users(id),
      type VARCHAR(20) NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS pos_sales (
      id SERIAL PRIMARY KEY,
      sale_number VARCHAR(50) UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      customer_name VARCHAR(255),
      user_id INTEGER REFERENCES users(id),
      session_id INTEGER REFERENCES cash_drawer_sessions(id),
      price_list_id INTEGER REFERENCES price_lists(id),
      subtotal INTEGER NOT NULL,
      tax_amount INTEGER NOT NULL,
      discount_amount INTEGER DEFAULT 0,
      total_amount INTEGER NOT NULL,
      sale_currency_id INTEGER,
      exchange_rate_used DECIMAL(15,6),
      payment_type_id INTEGER REFERENCES payment_types(id),
      payment_status VARCHAR(20) DEFAULT 'paid',
      sale_type VARCHAR(20) DEFAULT 'regular',
      status VARCHAR(20) DEFAULT 'completed',
      notes TEXT,
      voided BOOLEAN DEFAULT FALSE,
      voided_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS pos_sale_items (
      id SERIAL PRIMARY KEY,
      sale_id INTEGER REFERENCES pos_sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      discount_amount INTEGER DEFAULT 0,
      tax_amount INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS credit_sales (
      id SERIAL PRIMARY KEY,
      sale_id INTEGER REFERENCES pos_sales(id),
      customer_id INTEGER REFERENCES customers(id),
      total_amount INTEGER NOT NULL,
      paid_amount INTEGER DEFAULT 0,
      balance INTEGER NOT NULL,
      due_date DATE,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS customer_payments (
      id SERIAL PRIMARY KEY,
      credit_sale_id INTEGER REFERENCES credit_sales(id),
      customer_id INTEGER REFERENCES customers(id),
      amount INTEGER NOT NULL,
      payment_type_id INTEGER REFERENCES payment_types(id),
      payment_date TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Extend customers table
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit INTEGER DEFAULT 0;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS price_list_id INTEGER REFERENCES price_lists(id);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0;
    
    -- Extend products table
    ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS quick_sale BOOLEAN DEFAULT false;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate_id INTEGER REFERENCES tax_rates(id);
    
    -- Extend users table
    ALTER TABLE users ADD COLUMN IF NOT EXISTS can_access_pos BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pos_pin VARCHAR(10);
    
    -- Currencies table
    CREATE TABLE IF NOT EXISTS currencies (
      id SERIAL PRIMARY KEY,
      code VARCHAR(3) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      symbol VARCHAR(10) NOT NULL,
      is_base BOOLEAN DEFAULT FALSE,
      exchange_rate DECIMAL(15,6) NOT NULL DEFAULT 1.0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code);
    CREATE INDEX IF NOT EXISTS idx_currencies_is_base ON currencies(is_base) WHERE is_base = TRUE;
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_currencies_single_base'
      ) THEN
        CREATE UNIQUE INDEX idx_currencies_single_base ON currencies(is_base) WHERE is_base = TRUE;
      END IF;
    END $$;

    -- Ensure new columns exist on pre-existing tables before adding FK constraints
    ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS currency_id INTEGER;
    ALTER TABLE pos_sales   ADD COLUMN IF NOT EXISTS price_list_id INTEGER REFERENCES price_lists(id);
    ALTER TABLE pos_sales   ADD COLUMN IF NOT EXISTS sale_currency_id INTEGER;
    ALTER TABLE pos_sales   ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(15,6);
    ALTER TABLE pos_sales   ADD COLUMN IF NOT EXISTS voided BOOLEAN DEFAULT FALSE;
    ALTER TABLE pos_sales   ADD COLUMN IF NOT EXISTS voided_by INTEGER REFERENCES users(id);
    ALTER TABLE pos_sales   ADD COLUMN IF NOT EXISTS promotion_id INTEGER REFERENCES promotions(id);
    ALTER TABLE pos_sales   ADD COLUMN IF NOT EXISTS promotion_name VARCHAR(255);
    ALTER TABLE pos_sales   ADD COLUMN IF NOT EXISTS original_sale_id INTEGER REFERENCES pos_sales(id);
    ALTER TABLE pos_sales   ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50);
    ALTER TABLE pos_sales   ADD COLUMN IF NOT EXISTS refund_reason TEXT;

    -- Add FK constraints that depend on currencies (table is created above)
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE price_lists
        ADD CONSTRAINT fk_price_lists_currency
        FOREIGN KEY (currency_id) REFERENCES currencies(id);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;

      BEGIN
        ALTER TABLE pos_sales
        ADD CONSTRAINT fk_pos_sales_sale_currency
        FOREIGN KEY (sale_currency_id) REFERENCES currencies(id);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;
    END $$;
    
    -- Exchange rates table
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id SERIAL PRIMARY KEY,
      from_currency_id INTEGER REFERENCES currencies(id) ON DELETE CASCADE,
      to_currency_id INTEGER REFERENCES currencies(id) ON DELETE CASCADE,
      rate DECIMAL(15,6) NOT NULL,
      effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
      expiry_date DATE,
      is_active BOOLEAN DEFAULT TRUE,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(from_currency_id, to_currency_id, effective_date)
    );
    
    CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_currency ON exchange_rates(from_currency_id);
    CREATE INDEX IF NOT EXISTS idx_exchange_rates_to_currency ON exchange_rates(to_currency_id);
    CREATE INDEX IF NOT EXISTS idx_exchange_rates_active ON exchange_rates(is_active) WHERE is_active = TRUE;
    CREATE INDEX IF NOT EXISTS idx_exchange_rates_dates ON exchange_rates(effective_date, expiry_date);

    -- Migration tracking table
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(200) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- One-time fix: price_list_items.price was being stored as plain user input (e.g. 65)
    -- but the rest of the system stores monetary values ×100 (cents). Multiply all
    -- existing rows by 100 so formatCurrencySync shows the correct amount.
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM _migrations WHERE name = 'price_list_items_multiply_100') THEN
        UPDATE price_list_items SET price = price * 100;
        INSERT INTO _migrations (name) VALUES ('price_list_items_multiply_100');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      customer_name VARCHAR(200) NOT NULL,
      customer_email VARCHAR(200),
      customer_phone VARCHAR(50),
      pos_sale_id INTEGER REFERENCES pos_sales(id),
      price_list_id INTEGER REFERENCES price_lists(id),
      subtotal INTEGER NOT NULL DEFAULT 0,
      tax_amount INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      paid_amount INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) DEFAULT 'unpaid',
      due_date DATE,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name VARCHAR(200) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      total_price INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoice_payments (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      payment_method VARCHAR(100) DEFAULT 'Cash',
      notes TEXT,
      recorded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Roles & Permissions
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      group_name VARCHAR(100) DEFAULT 'General',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);
    ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency_id INTEGER REFERENCES currencies(id);
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) DEFAULT 'UGX';
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT 'UGX';
  `);
  console.log("\u2705 Migrations applied");
}

migrate()
  .then(() => autoSeed())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("\u274c Startup failed:", err.message);
    process.exit(1);
  });
