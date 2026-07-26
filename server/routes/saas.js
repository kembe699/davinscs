import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db.js';

import { migrateTenant } from '../utils/schemaMigration.js';
import { tenantStorage } from '../tenantStorage.js';
import { clearTenantCache, requireAuth } from '../middleware/auth.js';
import { sendWelcomeEmail, sendInvoiceCreatedEmail, sendInvoicePaidEmail, sendExpiryReminderEmail, sendAccountExpiredEmail, sendContactEnquiryEmail } from '../utils/email.js';
import { submitOrder, getTransactionStatus, registerIPN } from '../pesapal.js';

// Generate a human-readable, unique customer code  e.g. FP-A3BX-9K2M
function generateCustomerCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
  return `FP-${part1}-${part2}`;
}

// Safe PostgreSQL identifier / URL slug: lowercase, strip non-alphanumeric, truncate
function safeIdentifier(raw, maxLen) {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, maxLen) || 'tenant';
}

// Billing period → number of days
function periodDays(period) {
  return { monthly: 30, quarterly: 90, annual: 365 }[period] ?? 30;
}

const router = express.Router();

// Customer Self-Registration Endpoint
router.post('/register', async (req, res) => {
  const { businessName, email, password } = req.body;
  if (!businessName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let schemaName, tenantId;
  try {
    // 1. Check if email already exists
    const existing = await pool.query('SELECT 1 FROM public.tenant_users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // 2. Build schema name — cap business-name portion at 41 chars to stay under PG 63-char limit
    const timestamp = Date.now();
    schemaName = `tenant_${safeIdentifier(businessName, 41)}_${timestamp}`;

    // 3. Unique customer code via real DB query on every iteration
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    let customerCode = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCustomerCode();
      const { rows } = await pool.query(
        'SELECT COUNT(*) FROM public.tenants WHERE customer_code = $1',
        [candidate]
      );
      if (parseInt(rows[0].count) === 0) { customerCode = candidate; break; }
    }
    if (!customerCode) return res.status(500).json({ error: 'CODE_GENERATION_FAILED' });

    // 4. Unique tenant slug
    const baseSlug = safeIdentifier(businessName, 30);
    let tenantSlug = baseSlug;
    for (let n = 2; n <= 99; n++) {
      const { rows } = await pool.query('SELECT 1 FROM public.tenants WHERE tenant_slug = $1', [tenantSlug]);
      if (rows.length === 0) break;
      tenantSlug = `${baseSlug}${n}`;
    }

    // 5. Insert public.tenants + public.tenant_users in a single transaction
    const passwordHash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tenantRes = await client.query(
        'INSERT INTO public.tenants (business_name, schema_name, customer_code, tenant_slug, status, trial_ends_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [businessName, schemaName, customerCode, tenantSlug, 'trial', trialEndsAt]
      );
      tenantId = tenantRes.rows[0].id;
      await client.query(
        'INSERT INTO public.tenant_users (email, tenant_id, schema_name, password_hash) VALUES ($1,$2,$3,$4)',
        [email.toLowerCase(), tenantId, schemaName, passwordHash]
      );
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // 6. Provision schema — on failure clean up the public.* records
    try {
      await pool.query(`CREATE SCHEMA "${schemaName}"`);
      await tenantStorage.run(schemaName, async () => {
        await migrateTenant(schemaName);
        const { autoSeed } = await import('../autoSeed.js');
        await autoSeed();
      });
    } catch (provisionErr) {
      await pool.query('DELETE FROM public.tenant_users WHERE tenant_id = $1', [tenantId]).catch(() => {});
      await pool.query('DELETE FROM public.tenants WHERE id = $1', [tenantId]).catch(() => {});
      await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => {});
      throw provisionErr;
    }

    sendWelcomeEmail(email, businessName, customerCode, schemaName, tenantSlug, trialEndsAt).catch(e => console.error('Welcome email error:', e));

    res.status(201).json({ message: 'Instance created successfully', schemaName, customerCode, tenantSlug });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to provision instance' });
  }
});



