import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: "postgresql://davinsuser:davins123@localhost:5432/davinscs" });
const SCHEMA = "tenant_demo_1776953273318";

const categories = [
  { name: "Baking Supplies", slug: "baking-supplies" },
  { name: "Pantry Staples", slug: "pantry-staples" },
  { name: "Snacks", slug: "snacks" },
  { name: "Beverages", slug: "beverages" },
  { name: "Dairy & Chilled", slug: "dairy-chilled" },
  { name: "Spices & Seasonings", slug: "spices" },
  { name: "Canned Goods", slug: "canned-goods" },
  { name: "Household", slug: "household" }
];

const products = [
  // Baking Supplies
  { name:"All-Purpose Flour 1kg", brand:"Generic", price:2.50, category:"baking-supplies", qty:100, cost:1.50, img:"https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500" },
  { name:"White Sugar 1kg", brand:"Generic", price:1.80, category:"baking-supplies", qty:150, cost:1.00, img:"https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=500" },
  { name:"Brown Sugar 500g", brand:"Generic", price:2.20, category:"baking-supplies", qty:80, cost:1.20, img:"https://images.unsplash.com/photo-1615486511484-92e172a39a4e?w=500" },
  { name:"Baking Powder 200g", brand:"Generic", price:3.00, category:"baking-supplies", qty:50, cost:1.80, img:"https://images.unsplash.com/photo-1627485937980-221c88ce04ea?w=500" },
  { name:"Yeast 50g", brand:"Generic", price:1.50, category:"baking-supplies", qty:60, cost:0.80, img:"https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500" },
  { name:"Vanilla Extract 50ml", brand:"Generic", price:4.50, category:"baking-supplies", qty:40, cost:2.50, img:"https://images.unsplash.com/photo-1606149059549-6042addafc5c?w=500" },
  { name:"Cocoa Powder 250g", brand:"Generic", price:5.00, category:"baking-supplies", qty:45, cost:3.00, img:"https://images.unsplash.com/photo-1549471131-081077dc8eb4?w=500" },

  // Pantry Staples
  { name:"Table Salt 500g", brand:"Generic", price:0.90, category:"pantry-staples", qty:200, cost:0.40, img:"https://images.unsplash.com/photo-1627485937980-221c88ce04ea?w=500" },
  { name:"Sea Salt 250g", brand:"Generic", price:2.50, category:"pantry-staples", qty:80, cost:1.20, img:"https://images.unsplash.com/photo-1615486511484-92e172a39a4e?w=500" },
  { name:"White Rice 5kg", brand:"Generic", price:12.00, category:"pantry-staples", qty:60, cost:8.00, img:"https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=500" },
  { name:"Brown Rice 2kg", brand:"Generic", price:6.50, category:"pantry-staples", qty:40, cost:4.50, img:"https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=500" },
  { name:"Spaghetti Pasta 500g", brand:"Generic", price:1.50, category:"pantry-staples", qty:120, cost:0.80, img:"https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=500" },
  { name:"Penne Pasta 500g", brand:"Generic", price:1.50, category:"pantry-staples", qty:100, cost:0.80, img:"https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=500" },
  { name:"Vegetable Oil 1L", brand:"Generic", price:4.50, category:"pantry-staples", qty:90, cost:3.00, img:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500" },
  { name:"Olive Oil 500ml", brand:"Generic", price:8.00, category:"pantry-staples", qty:60, cost:5.50, img:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500" },
  { name:"Tomato Ketchup 500g", brand:"Generic", price:2.80, category:"pantry-staples", qty:70, cost:1.50, img:"https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=500" },
  { name:"Mayonnaise 400g", brand:"Generic", price:3.50, category:"pantry-staples", qty:65, cost:2.00, img:"https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=500" },

  // Snacks
  { name:"Potato Chips Salted 150g", brand:"SnackCo", price:2.50, category:"snacks", qty:100, cost:1.20, img:"https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500" },
  { name:"Tortilla Chips 200g", brand:"SnackCo", price:3.00, category:"snacks", qty:80, cost:1.50, img:"https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=500" },
  { name:"Chocolate Bar 100g", brand:"SweetCo", price:1.80, category:"snacks", qty:150, cost:0.90, img:"https://images.unsplash.com/photo-1548130839-509a202d512f?w=500" },
  { name:"Mixed Nuts 250g", brand:"NutCo", price:6.00, category:"snacks", qty:60, cost:3.50, img:"https://images.unsplash.com/photo-1536582531392-5eb329a1bd14?w=500" },
  { name:"Popcorn Butter 100g", brand:"SnackCo", price:2.00, category:"snacks", qty:90, cost:1.00, img:"https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=500" },
  { name:"Biscuits Assorted 300g", brand:"BakeCo", price:3.50, category:"snacks", qty:70, cost:1.80, img:"https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500" },

  // Beverages
  { name:"Bottled Water 500ml", brand:"Aqua", price:0.80, category:"beverages", qty:300, cost:0.30, img:"https://images.unsplash.com/photo-1548839140-29a749e1abc4?w=500" },
  { name:"Cola Soda 330ml", brand:"Fizz", price:1.20, category:"beverages", qty:200, cost:0.50, img:"https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500" },
  { name:"Orange Juice 1L", brand:"Fresh", price:3.50, category:"beverages", qty:80, cost:1.80, img:"https://images.unsplash.com/photo-1600271886742-f049cd451b02?w=500" },
  { name:"Apple Juice 1L", brand:"Fresh", price:3.50, category:"beverages", qty:80, cost:1.80, img:"https://images.unsplash.com/photo-1600271886742-f049cd451b02?w=500" },
  { name:"Instant Coffee 200g", brand:"Morning", price:7.00, category:"beverages", qty:50, cost:4.00, img:"https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=500" },
  { name:"Tea Bags 100pk", brand:"Morning", price:4.50, category:"beverages", qty:70, cost:2.50, img:"https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500" },
  { name:"Energy Drink 250ml", brand:"Power", price:2.50, category:"beverages", qty:100, cost:1.20, img:"https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500" },

  // Dairy & Chilled
  { name:"Fresh Milk 1L", brand:"Farm", price:2.20, category:"dairy-chilled", qty:60, cost:1.20, img:"https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500" },
  { name:"Cheddar Cheese 250g", brand:"Farm", price:4.50, category:"dairy-chilled", qty:40, cost:2.50, img:"https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500" },
  { name:"Butter 250g", brand:"Farm", price:3.80, category:"dairy-chilled", qty:50, cost:2.00, img:"https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500" },
  { name:"Yogurt Natural 500g", brand:"Farm", price:2.50, category:"dairy-chilled", qty:45, cost:1.30, img:"https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500" },
  { name:"Eggs 1 Dozen", brand:"Farm", price:3.50, category:"dairy-chilled", qty:80, cost:1.80, img:"https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=500" },
  { name:"Margarine 500g", brand:"Farm", price:2.80, category:"dairy-chilled", qty:50, cost:1.50, img:"https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500" },

  // Spices & Seasonings
  { name:"Black Pepper Powder 100g", brand:"SpiceCo", price:2.50, category:"spices", qty:80, cost:1.20, img:"https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500" },
  { name:"Chili Powder 100g", brand:"SpiceCo", price:2.20, category:"spices", qty:75, cost:1.00, img:"https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500" },
  { name:"Garlic Powder 100g", brand:"SpiceCo", price:2.80, category:"spices", qty:60, cost:1.30, img:"https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500" },
  { name:"Paprika 100g", brand:"SpiceCo", price:2.80, category:"spices", qty:50, cost:1.30, img:"https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500" },
  { name:"Curry Powder 100g", brand:"SpiceCo", price:2.50, category:"spices", qty:60, cost:1.20, img:"https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500" },
  { name:"Soy Sauce 500ml", brand:"Generic", price:3.00, category:"spices", qty:70, cost:1.50, img:"https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=500" },

  // Canned Goods
  { name:"Canned Tuna 150g", brand:"SeaCo", price:2.50, category:"canned-goods", qty:100, cost:1.20, img:"https://images.unsplash.com/photo-1558234380-4591a27e7dce?w=500" },
  { name:"Baked Beans 400g", brand:"BeanCo", price:1.50, category:"canned-goods", qty:120, cost:0.80, img:"https://images.unsplash.com/photo-1558234380-4591a27e7dce?w=500" },
  { name:"Sweet Corn 400g", brand:"VegCo", price:1.80, category:"canned-goods", qty:90, cost:0.90, img:"https://images.unsplash.com/photo-1558234380-4591a27e7dce?w=500" },
  { name:"Coconut Milk 400ml", brand:"VegCo", price:2.20, category:"canned-goods", qty:80, cost:1.10, img:"https://images.unsplash.com/photo-1558234380-4591a27e7dce?w=500" },

  // Household
  { name:"Toilet Paper 4 Rolls", brand:"Clean", price:3.50, category:"household", qty:80, cost:1.80, img:"https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=500" },
  { name:"Dishwashing Liquid 500ml", brand:"Clean", price:2.80, category:"household", qty:60, cost:1.40, img:"https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=500" },
  { name:"Laundry Detergent 1L", brand:"Clean", price:6.50, category:"household", qty:50, cost:3.50, img:"https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=500" },
  { name:"Garbage Bags 20pk", brand:"Clean", price:2.50, category:"household", qty:100, cost:1.20, img:"https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=500" }
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${SCHEMA}", public`);
    console.log(`🔌 Connected to schema: ${SCHEMA}`);

    console.log("📦 Seeding categories...");
    for (const [i, cat] of categories.entries()) {
      await client.query(
        `INSERT INTO categories (slug, name, sort_order) VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
        [cat.slug, cat.name, (i + 1) * 10]
      );
    }
    console.log(`✅ ${categories.length} categories seeded`);

    console.log("🛒 Seeding products...");
    let count = 0;
    for (const p of products) {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await client.query(
        `INSERT INTO products (slug, name, brand, price, category, quantity_on_hand, cost_price, image_url, description, in_stock, is_featured, uom, product_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, 'pcs', 'finished_good')
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name, brand = EXCLUDED.brand, price = EXCLUDED.price,
           category = EXCLUDED.category, quantity_on_hand = EXCLUDED.quantity_on_hand,
           cost_price = EXCLUDED.cost_price, image_url = EXCLUDED.image_url,
           description = EXCLUDED.description, is_featured = EXCLUDED.is_featured`,
        [slug, p.name, p.brand, Math.round(p.price * 1000), p.category, p.qty, Math.round(p.cost * 1000), p.img, p.name, false]
      );
      count++;
    }
    console.log(`✅ ${count} products seeded successfully!`);

    const { rows: [cats] } = await client.query(`SELECT COUNT(*) FROM categories`);
    const { rows: [prods] } = await client.query(`SELECT COUNT(*) FROM products`);
    console.log(`\n📊 Summary:`);
    console.log(`   Categories: ${cats.count}`);
    console.log(`   Products:   ${prods.count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error("❌ Seed failed:", err.message); process.exit(1); });
