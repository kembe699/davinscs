import pool from "../db.js";

async function addMobilePlan() {
  try {
    const { rows } = await pool.query('SELECT id FROM public.pricing_plans WHERE name = $1', ['Mobile plan']);
    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO public.pricing_plans (name, price, sub_label, description, features, cta_label, cta_href, highlight, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          'Mobile plan', 
          '$15', 
          'per month', 
          'Designed exclusively for small business owners on the go using smartphones.', 
          JSON.stringify(['Mobile App Access','Basic POS Terminal','Simplified Inventory','Add Products easily','Track Sales & History','Unlimited cashiers']), 
          'Get Mobile', 
          '/register?plan=mobile', 
          true, 
          3
        ]
      );
      console.log('✅ Mobile plan added to pricing_plans');
    } else {
      console.log('ℹ️ Mobile plan already exists');
    }
  } catch (err) {
    console.error('Failed to add Mobile plan', err);
  } finally {
    process.exit(0);
  }
}

addMobilePlan();