// ── Master API: Offline Sync Endpoint ────────────────────────────────────────
// Central server endpoint: returns tenant and user details for offline provisioning
router.post('/offline/sync-tenant', async (req, res) => {
  const { customerCode } = req.body;
  if (!customerCode) return res.status(400).json({ error: 'customerCode required' });

  try {
    const tRes = await pool.query(
      'SELECT id, business_name, schema_name, customer_code, tenant_slug, status, trial_ends_at, subscription_start, subscription_end FROM public.tenants WHERE UPPER(customer_code) = UPPER($1)',
      [customerCode.trim()]
    );
    const tenant = tRes.rows[0];
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const tuRes = await pool.query(
      'SELECT email, password_hash FROM public.tenant_users WHERE tenant_id = $1',
      [tenant.id]
    );
    const users = tuRes.rows;

    res.json({ tenant, users });
  } catch (err) {
    console.error('Offline sync-tenant error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Universal Portal Lookup — validate customer code, return schema + setup status
router.post('/lookup', async (req, res) => {
  const { customerCode } = req.body;
  if (!customerCode) return res.status(400).json({ error: 'Customer code is required' });

  try {
    let result = await pool.query(
      'SELECT * FROM public.tenants WHERE UPPER(customer_code) = UPPER($1)',
      [customerCode.trim()]
    );
    let tenant = result.rows[0];

    // --- Offline Mode Interceptor ---
    if (!tenant && process.env.OFFLINE_MODE === 'true' && process.env.MASTER_API_URL) {
      try {
        console.log(`[Offline] Fetching tenant ${customerCode} from Master API...`);
        const syncResponse = await fetch(`${process.env.MASTER_API_URL}/api/saas/offline/sync-tenant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerCode })
        });
        
        if (syncResponse.ok) {
          const { tenant: remoteTenant, users: remoteUsers } = await syncResponse.json();
          if (remoteTenant) {
            console.log(`[Offline] Provisioning local instance for ${remoteTenant.schema_name}...`);
            
            // Insert into local DB
            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              
              const newTRes = await client.query(
                `INSERT INTO public.tenants (business_name, schema_name, customer_code, tenant_slug, status, trial_ends_at, subscription_start, subscription_end) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [remoteTenant.business_name, remoteTenant.schema_name, remoteTenant.customer_code, remoteTenant.tenant_slug, remoteTenant.status, remoteTenant.trial_ends_at, remoteTenant.subscription_start, remoteTenant.subscription_end]
              );
              tenant = newTRes.rows[0];
              
              if (remoteUsers && remoteUsers.length > 0) {
                for (const u of remoteUsers) {
                  await client.query(
                    `INSERT INTO public.tenant_users (email, tenant_id, schema_name, password_hash) VALUES ($1, $2, $3, $4)`,
                    [u.email, tenant.id, tenant.schema_name, u.password_hash]
                  );
                }
              }
              
              await client.query('COMMIT');
            } catch (txErr) {
              await client.query('ROLLBACK');
              throw txErr;
            } finally {
              client.release();
            }

            // Create schema and run migrations
            await pool.query(`CREATE SCHEMA IF NOT EXISTS "${tenant.schema_name}"`);
            await tenantStorage.run(tenant.schema_name, async () => {
              const { migrateTenant } = await import('../utils/schemaMigration.js');
              await migrateTenant(tenant.schema_name);
              const { autoSeed } = await import('../autoSeed.js');
              await autoSeed();
            });
            console.log(`[Offline] Successfully synced and provisioned ${tenant.schema_name}`);
          }
        } else {
          console.log(`[Offline] Master API returned status ${syncResponse.status}`);
        }
      } catch (syncErr) {
        console.error('[Offline] Error fetching from Master API:', syncErr.message);
      }
    }
    // --- End Offline Mode Interceptor ---

    if (!tenant) return res.status(404).json({ error: 'Invalid customer code. Please check and try again.' });

    if (tenant.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended. Please contact support.' });
    }
    if (tenant.status === 'trial') {
      const trialEnds = new Date(tenant.trial_ends_at);
      if (trialEnds < new Date()) {
        return res.status(403).json({ error: 'Your 7-day trial has expired. Please contact support to continue.' });
      }
    }

    // Lazy backfill: if this tenant was registered before tenant_slug was added, generate one now
    if (!tenant.tenant_slug) {
      const baseSlug = safeIdentifier(tenant.business_name, 30);
      let tenantSlug = baseSlug;
      for (let n = 2; n <= 99; n++) {
        const slugCheck = await pool.query('SELECT 1 FROM public.tenants WHERE tenant_slug = $1', [tenantSlug]);
        if (slugCheck.rows.length === 0) break;
        tenantSlug = `${baseSlug}${n}`;
      }
      await pool.query('UPDATE public.tenants SET tenant_slug = $1 WHERE id = $2', [tenantSlug, tenant.id]);
      tenant.tenant_slug = tenantSlug;
    }

    // Setup is considered complete only when company_settings has been configured.
    // A schema may already have users from an older registration flow but no
    // company info — in that case setup still needs to run.
    let needsSetup = true;
    await tenantStorage.run(tenant.schema_name, async () => {
      const { rows } = await pool.query('SELECT COUNT(*) FROM company_settings');
      needsSetup = parseInt(rows[0].count) === 0;
    });

    res.json({
      businessName: tenant.business_name,
      schemaName: tenant.schema_name,
      tenantSlug: tenant.tenant_slug,
      needsSetup,
      status: tenant.status,
    });
  } catch (err) {
    console.error('Portal lookup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resolve tenant info by slug (used by frontend TenantRoot / SetupGuard)
router.get('/tenant/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const result = await pool.query(
      'SELECT business_name, schema_name, tenant_slug, status, trial_ends_at, subscription_end FROM public.tenants WHERE tenant_slug = $1',
      [slug.toLowerCase()]
    );
    const tenant = result.rows[0];
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const isExpiredTrial = tenant.status === 'trial' && new Date(tenant.trial_ends_at) < new Date();
    const effectiveStatus = isExpiredTrial ? 'suspended' : tenant.status;

    let needsSetup = true;
    await tenantStorage.run(tenant.schema_name, async () => {
      const { rows } = await pool.query('SELECT COUNT(*) FROM company_settings');
      needsSetup = parseInt(rows[0].count) === 0;
    });

    res.json({
      businessName: tenant.business_name,
      schemaName: tenant.schema_name,
      tenantSlug: tenant.tenant_slug,
      needsSetup,
      status: effectiveStatus,
      trialEndsAt: tenant.trial_ends_at || null,
      subscriptionEnd: tenant.subscription_end || null,
    });
  } catch (err) {
    console.error('Tenant slug lookup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Re-provision an existing tenant schema (fixes tenants created before the isolation fix)
// Called with { customerCode } — no auth needed, anyone who knows the code can trigger it
router.post('/reprovision', async (req, res) => {
  const { customerCode } = req.body;
  if (!customerCode) return res.status(400).json({ error: 'customerCode required' });
  try {
    const result = await pool.query(
      'SELECT * FROM public.tenants WHERE UPPER(customer_code) = UPPER($1)',
      [customerCode.trim()]
    );
    const tenant = result.rows[0];
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    await tenantStorage.run(tenant.schema_name, async () => {
      await migrateTenant(tenant.schema_name);
      const { autoSeed } = await import('../autoSeed.js');
      await autoSeed();
    });

    console.log(`[reprovision] Re-provisioned schema ${tenant.schema_name} for ${tenant.business_name}`);
    res.json({ ok: true, message: `Schema ${tenant.schema_name} re-provisioned successfully` });
  } catch (err) {
    console.error('Reprovision error:', err);
    res.status(500).json({ error: 'Reprovision failed', detail: err.message });
  }
});

// SaaS Master Admin Login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM public.saas_admins WHERE email = $1', [email]);
    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, is_saas_admin: true },
      process.env.JWT_SECRET || 'fallback-secret-change-in-production',
      { expiresIn: '1d' }
    );

    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (err) {
    console.error('SaaS Login Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware to verify SaaS Admin
const requireSaasAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-in-production');
    if (!decoded.is_saas_admin) {
      return res.status(403).json({ error: 'Forbidden: Requires SaaS Admin' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// List all tenants
router.get('/tenants', requireSaasAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, 
             (SELECT COUNT(*) FROM public.tenant_users tu WHERE tu.tenant_id = t.id) as user_count
      FROM public.tenants t
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('List tenants error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public — get all pricing plans (used by website Pricing component + Register page)
router.get('/pricing', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM public.pricing_plans ORDER BY sort_order ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Get pricing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SaaS Admin — create a new pricing plan
router.post('/pricing', requireSaasAdmin, async (req, res) => {
  const { name, price, sub_label = 'per month', description = '', features = [], cta_label = 'Get Started', cta_href = '/register', highlight = false, billing_period = 'monthly' } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price are required' });
  try {
    const { rows: existing } = await pool.query('SELECT MAX(sort_order) AS max FROM public.pricing_plans');
    const nextOrder = (existing[0]?.max ?? -1) + 1;
    const { rows } = await pool.query(
      `INSERT INTO public.pricing_plans (name, price, sub_label, description, features, cta_label, cta_href, highlight, sort_order, billing_period)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, price, sub_label, description, JSON.stringify(features), cta_label, cta_href, highlight, nextOrder, billing_period]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create pricing plan error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SaaS Admin — update a pricing plan
router.put('/pricing/:id', requireSaasAdmin, async (req, res) => {
  const { name, price, sub_label, description, features, cta_label, cta_href, highlight, billing_period = 'monthly' } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE public.pricing_plans
       SET name=$1, price=$2, sub_label=$3, description=$4, features=$5,
           cta_label=$6, cta_href=$7, highlight=$8, billing_period=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, price, sub_label, description, JSON.stringify(features), cta_label, cta_href, highlight, billing_period, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Plan not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update pricing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SaaS Admin — delete a pricing plan
router.delete('/pricing/:id', requireSaasAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM public.pricing_plans WHERE id=$1 RETURNING id', [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Plan not found' });
    res.json({ ok: true, deleted: rows[0].id });
  } catch (err) {
    console.error('Delete pricing plan error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SaaS Admin — reorder plans (accepts array of { id, sort_order })
router.put('/pricing-reorder', requireSaasAdmin, async (req, res) => {
  const { order } = req.body; // [{ id: 1, sort_order: 0 }, ...]
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });
  try {
    await Promise.all(
      order.map(({ id, sort_order }) =>
        pool.query('UPDATE public.pricing_plans SET sort_order=$1 WHERE id=$2', [sort_order, id])
      )
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Reorder pricing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SaaS Admin — tenant stats with per-schema DB size
router.get('/tenants/stats', requireSaasAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.id, t.business_name, t.schema_name, t.customer_code, t.tenant_slug,
        t.status, t.trial_ends_at, t.subscription_start, t.subscription_end, t.created_at,
        (SELECT COUNT(*) FROM public.tenant_users tu WHERE tu.tenant_id = t.id) AS user_count,
        COALESCE((
          SELECT SUM(pg_total_relation_size(quote_ident(t.schema_name) || '.' || quote_ident(c.relname)))
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = t.schema_name AND c.relkind = 'r'
        ), 0) AS db_size_bytes
      FROM public.tenants t
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Tenant stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update tenant status
router.put('/tenants/:id/status', requireSaasAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['active', 'trial', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const result = await pool.query(
      'UPDATE public.tenants SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update tenant status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Permanently delete a tenant — drops their entire schema (all POS data) and
// removes their row from public.tenants. Cascades to tenant_users,
// tenant_db_snapshots, and saas_billing via existing ON DELETE CASCADE FKs.
// Irreversible — the frontend requires typing the customer code to confirm.
router.delete('/tenants/:id', requireSaasAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT schema_name, customer_code, business_name FROM public.tenants WHERE id = $1',
      [req.params.id]
    );
    const tenant = rows[0];
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    await client.query('BEGIN');
    await client.query(`DROP SCHEMA IF EXISTS "${tenant.schema_name}" CASCADE`);
    await client.query('DELETE FROM public.tenants WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');

    clearTenantCache(tenant.schema_name);
    res.json({ ok: true, business_name: tenant.business_name, customer_code: tenant.customer_code });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete tenant error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ── Billing / Invoices ────────────────────────────────────────────────────────

function generateInvoiceNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FP-INV-${ts}-${rand}`;
}

// List all invoices (joined with tenant info)
router.get('/billing', requireSaasAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*, t.business_name, t.customer_code, t.tenant_slug
      FROM public.saas_billing b
      JOIN public.tenants t ON t.id = b.tenant_id
      ORDER BY b.issued_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('List billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new invoice
router.post('/billing', requireSaasAdmin, async (req, res) => {
  const { tenant_id, plan_name, amount, currency = 'USD', notes = '', billing_period = 'monthly' } = req.body;
  if (!tenant_id || amount == null) {
    return res.status(400).json({ error: 'tenant_id and amount are required' });
  }
  try {
    let invoiceNumber;
    for (let i = 0; i < 5; i++) {
      const candidate = generateInvoiceNumber();
      const { rows } = await pool.query(
        'SELECT 1 FROM public.saas_billing WHERE invoice_number = $1', [candidate]
      );
      if (rows.length === 0) { invoiceNumber = candidate; break; }
    }
    if (!invoiceNumber) return res.status(500).json({ error: 'Invoice number generation failed' });

    const { rows } = await pool.query(
      `INSERT INTO public.saas_billing (invoice_number, tenant_id, plan_name, amount, currency, notes, billing_period)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [invoiceNumber, tenant_id, plan_name || '', parseFloat(amount), currency, notes, billing_period]
    );

    const tuRes = await pool.query('SELECT email FROM public.tenant_users WHERE tenant_id = $1 LIMIT 1', [tenant_id]);
    const customerEmail = tuRes.rows[0]?.email;
    if (customerEmail) {
      sendInvoiceCreatedEmail(customerEmail, invoiceNumber, plan_name, amount).catch(console.error);
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper to activate subscription
async function activateSubscription(invoiceId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Mark invoice paid
    const invRes = await client.query(
      `UPDATE public.saas_billing SET status='paid', paid_at=NOW() WHERE id=$1 AND status='pending' RETURNING *`,
      [invoiceId]
    );
    if (!invRes.rows[0]) {
      await client.query('ROLLBACK');
      return null; // Already paid or not found
    }
    const inv = invRes.rows[0];

    // 2. Calculate new subscription window
    const days = periodDays(inv.billing_period || 'monthly');

    const tenantRes = await client.query(
      `SELECT status, subscription_end, schema_name FROM public.tenants WHERE id = $1`, [inv.tenant_id]
    );
    const tenant = tenantRes.rows[0];
    const baseDate = (tenant?.status === 'active' && tenant?.subscription_end && new Date(tenant.subscription_end) > new Date())
      ? new Date(tenant.subscription_end)
      : new Date();
    const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    // 3. Activate tenant
    await client.query(
      `UPDATE public.tenants
       SET status = 'active',
           subscription_start = CASE WHEN status <> 'active' THEN NOW() ELSE subscription_start END,
           subscription_end = $1,
           expiry_reminder_sent_at = NULL
       WHERE id = $2`,
      [newEnd.toISOString(), inv.tenant_id]
    );

    await client.query('COMMIT');

    const tuRes = await pool.query('SELECT email FROM public.tenant_users WHERE tenant_id = $1 LIMIT 1', [inv.tenant_id]);
    const customerEmail = tuRes.rows[0]?.email;
    if (customerEmail) {
      sendInvoicePaidEmail(customerEmail, inv.invoice_number, inv.amount, newEnd).catch(console.error);
    }

    clearTenantCache(tenant?.schema_name);
    return { ...inv, status: 'paid', paid_at: new Date().toISOString() };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Mark invoice as paid → activate subscription window
router.put('/billing/:id/pay', requireSaasAdmin, async (req, res) => {
  try {
    const inv = await activateSubscription(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found or already paid' });
    res.json(inv);
  } catch (err) {
    console.error('Pay invoice error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SaaS Admin — Get all administrators
router.get('/admins', requireSaasAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, name, created_at FROM public.saas_admins ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get admins error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SaaS Admin — Create a new administrator
router.post('/admins', requireSaasAdmin, async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO public.saas_admins (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, name, passwordHash]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    console.error('Create admin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SaaS Admin — Delete an administrator
router.delete('/admins/:id', requireSaasAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await pool.query('DELETE FROM public.saas_admins WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete admin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SaaS Admin — Get specific tenant details and DB history
router.get('/tenants/:id/details', requireSaasAdmin, async (req, res) => {
  try {
    const tenantId = req.params.id;
    const usersRes = await pool.query('SELECT id, email, created_at FROM public.tenant_users WHERE tenant_id = $1', [tenantId]);
    const historyRes = await pool.query(
      `SELECT size_bytes, recorded_at
       FROM public.tenant_db_snapshots
       WHERE tenant_id = $1
       ORDER BY recorded_at ASC
       LIMIT 90`,
      [tenantId]
    );
    res.json({ users: usersRes.rows, history: historyRes.rows });
  } catch (err) {
    console.error('Tenant details error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SaaS Admin — Global DB history
router.get('/tenants/db-history-global', requireSaasAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DATE_TRUNC('day', recorded_at) AS date, SUM(size_bytes) AS total_size
       FROM (
         SELECT tenant_id, size_bytes, recorded_at,
                ROW_NUMBER() OVER (PARTITION BY tenant_id, DATE_TRUNC('day', recorded_at) ORDER BY recorded_at DESC) as rn
         FROM public.tenant_db_snapshots
       ) t
       WHERE rn = 1
       GROUP BY DATE_TRUNC('day', recorded_at)
       ORDER BY date ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Global DB history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Customer Portal Auth ─────────────────────────────────────────────────────

const requireCustomer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-in-production');
    if (!decoded.is_customer) return res.status(403).json({ error: 'Forbidden' });
    req.customer = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Customer login
router.post('/customer/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const tuRes = await pool.query(
      `SELECT tu.*, t.business_name, t.customer_code, t.tenant_slug, t.status,
              t.trial_ends_at, t.subscription_start, t.subscription_end, t.created_at AS tenant_created_at
       FROM public.tenant_users tu
       JOIN public.tenants t ON t.id = tu.tenant_id
       WHERE LOWER(tu.email) = LOWER($1)`,
      [email.trim()]
    );
    const user = tuRes.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.password_hash) return res.status(401).json({ error: 'No password set. Please contact support.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    // Status enforcement
    const now = new Date();
    if (user.status === 'suspended') return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended. Please contact support.' });
    if (user.status === 'trial' && new Date(user.trial_ends_at) < now) return res.status(403).json({ error: 'TRIAL_EXPIRED', message: 'Your 7-day trial has expired. Please pay an invoice to continue.' });
    if (user.status === 'active' && user.subscription_end && new Date(user.subscription_end) < now) return res.status(403).json({ error: 'SUBSCRIPTION_EXPIRED', message: 'Your subscription has expired. Please renew to continue.' });

    const token = jwt.sign(
      { tenant_user_id: user.id, tenant_id: user.tenant_id, schema_name: user.schema_name, email: user.email, is_customer: true },
      process.env.JWT_SECRET || 'fallback-secret-change-in-production',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      tenant: {
        business_name: user.business_name,
        customer_code: user.customer_code,
        tenant_slug: user.tenant_slug,
        schema_name: user.schema_name,
        status: user.status,
        trial_ends_at: user.trial_ends_at,
        subscription_start: user.subscription_start,
        subscription_end: user.subscription_end,
        created_at: user.tenant_created_at,
        email: user.email,
      }
    });
  } catch (err) {
    console.error('Customer login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Customer — DB growth history
router.get('/customer/db-history', requireCustomer, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT size_bytes, recorded_at
       FROM public.tenant_db_snapshots
       WHERE tenant_id = $1
       ORDER BY recorded_at ASC
       LIMIT 90`,
      [req.customer.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('DB history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Customer — get own account info
router.get('/customer/me', requireCustomer, async (req, res) => {
  try {
    const tenantId = req.customer.tenant_id;
    const schemaName = req.customer.schema_name;

    // Tenant info
    const tRes = await pool.query(
      `SELECT id, business_name, customer_code, tenant_slug, schema_name, status,
              trial_ends_at, subscription_start, subscription_end, created_at
       FROM public.tenants WHERE id = $1`, [tenantId]
    );
    const tenant = tRes.rows[0];
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // DB usage
    const sizeRes = await pool.query(
      `SELECT COALESCE(SUM(pg_total_relation_size(quote_ident($1) || '.' || quote_ident(c.relname))), 0) AS db_size_bytes
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = $1 AND c.relkind = 'r'`,
      [schemaName]
    );
    const db_size_bytes = parseInt(sizeRes.rows[0]?.db_size_bytes || 0);

    // Billing invoices
    const billRes = await pool.query(
      `SELECT id, invoice_number, plan_name, amount, currency, billing_period, status, issued_at, paid_at
       FROM public.saas_billing WHERE tenant_id = $1 ORDER BY issued_at DESC`,
      [tenantId]
    );

    res.json({
      tenant: { ...tenant, email: req.customer.email },
      db_size_bytes,
      invoices: billRes.rows,
    });
  } catch (err) {
    console.error('Customer me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Customer — pay existing invoice
router.post('/customer/pay-invoice', requireCustomer, async (req, res) => {
  const { invoice_id } = req.body;
  if (!invoice_id) return res.status(400).json({ error: 'invoice_id is required' });

  try {
    const tenantId = req.customer.tenant_id;
    const invRes = await pool.query(`SELECT * FROM public.saas_billing WHERE id=$1 AND tenant_id=$2`, [invoice_id, tenantId]);
    if (!invRes.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    
    const inv = invRes.rows[0];
    if (inv.status === 'paid') return res.status(400).json({ error: 'Invoice is already paid' });

    const ugxRate = parseFloat(process.env.UGX_RATE || '3700');
    const amountUgx = inv.amount * ugxRate;

    const tenantRes = await pool.query(`SELECT business_name FROM public.tenants WHERE id=$1`, [tenantId]);
    const businessName = tenantRes.rows[0]?.business_name || 'Customer';

    const orderData = await submitOrder({
      id: inv.invoice_number,
      amount: amountUgx,
      currency: 'UGX',
      description: `Payment for FlippedPOS Invoice ${inv.invoice_number}`,
      callback_url: `${process.env.FRONTEND_URL}/account/payment-result`,
      billing_address: {
        email_address: req.customer.email,
        phone_number: '',
        first_name: businessName,
        last_name: ''
      }
    });

    await pool.query(
      `UPDATE public.saas_billing SET pesapal_tracking_id=$1, pesapal_merchant_ref=$2 WHERE id=$3`,
      [orderData.order_tracking_id, orderData.merchant_reference || inv.invoice_number, inv.id]
    );

    res.json({ redirect_url: orderData.redirect_url });
  } catch (err) {
    console.error('Pay invoice error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Customer — subscribe and pay immediately
router.post('/customer/pay-subscribe', requireCustomer, async (req, res) => {
  const { plan_id, billing_period } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

  try {
    const tenantId = req.customer.tenant_id;

    // Fetch the chosen plan
    const planRes = await pool.query(
      `SELECT * FROM public.pricing_plans WHERE id = $1`, [plan_id]
    );
    if (!planRes.rows.length) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRes.rows[0];
    const period = billing_period || plan.billing_period || 'monthly';

    // Prevent duplicate pending invoices for the same plan and period
    const dupCheck = await pool.query(
      `SELECT id FROM public.saas_billing
       WHERE tenant_id=$1 AND plan_name=$2 AND billing_period=$3 AND status='pending'`,
      [tenantId, plan.name, period]
    );
    if (dupCheck.rows.length) {
      return res.status(409).json({ error: 'You already have a pending invoice for this subscription. Please go to your Billing page to pay it.' });
    }

    // Generate unique invoice number
    let invoiceNumber;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const exists = await pool.query(
        'SELECT 1 FROM public.saas_billing WHERE invoice_number = $1', [candidate]
      );
      if (!exists.rows.length) { invoiceNumber = candidate; break; }
    }
    if (!invoiceNumber) return res.status(500).json({ error: 'Could not generate invoice number' });

    let priceNum = parseFloat((plan.price || '0').replace(/[^0-9.]/g, '')) || 0;
    if (period === 'quarterly') {
      priceNum = priceNum * 3;
    } else if (period === 'annual') {
      priceNum = priceNum * 12 * 0.95;
    }

    const inv = await pool.query(
      `INSERT INTO public.saas_billing (invoice_number, tenant_id, plan_name, amount, currency, notes, billing_period)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [invoiceNumber, tenantId, plan.name, priceNum, 'USD', `Subscription request via portal`, period]
    );

    const ugxRate = parseFloat(process.env.UGX_RATE || '3700');
    const amountUgx = priceNum * ugxRate;

    const tenantRes = await pool.query(`SELECT business_name FROM public.tenants WHERE id=$1`, [tenantId]);
    const businessName = tenantRes.rows[0]?.business_name || 'Customer';

    const orderData = await submitOrder({
      id: invoiceNumber,
      amount: amountUgx,
      currency: 'UGX',
      description: `Subscription for ${plan.name} (${period})`,
      callback_url: `${process.env.FRONTEND_URL}/account/payment-result`,
      billing_address: {
        email_address: req.customer.email,
        phone_number: '',
        first_name: businessName,
        last_name: ''
      }
    });

    await pool.query(
      `UPDATE public.saas_billing SET pesapal_tracking_id=$1, pesapal_merchant_ref=$2 WHERE id=$3`,
      [orderData.order_tracking_id, orderData.merchant_reference || invoiceNumber, inv.rows[0].id]
    );

    sendInvoiceCreatedEmail(req.customer.email, invoiceNumber, plan.name, priceNum).catch(console.error);

    res.json({ redirect_url: orderData.redirect_url });
  } catch (err) {
    console.error('Pay subscribe error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Mobile app — subscribe and pay immediately, authenticated with the same
// tenant-staff JWT the app already uses for everything else (requireAuth),
// not the separate customer-portal token the web billing dashboard uses.
// Same PesaPal submission + saas_billing bookkeeping as /customer/pay-subscribe
// above, just resolving the tenant from req.user.schema_name instead of a
// customer_token, so an already-signed-in admin can pay without a second
// login.
router.post('/staff/pay-subscribe', requireAuth, async (req, res) => {
  const { plan_id, billing_period } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });
  const schemaName = req.user.schema_name;
  if (!schemaName) return res.status(400).json({ error: 'No tenant context on this account' });

  try {
    const tenantRes = await pool.query('SELECT id, business_name FROM public.tenants WHERE schema_name = $1', [schemaName]);
    if (!tenantRes.rows.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenantId = tenantRes.rows[0].id;
    const businessName = tenantRes.rows[0].business_name || 'Customer';

    const planRes = await pool.query(`SELECT * FROM public.pricing_plans WHERE id = $1`, [plan_id]);
    if (!planRes.rows.length) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRes.rows[0];
    const period = billing_period || plan.billing_period || 'monthly';

    const dupCheck = await pool.query(
      `SELECT id FROM public.saas_billing
       WHERE tenant_id=$1 AND plan_name=$2 AND billing_period=$3 AND status='pending'`,
      [tenantId, plan.name, period]
    );
    if (dupCheck.rows.length) {
      return res.status(409).json({ error: 'You already have a pending payment for this plan — check Billing to complete it.' });
    }

    let invoiceNumber;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const exists = await pool.query('SELECT 1 FROM public.saas_billing WHERE invoice_number = $1', [candidate]);
      if (!exists.rows.length) { invoiceNumber = candidate; break; }
    }
    if (!invoiceNumber) return res.status(500).json({ error: 'Could not generate invoice number' });

    let priceNum = parseFloat((plan.price || '0').replace(/[^0-9.]/g, '')) || 0;
    if (period === 'quarterly') {
      priceNum = priceNum * 3;
    } else if (period === 'annual') {
      priceNum = priceNum * 12 * 0.95;
    }

    const inv = await pool.query(
      `INSERT INTO public.saas_billing (invoice_number, tenant_id, plan_name, amount, currency, notes, billing_period)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [invoiceNumber, tenantId, plan.name, priceNum, 'USD', `Subscription request via mobile app`, period]
    );

    const ugxRate = parseFloat(process.env.UGX_RATE || '3700');
    const amountUgx = priceNum * ugxRate;

    const orderData = await submitOrder({
      id: invoiceNumber,
      amount: amountUgx,
      currency: 'UGX',
      description: `Subscription for ${plan.name} (${period})`,
      callback_url: `${process.env.FRONTEND_URL}/account/payment-result`,
      billing_address: {
        email_address: req.user.email,
        phone_number: '',
        first_name: businessName,
        last_name: ''
      }
    });

    await pool.query(
      `UPDATE public.saas_billing SET pesapal_tracking_id=$1, pesapal_merchant_ref=$2 WHERE id=$3`,
      [orderData.order_tracking_id, orderData.merchant_reference || invoiceNumber, inv.rows[0].id]
    );

    sendInvoiceCreatedEmail(req.user.email, invoiceNumber, plan.name, priceNum).catch(console.error);

    res.json({ redirect_url: orderData.redirect_url, order_tracking_id: orderData.order_tracking_id });
  } catch (err) {
    console.error('Staff pay-subscribe error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// PesaPal Callback Route
router.get('/pesapal/callback', async (req, res) => {
  // Can be called by frontend directly or by PesaPal
  const { OrderTrackingId } = req.query;
  if (!OrderTrackingId) return res.status(400).json({ error: 'Missing OrderTrackingId' });

  try {
    const statusData = await getTransactionStatus(OrderTrackingId);
    
    // Find invoice
    const invRes = await pool.query(`SELECT id, status FROM public.saas_billing WHERE pesapal_tracking_id=$1`, [OrderTrackingId]);
    if (!invRes.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    
    const invoice = invRes.rows[0];

    // The IPN webhook can race ahead of this call and already mark the
    // invoice paid before the client polls — treat that as completed too,
    // rather than falling through to "pending" and leaving a caller stuck.
    if (invoice.status === 'paid') {
      return res.json({ status: 'completed' });
    }

    if (statusData.status_code === 1 && invoice.status === 'pending') {
      // Completed
      await activateSubscription(invoice.id);
      return res.json({ status: 'completed' });
    } else if (statusData.status_code === 2 || statusData.status_code === 3) {
      // Failed or Cancelled
      return res.json({ status: 'failed' });
    }
    
    return res.json({ status: 'pending' });
  } catch (err) {
    console.error('PesaPal callback error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PesaPal IPN Endpoint
const handleIpn = async (req, res) => {
  const OrderTrackingId = req.query.OrderTrackingId || req.body.OrderTrackingId;
  const OrderNotificationType = req.query.OrderNotificationType || req.body.OrderNotificationType;
  const OrderMerchantReference = req.query.OrderMerchantReference || req.body.OrderMerchantReference;
  
  if (!OrderTrackingId) {
    return res.status(400).json({ error: 'Missing OrderTrackingId' });
  }

  try {
    const statusData = await getTransactionStatus(OrderTrackingId);
    
    const invRes = await pool.query(`SELECT id, status FROM public.saas_billing WHERE pesapal_tracking_id=$1`, [OrderTrackingId]);
    if (!invRes.rows.length) return res.status(200).json({ status: 200, message: 'Processed but no matching invoice' });

    const invoice = invRes.rows[0];
    
    if (statusData.status_code === 1 && invoice.status === 'pending') {
      await activateSubscription(invoice.id);
    }
    
    res.status(200).json({ status: 200, message: 'IPN processed successfully' });
  } catch (err) {
    console.error('IPN processing error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

router.get('/pesapal/ipn', handleIpn);
router.post('/pesapal/ipn', handleIpn);

// ── Website Contact Form ─────────────────────────────────────────────────────
router.post('/contact', async (req, res) => {
  const { name, email, message, phone } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  try {
    await sendContactEnquiryEmail({ name, email, phone, message });

    res.json({ ok: true, message: 'Your message has been sent. We\'ll be in touch soon!' });
  } catch (err) {
    console.error('Contact email error:', err);
    res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
});

export default router;

// ── Background subscription scheduler ────────────────────────────────────────
// Runs every 15 minutes. Suspends expired trials and lapsed subscriptions.
async function runSubscriptionSweep() {
  try {
    // Send expiry reminders (7 days before expiry)
    const reminderRes = await pool.query(
      `SELECT t.id, t.business_name, t.trial_ends_at, t.subscription_end, t.status, tu.email
       FROM public.tenants t
       JOIN public.tenant_users tu ON t.id = tu.tenant_id
       WHERE t.status IN ('active', 'trial')
         AND (t.expiry_reminder_sent_at IS NULL OR t.expiry_reminder_sent_at < NOW() - INTERVAL '30 days')
         AND (
           (t.status = 'trial' AND t.trial_ends_at BETWEEN NOW() + INTERVAL '6 days' AND NOW() + INTERVAL '7 days') OR
           (t.status = 'active' AND t.subscription_end BETWEEN NOW() + INTERVAL '6 days' AND NOW() + INTERVAL '7 days')
         )`
    );
    for (const row of reminderRes.rows) {
      const expiryDate = row.status === 'trial' ? row.trial_ends_at : row.subscription_end;
      await sendExpiryReminderEmail(row.email, row.business_name, expiryDate);
      await pool.query('UPDATE public.tenants SET expiry_reminder_sent_at = NOW() WHERE id = $1', [row.id]);
      console.log(`[Subscription Sweep] Sent expiry reminder to ${row.email} (${row.business_name})`);
    }

    // Find trials and subscriptions that have just lapsed (before suspending, so we still know who to email)
    const expiringRes = await pool.query(
      `SELECT t.id, t.business_name, t.schema_name, t.tenant_slug,
              (SELECT tu.email FROM public.tenant_users tu WHERE tu.tenant_id = t.id LIMIT 1) AS email
       FROM public.tenants t
       WHERE (t.status='trial' AND t.trial_ends_at < NOW())
          OR (t.status='active' AND t.subscription_end IS NOT NULL AND t.subscription_end < NOW())`
    );
    const toSuspend = expiringRes.rows;
    if (toSuspend.length > 0) {
      await pool.query(
        `UPDATE public.tenants SET status='suspended' WHERE id = ANY($1)`,
        [toSuspend.map(r => r.id)]
      );
      toSuspend.forEach(r => {
        clearTenantCache(r.schema_name);
        if (r.email) {
          sendAccountExpiredEmail(r.email, r.business_name, r.tenant_slug)
            .catch(e => console.error('[Subscription Sweep] Expired email error:', e));
        }
      });
      console.log(`[Subscription Sweep] Suspended ${toSuspend.length} tenant(s).`);
    }
  } catch (err) {
    console.error('[Subscription Sweep] Error:', err.message);
  }
}

// Record DB size snapshot for every active tenant
async function recordDbSnapshots() {
  try {
    const { rows: tenants } = await pool.query(
      `SELECT id, schema_name FROM public.tenants WHERE status IN ('trial','active')`
    );
    for (const t of tenants) {
      const sizeRes = await pool.query(
        `SELECT COALESCE(SUM(pg_total_relation_size(quote_ident($1) || '.' || quote_ident(c.relname))), 0) AS size_bytes
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = $1 AND c.relkind = 'r'`,
        [t.schema_name]
      );
      const size = parseInt(sizeRes.rows[0]?.size_bytes || 0);
      // Only insert if last snapshot was more than 6 hours ago or doesn't exist
      const lastRes = await pool.query(
        `SELECT recorded_at FROM public.tenant_db_snapshots WHERE tenant_id=$1 ORDER BY recorded_at DESC LIMIT 1`,
        [t.id]
      );
      const last = lastRes.rows[0];
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      if (!last || new Date(last.recorded_at) < sixHoursAgo) {
        await pool.query(
          `INSERT INTO public.tenant_db_snapshots (tenant_id, schema_name, size_bytes) VALUES ($1,$2,$3)`,
          [t.id, t.schema_name, size]
        );
      }
    }
  } catch (err) {
    console.error('[DB Snapshots] Error:', err.message);
  }
}

// ── Offline Subscription Sync ─────────────────────────────────────────────────
// Runs only when OFFLINE_MODE=true. Calls the master FlippedPOS API every 6 h
// to pull the latest subscription status, trial_ends_at and subscription_end
// for every local tenant. Suspensions and expiries on the master are mirrored
// to the local Docker DB so the Admin sidebar timer and suspension screen stay
// accurate even when running completely offline (after the sync window).
async function runOfflineSubscriptionSync() {
  if (process.env.OFFLINE_MODE !== 'true' || !process.env.MASTER_API_URL) return;

  try {
    const { rows: tenants } = await pool.query(
      `SELECT id, schema_name, customer_code, status, trial_ends_at, subscription_end
       FROM public.tenants
       WHERE customer_code IS NOT NULL`
    );

    if (tenants.length === 0) return;

    console.log(`[Offline Sync] Checking subscription status for ${tenants.length} tenant(s)…`);

    for (const local of tenants) {
      try {
        const resp = await fetch(
          `${process.env.MASTER_API_URL}/api/saas/offline/sync-tenant`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerCode: local.customer_code }),
            signal: AbortSignal.timeout(10000),
          }
        );

        if (!resp.ok) {
          console.warn(`[Offline Sync] Master returned ${resp.status} for ${local.customer_code}`);
          continue;
        }

        const { tenant: remote } = await resp.json();
        if (!remote) continue;

        const changed =
          remote.status !== local.status ||
          remote.trial_ends_at !== (local.trial_ends_at ? new Date(local.trial_ends_at).toISOString() : null) ||
          remote.subscription_end !== (local.subscription_end ? new Date(local.subscription_end).toISOString() : null);

        if (changed) {
          await pool.query(
            `UPDATE public.tenants
             SET status = $1, trial_ends_at = $2, subscription_end = $3
             WHERE id = $4`,
            [remote.status, remote.trial_ends_at || null, remote.subscription_end || null, local.id]
          );
          clearTenantCache(local.schema_name);
          console.log(
            `[Offline Sync] Updated ${local.schema_name}: status=${remote.status}, ` +
            `sub_end=${remote.subscription_end || 'none'}`
          );
        }
      } catch (tenantErr) {
        console.warn(`[Offline Sync] Could not sync ${local.customer_code}:`, tenantErr.message);
      }
    }

    console.log('[Offline Sync] Done.');
  } catch (err) {
    console.error('[Offline Sync] Error:', err.message);
  }
}

// Called from server/index.js AFTER migrations complete so the tables exist
export function initSaasSchedulers() {
  runSubscriptionSweep();
  recordDbSnapshots();
  setInterval(runSubscriptionSweep, 15 * 60 * 1000);
  setInterval(recordDbSnapshots, 6 * 60 * 60 * 1000);

  // Offline mode: sync subscription status from master on boot + every 6 h
  if (process.env.OFFLINE_MODE === 'true' && process.env.MASTER_API_URL) {
    runOfflineSubscriptionSync();
    setInterval(runOfflineSubscriptionSync, 6 * 60 * 60 * 1000);
  }

  // Register PesaPal IPN
  if (process.env.PESAPAL_CONSUMER_KEY) {
    const ipnUrl = `${process.env.APP_BASE_URL || 'https://app.flippedpos.com'}/api/saas/pesapal/ipn`;
    registerIPN(ipnUrl)
      .then(ipnId => console.log(`[PesaPal] IPN Registered successfully. ID: ${ipnId}`))
      .catch(err => console.error(`[PesaPal] Failed to register IPN: ${err.message}`));
  }
}
