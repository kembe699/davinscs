import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pool from "./db.js";
import { autoSeed } from "./autoSeed.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import categoryRoutes from "./routes/categories.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);

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
