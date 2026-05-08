import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const schemas = await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')");
  console.log(schemas.rows.map(r => r.schema_name));
  
  for (const row of schemas.rows) {
    const schema = row.schema_name;
    const result = await pool.query(`SELECT DISTINCT category FROM ${schema}.products WHERE category IS NOT NULL AND category != ''`);
    console.log(`Schema ${schema} products:`, result.rows.map(r => r.category));
    
    for (const r of result.rows) {
      const catName = r.category;
      const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const exists = await pool.query(`SELECT id FROM ${schema}.categories WHERE slug = $1`, [slug]);
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO ${schema}.categories (slug, name, sort_order) VALUES ($1, $2, $3)`,
          [slug, catName, 0]
        );
        console.log(`Inserted category ${catName} into ${schema}.categories`);
      }
    }
  }
  pool.end();
}
run();
