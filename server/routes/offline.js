import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { migrateTenant } from '../utils/schemaMigration.js';
import { tenantStorage } from '../tenantStorage.js';
import { autoSeed } from '../autoSeed.js';

const router = express.Router();

// Get current offline license status (used by the frontend to verify)
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT business_name, schema_name, tenant_slug, status, trial_ends_at, subscription_end, customer_code FROM public.tenants LIMIT 1');
    if (rows.length === 0) return res.json({ configured: false });
    res.json({ configured: true, license: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Setup the offline node for the first time
router.post('/setup', async (req, res) => {
  const { customerCode, adminEmail, adminPassword } = req.body;
  if (!customerCode || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if already configured
    const existing = await pool.query('SELECT COUNT(*) FROM public.tenants');
    if (parseInt(existing.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Offline node is already configured.' });
    }

    const masterUrl = process.env.MASTER_API_URL || 'https://davinscs.onrender.com';
    const response = await fetch(`${masterUrl}/api/saas/license/${encodeURIComponent(customerCode)}`);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to verify customer code with master server.' });
    }

    const licenseData = await response.json();

    // 1. Create the tenant locally
    const client = await pool.connect();
    let tenantId;
    try {
      await client.query('BEGIN');
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      
      const tenantRes = await client.query(
        'INSERT INTO public.tenants (business_name, schema_name, customer_code, tenant_slug, status, trial_ends_at, subscription_end) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [licenseData.business_name, licenseData.schema_name, customerCode, licenseData.tenant_slug, licenseData.status, licenseData.trial_ends_at, licenseData.subscription_end]
      );
      tenantId = tenantRes.rows[0].id;

      await client.query(
        'INSERT INTO public.tenant_users (email, tenant_id, schema_name, password_hash) VALUES ($1,$2,$3,$4)',
        [adminEmail.toLowerCase(), tenantId, licenseData.schema_name, passwordHash]
      );
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // 2. Provision schema and insert local admin user
    try {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${licenseData.schema_name}"`);
      await migrateTenant(licenseData.schema_name);
      
      await tenantStorage.run(licenseData.schema_name, async () => {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await pool.query(
          "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin')",
          [adminEmail.toLowerCase(), passwordHash]
        );
        await autoSeed(); // Seed the schema with default roles/permissions
      });

      res.status(200).json({ success: true, tenantSlug: licenseData.tenant_slug });
    } catch (schemaErr) {
      console.error('Schema setup failed:', schemaErr);
      await pool.query(`DROP SCHEMA IF EXISTS "${licenseData.schema_name}" CASCADE`);
      await pool.query('DELETE FROM public.tenants WHERE id = $1', [tenantId]);
      res.status(500).json({ error: 'Failed to provision local schema' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during setup' });
  }
});

// Sync latest license data from master server
router.post('/sync', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT customer_code FROM public.tenants LIMIT 1');
    if (rows.length === 0) return res.status(400).json({ error: 'Node not configured' });
    
    const customerCode = rows[0].customer_code;
    const masterUrl = process.env.MASTER_API_URL || 'https://davinscs.onrender.com';
    const response = await fetch(`${masterUrl}/api/saas/license/${encodeURIComponent(customerCode)}`);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to sync with master server.' });
    }

    const licenseData = await response.json();

    await pool.query(
      `UPDATE public.tenants 
       SET status = $1, trial_ends_at = $2, subscription_end = $3 
       WHERE customer_code = $4`,
      [licenseData.status, licenseData.trial_ends_at, licenseData.subscription_end, customerCode]
    );

    res.json({ success: true, license: licenseData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sync failed. Check internet connection.' });
  }
});

export default router;
