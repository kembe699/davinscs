import pool from "./db.js";


export async function autoSeed() {
  // ── RBAC only ────────────────────────────────────────────────────────────────
  // autoSeed no longer touches any business data (categories, products, suppliers,
  // accounts, currencies, payment_types, company_settings, etc.).
  // All business data is created by the onboarding wizard (setup/complete) or
  // added manually by the admin after first login.
  // Only permissions + roles are seeded here because they are internal system
  // infrastructure, not client-owned data.

  // ── Permissions seed ───────────────────────────────────────────────────────
  const allPermissions = [
    // Dashboard
    { key: "dashboard.view",             name: "View Dashboard",              group_name: "Dashboard",    description: "Access the admin dashboard" },
    // POS
    { key: "pos.access",                 name: "Access POS Terminal",         group_name: "POS",          description: "Use the point-of-sale terminal" },
    { key: "pos.sales_history",          name: "View Sales History",          group_name: "POS",          description: "View POS sales history" },
    { key: "pos.cash_management",        name: "Cash Management",             group_name: "POS",          description: "Manage cash drawer sessions" },
    { key: "pos.end_of_day",             name: "End of Day",                  group_name: "POS",          description: "Run end-of-day reports" },
    { key: "pos.void_sale",              name: "Void Sale",                   group_name: "POS",          description: "Void a completed POS sale" },
    // Orders
    { key: "orders.view",                name: "View Orders",                 group_name: "Orders",       description: "View customer orders" },
    { key: "orders.manage",              name: "Manage Orders",               group_name: "Orders",       description: "Create, update and cancel orders" },
    // Products
    { key: "products.view",              name: "View Products",               group_name: "Products",     description: "View product catalogue" },
    { key: "products.create",            name: "Create Products",             group_name: "Products",     description: "Add new products" },
    { key: "products.edit",              name: "Edit Products",               group_name: "Products",     description: "Edit existing products" },
    { key: "products.delete",            name: "Delete Products",             group_name: "Products",     description: "Delete products" },
    // Categories
    { key: "categories.view",            name: "View Categories",             group_name: "Categories",   description: "View product categories" },
    { key: "categories.manage",          name: "Manage Categories",           group_name: "Categories",   description: "Create, edit and delete categories" },
    // Inventory
    { key: "inventory.view",             name: "View Inventory",              group_name: "Inventory",    description: "View stock levels" },
    { key: "inventory.adjust",           name: "Adjust Inventory",            group_name: "Inventory",    description: "Adjust stock quantities" },
    // Procurement
    { key: "procurement.view",           name: "View Procurement",            group_name: "Procurement",  description: "View purchase orders" },
    { key: "procurement.manage",         name: "Manage Procurement",          group_name: "Procurement",  description: "Create and manage purchase orders" },
    // Accounting
    { key: "accounting.view",            name: "View Accounting",             group_name: "Accounting",   description: "View financial transactions" },
    { key: "accounting.manage",          name: "Manage Accounting",           group_name: "Accounting",   description: "Create and manage transactions" },
    // Reports
    { key: "reports.view",               name: "View Reports",                group_name: "Reports",      description: "Generate and view all reports" },
    // Invoices
    { key: "invoices.view",              name: "View Invoices",               group_name: "Invoices",     description: "View invoices" },
    { key: "invoices.create",            name: "Create Invoices",             group_name: "Invoices",     description: "Create new invoices" },
    { key: "invoices.record_payment",    name: "Record Invoice Payments",     group_name: "Invoices",     description: "Record full or partial payments" },
    { key: "invoices.void",              name: "Void Invoices",               group_name: "Invoices",     description: "Void invoices" },
    // Settings
    { key: "payment_types.view",         name: "View Payment Types",          group_name: "Settings",     description: "View payment types" },
    { key: "payment_types.manage",       name: "Manage Payment Types",        group_name: "Settings",     description: "Create, edit and delete payment types" },
    { key: "tax_rates.view",             name: "View Tax Rates",              group_name: "Settings",     description: "View tax rates" },
    { key: "tax_rates.manage",           name: "Manage Tax Rates",            group_name: "Settings",     description: "Create, edit and delete tax rates" },
    { key: "currencies.view",            name: "View Currencies",             group_name: "Settings",     description: "View currencies" },
    { key: "currencies.manage",          name: "Manage Currencies",           group_name: "Settings",     description: "Manage currencies and exchange rates" },
    { key: "price_lists.view",           name: "View Price Lists",            group_name: "Settings",     description: "View price lists" },
    { key: "price_lists.manage",         name: "Manage Price Lists",          group_name: "Settings",     description: "Create, edit and delete price lists" },
    { key: "promotions.view",            name: "View Promotions",             group_name: "Settings",     description: "View promotions" },
    { key: "promotions.manage",          name: "Manage Promotions",           group_name: "Settings",     description: "Create, edit and delete promotions" },
    { key: "company.view",               name: "View Company Settings",       group_name: "Settings",     description: "View company information" },
    { key: "company.manage",             name: "Manage Company Settings",     group_name: "Settings",     description: "Edit company information" },
    // Users
    { key: "users.view",                 name: "View Users",                  group_name: "Users",        description: "View system users" },
    { key: "users.manage",               name: "Manage Users",                group_name: "Users",        description: "Create, edit and delete users" },
    { key: "users.manage_roles",         name: "Manage Roles & Permissions",  group_name: "Users",        description: "Create and assign roles and permissions" },
  ];

  for (const p of allPermissions) {
    await pool.query(
      `INSERT INTO permissions (key, name, description, group_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, group_name=EXCLUDED.group_name`,
      [p.key, p.name, p.description, p.group_name]
    );
  }

  // ── Roles seed ─────────────────────────────────────────────────────────────
  // Admin role
  const adminRoleRes = await pool.query(
    `INSERT INTO roles (name, description) VALUES ('Admin', 'Full access to all system features')
     ON CONFLICT (name) DO UPDATE SET description=EXCLUDED.description RETURNING id`
  );
  const adminRoleId = adminRoleRes.rows[0].id;

  // Cashier role
  const cashierRoleRes = await pool.query(
    `INSERT INTO roles (name, description) VALUES ('Cashier', 'POS and invoice access for sales staff')
     ON CONFLICT (name) DO UPDATE SET description=EXCLUDED.description RETURNING id`
  );
  const cashierRoleId = cashierRoleRes.rows[0].id;

  // Assign ALL permissions to Admin
  const { rows: allPermsRows } = await pool.query("SELECT id FROM permissions");
  for (const p of allPermsRows) {
    await pool.query(
      "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [adminRoleId, p.id]
    );
  }

  // Assign Cashier permissions
  const cashierPermKeys = [
    "dashboard.view",
    "pos.access", "pos.sales_history", "pos.cash_management", "pos.end_of_day", "pos.void_sale",
    "orders.view",
    "products.view", "categories.view", "inventory.view",
    "invoices.view", "invoices.create", "invoices.record_payment",
  ];
  for (const key of cashierPermKeys) {
    await pool.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT $1, id FROM permissions WHERE key = $2
       ON CONFLICT DO NOTHING`,
      [cashierRoleId, key]
    );
  }

  // ── SaaS Admin seed ────────────────────────────────────────────────────────
  const bcrypt = await import("bcryptjs");
  const saasAdminEmail = "admin@flippedpos.com";
  const { rows: saasAdmins } = await pool.query("SELECT * FROM public.saas_admins WHERE email = $1", [saasAdminEmail]);
  if (saasAdmins.length === 0) {
    const hash = await bcrypt.default.hash("password", 10);
    await pool.query(
      "INSERT INTO public.saas_admins (email, password_hash, name) VALUES ($1, $2, $3)",
      [saasAdminEmail, hash, "FlippedPOS Admin"]
    );
    console.log("✅ Seeded default SaaS admin: admin@flippedpos.com / password");
  }

  // ── Pricing Plans seed (public schema only) ───────────────────────────────
  const { tenantStorage } = await import('./tenantStorage.js');
  const currentSchema = tenantStorage.getStore() || 'public';
  if (currentSchema === 'public') {
    const defaultPlans = [
      {
        name: 'Free Trial', price: 'Free', sub_label: '7 days', highlight: false, sort_order: 0,
        description: 'Try the full POS free for 7 days — no credit card required.',
        features: JSON.stringify(['Full POS terminal','Inventory management','Basic reports','Unlimited products','Receipt printing','Community support']),
        cta_label: 'Start Free Trial', cta_href: '/register',
      },
      {
        name: 'Professional', price: '$29', sub_label: 'per month', highlight: true, sort_order: 1,
        description: 'Fully hosted and managed by us. We handle updates, backups, and uptime.',
        features: JSON.stringify(['Everything in the Free Trial','Cloud hosting included','Automatic backups','Custom domain','Priority support','Email notifications','Multi-user access','Advanced analytics']),
        cta_label: 'Get Started', cta_href: '/register',
      },
      {
        name: 'Enterprise', price: 'Custom', sub_label: 'contact us', highlight: false, sort_order: 2,
        description: 'For chains, franchises, or businesses with custom requirements.',
        features: JSON.stringify(['Everything in Professional','Multiple branches','Custom integrations','Dedicated server','On-site training','SLA guarantee','White-label option']),
        cta_label: 'Contact Sales', cta_href: '#contact',
      },
      {
        name: 'Mobile plan', price: '$15', sub_label: 'per month', highlight: true, sort_order: 3,
        description: 'Designed exclusively for small business owners on the go using smartphones.',
        features: JSON.stringify(['Mobile App Access','Basic POS Terminal','Simplified Inventory','Add Products easily','Track Sales & History','Unlimited cashiers']),
        cta_label: 'Get Mobile', cta_href: '/register?plan=mobile',
      },
    ];

    const { rows: existingPlans } = await pool.query('SELECT COUNT(*) FROM public.pricing_plans');
    if (parseInt(existingPlans[0].count) === 0) {
      for (const p of defaultPlans) {
        await pool.query(
          `INSERT INTO public.pricing_plans (name, price, sub_label, description, features, cta_label, cta_href, highlight, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [p.name, p.price, p.sub_label, p.description, p.features, p.cta_label, p.cta_href, p.highlight, p.sort_order]
        );
      }
      console.log('✅ Seeded default pricing plans');
    }
  }

  console.log("✅ Auto-seed complete (RBAC & SaaS Admin)");
}
