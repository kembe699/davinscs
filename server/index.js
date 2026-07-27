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
import categoryRoutes from "./routes/categories.js";
import inventoryRoutes from "./routes/inventory.js";
import procurementRoutes from "./routes/procurement.js";
import grnRoutes from "./routes/grn.js";
import billsRoutes from "./routes/bills.js";
import paymentsRoutes from "./routes/payments.js";
import accountingRoutes from "./routes/accounting.js";
import paymentTypesRoutes from "./routes/payment-types.js";
import taxRatesRoutes from "./routes/tax-rates.js";
import priceListsRoutes from "./routes/price-lists.js";
import promotionsRoutes from "./routes/promotions.js";
import countriesRoutes from "./routes/countries.js";
import companyRoutes from "./routes/company.js";
import tablesRoutes from "./routes/tables.js";
import deviceTokensRoutes from "./routes/device-tokens.js";
import notificationsRoutes from "./routes/notifications.js";
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
import menuRoutes from "./routes/menu.js";
import saasRoutes, { initSaasSchedulers } from "./routes/saas.js";
import { startDailyDigestJob } from "./jobs/dailyDigest.js";

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

// 500 requests / 15 min per IP was tripping under completely normal use:
// the POS terminal alone polls 6 endpoints every 10s while open (see
// POSMain.tsx's useEffect interval) — ~540 requests in 15 minutes from one
// idle tab, before counting any actual checkouts, plus every device behind
// the same office/NAT IP shares this bucket. Raised well above what the
// app's own background polling generates, so it's back to guarding against
// actual abuse instead of penalizing normal usage.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // ~200/min per IP — several POS terminals' worth of headroom
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please wait a moment and try again." },
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
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/procurement/grn", grnRoutes);
app.use("/api/procurement/bills", billsRoutes);
app.use("/api/procurement/payments", paymentsRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/payment-types", paymentTypesRoutes);
app.use("/api/tax-rates", taxRatesRoutes);
app.use("/api/price-lists", priceListsRoutes);
app.use("/api/promotions", promotionsRoutes);
app.use("/api/countries", countriesRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api/device-tokens", deviceTokensRoutes);
app.use("/api/notifications", notificationsRoutes);
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
app.use("/api/menu", menuRoutes);
app.use("/api/saas", saasRoutes);

// Serve React build in production
if (process.env.NODE_ENV === "production") {
  const distPath = join(__dirname, "..", "dist");
  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      // index.html and the service worker script must always be revalidated —
      // otherwise browsers can keep serving a stale SPA shell (old JS bundle,
      // old sw.js) indefinitely via heuristic caching, so fixes never reach
      // returning users until they manually clear their cache.
      if (filePath.endsWith(".html") || filePath.endsWith("sw.js")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      } else {
        // Vite build output is content-hashed (e.g. index-BflvbG4x.js), so it's
        // safe — and desirable — to cache these forever.
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }));
  app.get("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
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
    startDailyDigestJob();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("\u274c Startup failed:", err);
    process.exit(1);
  });
