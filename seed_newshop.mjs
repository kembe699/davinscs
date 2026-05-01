import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: "postgresql://davinsuser:davins123@localhost:5432/davinscs" });
const SCHEMA = "tenant_newshop_1777584483283";

const categories = [
  { name: "Smartphones", slug: "smartphones" },
  { name: "Laptops", slug: "laptops" },
  { name: "Tablets", slug: "tablets" },
  { name: "Smart TVs", slug: "smart-tvs" },
  { name: "Headphones", slug: "headphones" },
  { name: "Cameras", slug: "cameras" },
  { name: "Gaming Consoles", slug: "gaming-consoles" },
  { name: "Smartwatches", slug: "smartwatches" },
  { name: "Speakers", slug: "speakers" },
  { name: "Printers", slug: "printers" },
  { name: "Monitors", slug: "monitors" },
  { name: "Routers & Networking", slug: "routers" },
  { name: "Power Banks", slug: "power-banks" },
  { name: "Drones", slug: "drones" },
  { name: "Accessories", slug: "accessories" },
];

const products = [
  // Smartphones (4)
  { name:"Samsung Galaxy S24 Ultra", brand:"Samsung", price:4500000, category:"smartphones", qty:25, cost:3800000, img:"https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500", desc:"6.8\" QHD+ AMOLED, 200MP camera, Snapdragon 8 Gen 3, 5000mAh", featured:true },
  { name:"iPhone 15 Pro Max", brand:"Apple", price:5200000, category:"smartphones", qty:18, cost:4500000, img:"https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500", desc:"6.7\" Super Retina XDR, A17 Pro chip, 48MP triple camera", featured:true },
  { name:"Google Pixel 8 Pro", brand:"Google", price:3800000, category:"smartphones", qty:12, cost:3200000, img:"https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500", desc:"6.7\" LTPO OLED, Google Tensor G3, 50MP triple camera" },
  { name:"OnePlus 12", brand:"OnePlus", price:2800000, category:"smartphones", qty:20, cost:2300000, img:"https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=500", desc:"6.82\" AMOLED 120Hz, Snapdragon 8 Gen 3, 50MP Hasselblad" },

  // Laptops (4)
  { name:"MacBook Pro 16 M3 Max", brand:"Apple", price:8500000, category:"laptops", qty:8, cost:7200000, img:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500", desc:"M3 Max chip, 16\" Liquid Retina XDR, 36GB RAM, 1TB SSD", featured:true },
  { name:"Dell XPS 15 OLED", brand:"Dell", price:5800000, category:"laptops", qty:10, cost:4900000, img:"https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=500", desc:"15.6\" OLED, Intel Core i9, 32GB RAM, RTX 4070" },
  { name:"Lenovo ThinkPad X1 Carbon", brand:"Lenovo", price:4200000, category:"laptops", qty:15, cost:3500000, img:"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500", desc:"14\" IPS, Intel Core i7, 16GB RAM, 512GB SSD, ultralight" },
  { name:"ASUS ROG Zephyrus G14", brand:"ASUS", price:4800000, category:"laptops", qty:9, cost:4000000, img:"https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=500", desc:"14\" QHD 165Hz, AMD Ryzen 9, RTX 4060, 16GB RAM" },

  // Tablets (4)
  { name:"iPad Pro 12.9 M2", brand:"Apple", price:3200000, category:"tablets", qty:14, cost:2700000, img:"https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500", desc:"12.9\" Liquid Retina XDR, M2 chip, 256GB, Wi-Fi + Cellular", featured:true },
  { name:"Samsung Galaxy Tab S9 Ultra", brand:"Samsung", price:2800000, category:"tablets", qty:11, cost:2300000, img:"https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?w=500", desc:"14.6\" Dynamic AMOLED 2X, Snapdragon 8 Gen 2, 12GB RAM" },
  { name:"Microsoft Surface Pro 9", brand:"Microsoft", price:2500000, category:"tablets", qty:8, cost:2100000, img:"https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=500", desc:"13\" PixelSense, Intel Core i7, 16GB RAM, detachable keyboard" },
  { name:"Lenovo Tab P12 Pro", brand:"Lenovo", price:1800000, category:"tablets", qty:16, cost:1500000, img:"https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500", desc:"12.6\" AMOLED 2K, Snapdragon 870, 8GB RAM, 256GB" },

  // Smart TVs (4)
  { name:"Samsung 65\" Neo QLED 8K", brand:"Samsung", price:6500000, category:"smart-tvs", qty:5, cost:5500000, img:"https://images.unsplash.com/photo-1593359677879-a4bb92f4834a?w=500", desc:"65\" 8K Neo QLED, Quantum HDR 32x, 144Hz gaming mode", featured:true },
  { name:"LG C3 65\" OLED evo", brand:"LG", price:4800000, category:"smart-tvs", qty:7, cost:4100000, img:"https://images.unsplash.com/photo-1620288627223-53302f4e8c74?w=500", desc:"65\" OLED evo, α9 AI Processor, Dolby Vision IQ, 120Hz" },
  { name:"Sony Bravia XR 55\" OLED", brand:"Sony", price:3800000, category:"smart-tvs", qty:8, cost:3200000, img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500", desc:"55\" OLED, Cognitive Processor XR, Google TV, HDMI 2.1" },
  { name:"TCL 75\" QLED 4K", brand:"TCL", price:1800000, category:"smart-tvs", qty:12, cost:1500000, img:"https://images.unsplash.com/photo-1571415060716-baff5f717ca4?w=500", desc:"75\" QLED 4K, 144Hz VRR, Dolby Vision, Android TV 11" },

  // Headphones (4)
  { name:"Sony WH-1000XM5", brand:"Sony", price:980000, category:"headphones", qty:30, cost:750000, img:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500", desc:"Industry-leading ANC, 30hr battery, multipoint Bluetooth 5.2", featured:true },
  { name:"Apple AirPods Pro 2", brand:"Apple", price:850000, category:"headphones", qty:25, cost:680000, img:"https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500", desc:"H2 chip, Adaptive ANC, Personalized Spatial Audio, MagSafe" },
  { name:"Bose QuietComfort 45", brand:"Bose", price:880000, category:"headphones", qty:20, cost:700000, img:"https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500", desc:"World-class ANC, 24hr battery, TriPort acoustic, USB-C" },
  { name:"Samsung Galaxy Buds2 Pro", brand:"Samsung", price:450000, category:"headphones", qty:35, cost:360000, img:"https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500", desc:"24-bit Hi-Fi audio, intelligent ANC, 360° audio, IPX7" },

  // Cameras (4)
  { name:"Sony A7 IV Mirrorless", brand:"Sony", price:8500000, category:"cameras", qty:6, cost:7200000, img:"https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500", desc:"33MP BSI CMOS, 4K 60fps, 5-axis IBIS, dual card slots", featured:true },
  { name:"Canon EOS R6 Mark II", brand:"Canon", price:7200000, category:"cameras", qty:5, cost:6100000, img:"https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500", desc:"24.2MP CMOS, 4K 60fps, IBIS, dual UHS-II SD slots" },
  { name:"Nikon Z9 Pro", brand:"Nikon", price:12000000, category:"cameras", qty:3, cost:10500000, img:"https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=500", desc:"45.7MP stacked CMOS, 8K30fps, 120fps blackout-free EVF" },
  { name:"GoPro Hero 12 Black", brand:"GoPro", price:1200000, category:"cameras", qty:20, cost:980000, img:"https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=500", desc:"5.3K60 video, HyperSmooth 6.0, HDR, 27MP photos, HB-mount" },

  // Gaming Consoles (4)
  { name:"PlayStation 5 Console", brand:"Sony", price:3200000, category:"gaming-consoles", qty:10, cost:2800000, img:"https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=500", desc:"Custom AMD GPU, 825GB SSD, 4K UHD Blu-ray, DualSense", featured:true },
  { name:"Xbox Series X", brand:"Microsoft", price:3000000, category:"gaming-consoles", qty:8, cost:2600000, img:"https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=500", desc:"Custom RDNA 2 GPU, 1TB NVMe SSD, 4K 120fps, Game Pass" },
  { name:"Nintendo Switch OLED", brand:"Nintendo", price:1800000, category:"gaming-consoles", qty:15, cost:1500000, img:"https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=500", desc:"7\" OLED screen, 64GB storage, wired LAN port, enhanced audio" },
  { name:"Steam Deck OLED 512GB", brand:"Valve", price:2500000, category:"gaming-consoles", qty:7, cost:2100000, img:"https://images.unsplash.com/photo-1674494980193-ca3a90a6a8cf?w=500", desc:"7.4\" OLED, AMD APU, 512GB NVMe, 40Whr battery, handheld PC" },

  // Smartwatches (4)
  { name:"Apple Watch Ultra 2", brand:"Apple", price:1800000, category:"smartwatches", qty:20, cost:1500000, img:"https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500", desc:"49mm titanium, dual-frequency GPS, 60hr battery, S9 chip", featured:true },
  { name:"Samsung Galaxy Watch 6 Classic", brand:"Samsung", price:950000, category:"smartwatches", qty:25, cost:780000, img:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500", desc:"47mm, rotating bezel, BioActive sensor, Wear OS 4, 40hr" },
  { name:"Garmin Fenix 7X Sapphire", brand:"Garmin", price:2200000, category:"smartwatches", qty:10, cost:1850000, img:"https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=500", desc:"51mm titanium, solar charging, multi-GNSS, 28-day battery" },
  { name:"Fitbit Sense 2", brand:"Fitbit", price:650000, category:"smartwatches", qty:30, cost:520000, img:"https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500", desc:"EDA sensor, ECG app, Alexa & Google Assistant, GPS, 6-day" },

  // Speakers (4)
  { name:"Sonos Era 300 Spatial", brand:"Sonos", price:1500000, category:"speakers", qty:15, cost:1250000, img:"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500", desc:"Dolby Atmos Spatial Audio, 6 drivers, Wi-Fi 6, Bluetooth 5", featured:true },
  { name:"JBL Charge 5 Portable", brand:"JBL", price:480000, category:"speakers", qty:40, cost:380000, img:"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500", desc:"IP67 waterproof, 20hr battery, USB-C charging out, PartyBoost" },
  { name:"Marshall Emberton II", brand:"Marshall", price:380000, category:"speakers", qty:25, cost:300000, img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500", desc:"30hr battery, IP67, 360° sound, True Stereophonic, USB-C" },
  { name:"Bose SoundLink Max", brand:"Bose", price:850000, category:"speakers", qty:18, cost:700000, img:"https://images.unsplash.com/photo-1518770660439-4636190af475?w=500", desc:"20hr battery, IP67, Party Mode x2, USB-C, floats in water" },

  // Printers (4)
  { name:"HP LaserJet Pro M404dn", brand:"HP", price:1200000, category:"printers", qty:12, cost:980000, img:"https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500", desc:"40ppm, duplex, Ethernet, 250-sheet tray, security features" },
  { name:"Canon PIXMA G7020 MegaTank", brand:"Canon", price:650000, category:"printers", qty:20, cost:520000, img:"https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500", desc:"All-in-one, wireless, refillable ink tanks, fax, ADF" },
  { name:"Epson EcoTank ET-4850", brand:"Epson", price:720000, category:"printers", qty:15, cost:580000, img:"https://images.unsplash.com/photo-1568454537842-d933259bb258?w=500", desc:"Supertank, 2yr ink supply included, auto 2-sided, voice-activated" },
  { name:"Brother MFC-J6945DW", brand:"Brother", price:980000, category:"printers", qty:8, cost:800000, img:"https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500", desc:"Inkjet all-in-one, 11x17 printing, NFC, wireless, duplex" },

  // Monitors (4)
  { name:"LG UltraGear 27\" 4K OLED", brand:"LG", price:2800000, category:"monitors", qty:10, cost:2350000, img:"https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500", desc:"27\" 4K OLED, 240Hz, 0.03ms GTG, HDMI 2.1, G-Sync compatible", featured:true },
  { name:"Samsung Odyssey G9 49\"", brand:"Samsung", price:3500000, category:"monitors", qty:6, cost:3000000, img:"https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=500", desc:"49\" curved QLED, 240Hz, 1ms, DQHD 5120x1440, DisplayHDR2000" },
  { name:"Dell UltraSharp 32\" 4K", brand:"Dell", price:1800000, category:"monitors", qty:12, cost:1500000, img:"https://images.unsplash.com/photo-1547119957-637f8679db1e?w=500", desc:"32\" IPS 4K, 100% sRGB, USB-C 90W, height adjust, KVM" },
  { name:"ASUS ProArt PA279CRV 27\"", brand:"ASUS", price:1500000, category:"monitors", qty:10, cost:1250000, img:"https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=500", desc:"27\" 4K IPS, 98% DCI-P3, USB-C 96W, Calman-verified" },

  // Routers & Networking (4)
  { name:"ASUS ROG Rapture GT-BE98", brand:"ASUS", price:1800000, category:"routers", qty:8, cost:1500000, img:"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500", desc:"WiFi 7, 10GbE WAN, quad-band, OFDMA, RangeBoost Plus" },
  { name:"TP-Link Deco XE75 Pro Mesh", brand:"TP-Link", price:850000, category:"routers", qty:15, cost:700000, img:"https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500", desc:"WiFi 6E tri-band mesh, 6Gbps, 2.5G port, AI-driven mesh" },
  { name:"Netgear Orbi RBK863S", brand:"Netgear", price:1200000, category:"routers", qty:10, cost:1000000, img:"https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=500", desc:"WiFi 6, quad-band, 6Gbps, smart parental controls, 10GbE" },
  { name:"Ubiquiti UniFi Dream Router", brand:"Ubiquiti", price:980000, category:"routers", qty:7, cost:820000, img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500", desc:"WiFi 6, UniFi OS, IDS/IPS, VPN server, multi-WAN failover" },

  // Power Banks (4)
  { name:"Anker 24000mAh 140W PD", brand:"Anker", price:280000, category:"power-banks", qty:50, cost:220000, img:"https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500", desc:"24000mAh, 140W USB-C PD, 2x USB-A, charge 3 devices", featured:true },
  { name:"Baseus Blade 100W 20000mAh", brand:"Baseus", price:180000, category:"power-banks", qty:40, cost:140000, img:"https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500", desc:"Ultra-slim, 100W PD, digital display, foldable plug, 20000mAh" },
  { name:"UGREEN MagSafe 10000mAh", brand:"UGREEN", price:150000, category:"power-banks", qty:35, cost:120000, img:"https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500", desc:"MagSafe 15W wireless + 20W USB-C PD, LED indicator, 10000mAh" },
  { name:"Xiaomi 33W 20000mAh", brand:"Xiaomi", price:95000, category:"power-banks", qty:60, cost:75000, img:"https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500", desc:"33W fast charge, dual USB-A + USB-C, dual input, 20000mAh" },

  // Drones (4)
  { name:"DJI Mavic 3 Pro", brand:"DJI", price:6500000, category:"drones", qty:5, cost:5600000, img:"https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=500", desc:"Hasselblad 4/3 CMOS, 43min flight, 15km range, omnidirectional sensing", featured:true },
  { name:"DJI Mini 4 Pro", brand:"DJI", price:2800000, category:"drones", qty:10, cost:2350000, img:"https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=500", desc:"4K/60fps, 34min flight, 20km range, omnidirectional obstacle sensing" },
  { name:"Autel EVO Lite+ Premium", brand:"Autel", price:2200000, category:"drones", qty:6, cost:1850000, img:"https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=500", desc:"50MP 1\" CMOS, 6K video, 40min, 12km range, SkyLink" },
  { name:"Holy Stone HS720E GPS", brand:"Holy Stone", price:480000, category:"drones", qty:15, cost:380000, img:"https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=500", desc:"4K EIS camera, GPS auto-return, 26min flight, follow me, beginner" },

  // Accessories (4)
  { name:"Logitech MX Keys Advanced", brand:"Logitech", price:350000, category:"accessories", qty:30, cost:280000, img:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500", desc:"Wireless Bluetooth keyboard, backlit keys, USB-C, multi-device" },
  { name:"Apple MagSafe Charger 15W", brand:"Apple", price:120000, category:"accessories", qty:50, cost:90000, img:"https://images.unsplash.com/photo-1586495777744-4e6232bf2ebb?w=500", desc:"15W MagSafe wireless charging, perfectly aligned every time" },
  { name:"Samsung 65W Travel Adapter", brand:"Samsung", price:85000, category:"accessories", qty:45, cost:65000, img:"https://images.unsplash.com/photo-1601999009162-2459b78386c9?w=500", desc:"65W PD fast charger, USB-C + USB-A, compact travel design" },
  { name:"WD 4TB My Passport USB-C", brand:"Western Digital", price:380000, category:"accessories", qty:25, cost:300000, img:"https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=500", desc:"4TB portable SSD, USB-C 3.2 Gen2, hardware encryption, 256-bit AES" },
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${SCHEMA}", public`);
    console.log(`🔌 Connected to schema: ${SCHEMA}`);

    // Insert categories
    console.log("📦 Seeding categories...");
    for (const [i, cat] of categories.entries()) {
      await client.query(
        `INSERT INTO categories (slug, name, sort_order) VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
        [cat.slug, cat.name, (i + 1) * 10]
      );
    }
    console.log(`✅ ${categories.length} categories seeded`);

    // Insert products
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
        [slug, p.name, p.brand, p.price, p.category, p.qty, p.cost, p.img, p.desc, p.featured || false]
      );
      count++;
      if (count % 10 === 0) console.log(`  ... ${count} products done`);
    }
    console.log(`✅ ${count} products seeded successfully!`);

    // Summary
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
