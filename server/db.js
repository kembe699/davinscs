import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "false" ? false : (process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false),
});

import { tenantStorage } from './tenantStorage.js';

const originalQuery = pool.query.bind(pool);

// rawPool: exposes the original unpatched query method.
// MUST be used by any store (e.g. session store) that needs to always
// target the public schema regardless of the current tenant context.
export const rawPool = {
  ...pool,
  query: originalQuery,
  connect: pool.connect.bind(pool),
  on: pool.on.bind(pool),
};

pool.query = async function (text, params) {
  const schemaName = tenantStorage.getStore() || 'public';
  
  // Quick path if it's already a SET command to avoid infinite loops or unnecessary overhead
  if (typeof text === 'string' && text.trim().toUpperCase().startsWith('SET ')) {
    return originalQuery(text, params);
  }

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schemaName}", public`);
    return await client.query(text, params);
  } finally {
    await client.query('SET search_path TO public');
    client.release();
  }
};

// Helper for routes that need a dedicated client (e.g. manual transactions).
// Acquires a raw connection and immediately sets search_path to the current
// tenant schema from tenantStorage.
export async function getSchemaClient() {
  const schemaName = tenantStorage.getStore() || 'public';
  const client = await pool.connect();
  await client.query(`SET search_path TO "${schemaName}", public`);
  return client;
}

export default pool;
