import pool from '../db.js';

export async function migrateTenant(schemaName = "public") {
  await pool.query(`
    SET search_path TO "${schemaName}", public;
    -- SAAS CONTROL PLANE TABLES (Always in public schema)
    CREATE TABLE IF NOT EXISTS public.saas_admins (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.tenants (
      id SERIAL PRIMARY KEY,
      business_name VARCHAR(255) NOT NULL,
      schema_name VARCHAR(50) UNIQUE NOT NULL,
      customer_code VARCHAR(20) UNIQUE,
      status VARCHAR(20) DEFAULT 'trial',
      trial_ends_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS customer_code VARCHAR(20) UNIQUE;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(50) UNIQUE;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS public.tenant_db_snapshots (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE CASCADE,
      schema_name VARCHAR(50) NOT NULL,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tenant_db_snapshots_tenant_recorded ON public.tenant_db_snapshots(tenant_id, recorded_at DESC);

    CREATE TABLE IF NOT EXISTS public.tenant_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE CASCADE,
      schema_name VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.saas_billing (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(30) UNIQUE NOT NULL,
      tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE CASCADE,
      plan_name VARCHAR(100) DEFAULT '',
      amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      status VARCHAR(20) DEFAULT 'pending',
      notes TEXT DEFAULT '',
      billing_period VARCHAR(20) DEFAULT 'monthly',
      issued_at TIMESTAMPTZ DEFAULT NOW(),
      paid_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS public.pricing_plans (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      price VARCHAR(20) NOT NULL,
      sub_label VARCHAR(50) DEFAULT 'per month',
      description TEXT DEFAULT '',
      features JSONB DEFAULT '[]',
      cta_label VARCHAR(50) DEFAULT 'Get Started',
      cta_href VARCHAR(255) DEFAULT '/register',
      highlight BOOLEAN DEFAULT FALSE,
      sort_order INTEGER DEFAULT 0,
      billing_period VARCHAR(20) DEFAULT 'monthly',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.pricing_plans ADD COLUMN IF NOT EXISTS billing_period VARCHAR(20) DEFAULT 'monthly';
    ALTER TABLE public.saas_billing ADD COLUMN IF NOT EXISTS billing_period VARCHAR(20) DEFAULT 'monthly';
    ALTER TABLE public.saas_billing ADD COLUMN IF NOT EXISTS pesapal_tracking_id TEXT;
    ALTER TABLE public.saas_billing ADD COLUMN IF NOT EXISTS pesapal_merchant_ref TEXT;
    ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

    CREATE TABLE IF NOT EXISTS public.saas_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT
    );

    -- POS INSTANCE TABLES
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      pin VARCHAR(10),
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pin VARCHAR(10);
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      sort_order INTEGER DEFAULT 0,
      image_url VARCHAR(500) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT '';
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
      uom VARCHAR(50) DEFAULT 'pcs',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_on_hand INTEGER DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_reserved INTEGER DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price INTEGER DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(255) DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date DATE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'product';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS expense_account_id INTEGER;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS uom VARCHAR(50) DEFAULT 'pcs';
    ALTER TABLE products ALTER COLUMN brand DROP NOT NULL;
    ALTER TABLE products ALTER COLUMN category DROP NOT NULL;
    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
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
    
    -- Customers (used by POS customer assignment, credit sales, invoices)
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

    CREATE TABLE IF NOT EXISTS quotations (
      id SERIAL PRIMARY KEY,
      quote_number VARCHAR(50) UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255),
      customer_phone VARCHAR(100),
      customer_address TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      valid_until DATE,
      subtotal INTEGER DEFAULT 0,
      tax_amount INTEGER DEFAULT 0,
      discount_amount INTEGER DEFAULT 0,
      total_amount INTEGER DEFAULT 0,
      notes TEXT,
      converted_invoice_id INTEGER,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id SERIAL PRIMARY KEY,
      quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(255) NOT NULL,
      description TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL DEFAULT 0,
      tax_rate NUMERIC(5,2) DEFAULT 0,
      subtotal INTEGER NOT NULL DEFAULT 0
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

      -- Add whatsapp column if it doesn't exist
      BEGIN
        ALTER TABLE company_settings ADD COLUMN whatsapp VARCHAR(50);
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;

      -- Add brand color columns if they don't exist
      BEGIN
        ALTER TABLE company_settings ADD COLUMN brand_color_start VARCHAR(20) DEFAULT '#004A99';
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      BEGIN
        ALTER TABLE company_settings ADD COLUMN brand_color_mid VARCHAR(20) DEFAULT '#008B8B';
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      BEGIN
        ALTER TABLE company_settings ADD COLUMN brand_color_end VARCHAR(20) DEFAULT '#32CD32';
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;

      -- Add business_type column if it doesn't exist (e.g. 'food' enables the Tables feature)
      BEGIN
        ALTER TABLE company_settings ADD COLUMN business_type VARCHAR(50) DEFAULT '';
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
    END $$;

    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_email VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      details JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

    DO $$ BEGIN
      BEGIN
        ALTER TABLE products ADD COLUMN expense_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL DEFAULT 9;
      EXCEPTION WHEN duplicate_column THEN NULL;
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
    
    -- Restaurant tables (only used by Food & Beverage tenants, but harmless
    -- to always have — a table's "current order" is just the held, non-voided
    -- pos_sales row whose table_id points here, so no status column to track.
    CREATE TABLE IF NOT EXISTS restaurant_tables (
      id SERIAL PRIMARY KEY,
      location VARCHAR(100) NOT NULL,
      label VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS table_id INTEGER REFERENCES restaurant_tables(id) ON DELETE SET NULL;

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
    ALTER TABLE pos_sales   ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
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

    -- One-time fix: drop the e-commerce/storefront module (orders, cart, and the
    -- storefront layout/content settings) — this instance is POS-only now.
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM _migrations WHERE name = 'drop_ecommerce_module') THEN
        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS customer_orders;
        DROP TABLE IF EXISTS cart_items;
        DROP TABLE IF EXISTS orders;
        ALTER TABLE company_settings DROP COLUMN IF EXISTS site_layout;
        ALTER TABLE company_settings DROP COLUMN IF EXISTS storefront_settings;
        INSERT INTO _migrations (name) VALUES ('drop_ecommerce_module');
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
    ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_address TEXT;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0;
    ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0;
    ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS subtotal INTEGER DEFAULT 0;
    ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency_id INTEGER REFERENCES currencies(id);
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) DEFAULT 'UGX';
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT 'UGX';

    DO $$
    DECLARE col_type TEXT;
    BEGIN
      SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name   = 'products'
          AND column_name  = 'cost_price';
      IF col_type = 'integer' THEN
        ALTER TABLE products ALTER COLUMN cost_price TYPE NUMERIC(15,2) USING cost_price::numeric(15,2);
        ALTER TABLE products ALTER COLUMN cost_price SET DEFAULT 0;
      END IF;
    END $$;

    DO $$
    DECLARE col_type TEXT;
    BEGIN
      SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name   = 'products'
          AND column_name  = 'price';
      IF col_type = 'integer' THEN
        ALTER TABLE products ALTER COLUMN price TYPE NUMERIC(15,2) USING price::numeric(15,2);
      END IF;
    END $$;

    DO $$
    DECLARE
      t RECORD;
    BEGIN
      FOR t IN
        SELECT * FROM (VALUES
          ('purchase_orders', 'total_amount'),
          ('purchase_order_items', 'unit_price'),
          ('grn_items', 'unit_price'),
          ('supplier_bills', 'total_amount'),
          ('supplier_bills', 'paid_amount'),
          ('supplier_payments', 'amount'),
          ('quotations', 'subtotal'),
          ('quotations', 'tax_amount'),
          ('quotations', 'discount_amount'),
          ('quotations', 'total_amount'),
          ('quotation_items', 'unit_price'),
          ('quotation_items', 'subtotal'),
          ('cash_movements', 'amount'),
          ('pos_sales', 'subtotal'),
          ('pos_sales', 'tax_amount'),
          ('pos_sales', 'discount_amount'),
          ('pos_sales', 'total_amount'),
          ('pos_sale_items', 'unit_price'),
          ('pos_sale_items', 'discount_amount'),
          ('pos_sale_items', 'tax_amount'),
          ('pos_sale_items', 'subtotal'),
          ('credit_sales', 'total_amount'),
          ('credit_sales', 'paid_amount'),
          ('credit_sales', 'balance'),
          ('customer_payments', 'amount'),
          ('invoices', 'subtotal'),
          ('invoices', 'tax_amount'),
          ('invoices', 'discount_amount'),
          ('invoices', 'total_amount'),
          ('invoices', 'paid_amount'),
          ('invoices', 'balance'),
          ('invoice_items', 'unit_price'),
          ('invoice_items', 'discount_amount'),
          ('invoice_items', 'subtotal'),
          ('invoice_items', 'total_price'),
          ('invoice_payments', 'amount'),
          ('customers', 'balance'),
          ('customers', 'credit_limit'),
          ('transaction_lines', 'debit'),
          ('transaction_lines', 'credit')
        ) AS cols(table_name, column_name)
      LOOP
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name   = t.table_name
            AND column_name  = t.column_name
            AND data_type    = 'integer'
        ) THEN
          EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE NUMERIC(15,2) USING %I::numeric(15,2)',
            t.table_name, t.column_name, t.column_name
          );
        END IF;
      END LOOP;
    END $$;
  `);
  console.log("\u2705 Migrations applied");
}