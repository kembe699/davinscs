import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

function ean13(n) {
  const s = String(n).padStart(12,"0");
  const sum = s.split("").reduce((a,v,i)=>a+Number(v)*(i%2===0?1:3),0);
  return s+String((10-(sum%10))%10);
}
const img = (id) => `https://images.unsplash.com/photo-${id}?w=400&q=80&auto=format&fit=crop`;

const categories = [
  {slug:"beverages",name:"Beverages",sort_order:1},
  {slug:"dairy-eggs",name:"Dairy & Eggs",sort_order:2},
  {slug:"bread-bakery",name:"Bread & Bakery",sort_order:3},
  {slug:"fruits-vegetables",name:"Fruits & Vegetables",sort_order:4},
  {slug:"meat-seafood",name:"Meat & Seafood",sort_order:5},
  {slug:"snacks",name:"Snacks & Confectionery",sort_order:6},
  {slug:"household",name:"Household & Cleaning",sort_order:7},
  {slug:"personal-care",name:"Personal Care",sort_order:8},
  {slug:"cereals-grains",name:"Cereals & Grains",sort_order:9},
  {slug:"canned-preserved",name:"Canned & Preserved",sort_order:10},
];

// PRODUCTS_PLACEHOLDER

async function run() {
  console.log("🗑  Clearing transactional data…");
  await pool.query(`TRUNCATE TABLE
    pos_sale_items,pos_sales,invoice_items,invoice_payments,invoices,
    order_items,orders,cart_items,customer_orders,customer_payments,
    quotation_items,quotations,grn_items,goods_received_notes,
    purchase_order_items,purchase_orders,supplier_bills,supplier_payments,
    stock_movements,cash_movements,cash_drawer_sessions,credit_sales,
    transaction_lines,transactions,audit_logs,customers
    RESTART IDENTITY CASCADE`);

  console.log("🗑  Clearing products & categories…");
  await pool.query(`TRUNCATE TABLE products RESTART IDENTITY CASCADE`);
  await pool.query(`TRUNCATE TABLE categories RESTART IDENTITY CASCADE`);

  console.log("🌱 Seeding categories…");
  for (const c of categories) {
    await pool.query(
      `INSERT INTO categories(slug,name,sort_order) VALUES($1,$2,$3)`,
      [c.slug,c.name,c.sort_order]
    );
  }

  const {rows:[{id:taxId}]} = await pool.query(`SELECT id FROM tax_rates WHERE is_default=true LIMIT 1`);

  console.log("🌱 Seeding 80 products…");
  for (const p of products) {
    await pool.query(
      `INSERT INTO products(slug,name,brand,price,cost_price,category,barcode,image_url,
        in_stock,quantity_on_hand,reorder_level,tax_rate_id,tag,description)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,$9,5,$10,'','')`,
      [p.slug,p.name,p.brand,p.price,Math.round(p.price*0.6),
       p.category,p.barcode,p.image_url,p.qty||30,taxId||null]
    );
  }

  console.log(`✅ Done — ${products.length} products inserted.`);
  await pool.end();
}
run().catch(e=>{console.error(e);process.exit(1);});

