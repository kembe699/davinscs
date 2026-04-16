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
import categoryRoutes from "./routes/categories.js";
import inventoryRoutes from "./routes/inventory.js";
import procurementRoutes from "./routes/procurement.js";
import accountingRoutes from "./routes/accounting.js";
import cartRoutes from "./routes/cart.js";
import checkoutRoutes from "./routes/checkout.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));

const PgSession = connectPgSimple(session);

app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? process.env.APP_URL 
    : "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(session({
  store: new PgSession({ pool, tableName: "session" }),
  secret: process.env.JWT_SECRET || "fallback-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  }
}));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);

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
      created_by INTEGER REFERENCES users(id)
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
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      received_quantity INTEGER DEFAULT 0,
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
      notes TEXT,
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
