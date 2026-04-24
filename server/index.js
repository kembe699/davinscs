import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pool from "./db.js";
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
import quotationsRoutes, { migrateQuotations } from "./routes/quotations.js";
import setupRoutes from "./routes/setup.js";
import saasRoutes, { initSaasSchedulers } from "./routes/saas.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));

const PgSession = connectPgSimple(session);

const allowedOrigins = process.env.NODE_ENV === "production"
  ? [
      "https://flippedpos.com",
      "https://www.flippedpos.com",
      "https://flippedpos.onrender.com",
      "https://flippedpos-website.onrender.com",
      ...(process.env.APP_URL ? [process.env.APP_URL] : []),
    ]
  : ["http://localhost:5173", "http://localhost:5174", "http://flippedadmin.localhost:5174", "http://localhost:8080", "http://localhost:5175", "http://localhost:3000", "http://localhost:8081"];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
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
  .then(() => migrateQuotations(pool))
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
