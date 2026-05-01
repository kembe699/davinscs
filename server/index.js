import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pool, { rawPool } from "./db.js";
import { migrateTenant } from "./utils/schemaMigration.js";
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
import auditLogsRoutes from "./routes/audit-logs.js";
import customersRoutes from "./routes/customers.js";
import quotationsRoutes from "./routes/quotations.js";
import setupRoutes from "./routes/setup.js";
import saasRoutes, { initSaasSchedulers } from "./routes/saas.js";

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));

const PgSession = connectPgSimple(session);

app.use(helmet({
  contentSecurityPolicy: false, // disabled to not break React inline scripts or external CDNs if any
  crossOriginEmbedderPolicy: false // disabled to not break external images
}));

const allowedOrigins = [
  process.env.APP_URL,
  // Production domains
  "https://app.flippedpos.com",
  "https://flippedpos.com",
  "https://www.flippedpos.com",
  // Render.com deployments
  "https://davinscs.onrender.com",
  // Local dev
  "http://localhost:3001",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3001",
  "http://localhost:8080",
  "http://localhost:8081"
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use(session({
  store: new PgSession({ pool: rawPool, tableName: "session" }),
  secret: process.env.JWT_SECRET || "fallback-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
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
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/quotations", quotationsRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/saas", saasRoutes);

// Serve React build in production
if (process.env.NODE_ENV === "production") {
  const distPath = join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}



migrateTenant("public")
  .then(async () => {
    const { rows } = await pool.query("SELECT schema_name FROM public.tenants");
    for (const tenant of rows) {
      try {
        await migrateTenant(tenant.schema_name);
        console.log(`Migrated tenant schema: ${tenant.schema_name}`);
      } catch (err) {
        console.error(`Failed to migrate tenant schema: ${tenant.schema_name}`, err);
      }
    }
  })
  .then(() => autoSeed())
  .then(() => {
    initSaasSchedulers();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("\u274c Startup failed:", err.message);
    process.exit(1);
  });
