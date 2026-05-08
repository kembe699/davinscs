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
  try {
    console.log('Fetching distinct categories from products...');
    const result = await pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != \'\'');
    const categories = result.rows.map(r => r.category);
    
    console.log(`Found ${categories.length} categories:`, categories);
    
    for (const catName of categories) {
      const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const exists = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug]);
      if (exists.rows.length === 0) {
        await pool.query(
          'INSERT INTO categories (slug, name, sort_order) VALUES ($1, $2, $3)',
          [slug, catName, 0]
        );
        console.log(`Inserted category: ${catName}`);
      } else {
        console.log(`Category already exists: ${catName}`);
      }
    }
    
    console.log('Seeding complete.');
  } catch (error) {
    console.error('Error seeding categories:', error);
  } finally {
    pool.end();
  }
}

run();
