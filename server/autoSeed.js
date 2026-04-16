import bcrypt from "bcryptjs";
import pool from "./db.js";

const categoryData = [
  { slug: "cameras",       name: "Cameras",       sort_order: 1 },
  { slug: "lenses",        name: "Lenses",        sort_order: 2 },
  { slug: "microphones",   name: "Microphones",   sort_order: 3 },
  { slug: "teleprompters", name: "Teleprompters", sort_order: 4 },
  { slug: "lighting",      name: "Lighting",      sort_order: 5 },
];

const products = [
  { slug: "sony-fx3", name: "Sony FX3 Full-Frame Cinema Camera", brand: "Sony", price: 795000, tag: "FULL_FRAME", category: "cameras", in_stock: true, image_url: "/products/sony-fx3.jpg", description: "A compact full-frame cinema camera with 12.1MP sensor, 4K 120fps recording, and dual native ISO up to 409600.", specs: [{ label: "Sensor", value: "12.1MP Full-Frame BSI CMOS" }, { label: "Resolution", value: "4K 120fps / 1080p 240fps" }, { label: "ISO Range", value: "80 – 409,600" }, { label: "Mount", value: "Sony E-Mount" }, { label: "Body Weight", value: "715g (body only)" }, { label: "Battery", value: "NP-FZ100" }] },
  { slug: "bmpcc-6k-g2", name: "Blackmagic Pocket Cinema 6K G2", brand: "Blackmagic Design", price: 407000, tag: "6K_CINEMA", category: "cameras", in_stock: true, image_url: "/products/bmpcc-6k-g2.jpg", description: "The Pocket Cinema Camera 6K G2 features a Super 35 sensor with 6144×3456 resolution and 13 stops of dynamic range.", specs: [{ label: "Sensor", value: "Super 35 CMOS" }, { label: "Resolution", value: "6K / 4K / 2.8K / 2K / 1080p" }, { label: "Dynamic Range", value: "13 stops" }, { label: "Mount", value: "Canon EF / EF-S" }, { label: "Body Weight", value: "900g" }, { label: "Battery", value: "LP-E6" }] },
  { slug: "canon-r5c", name: "Canon EOS R5 C Cinema Camera", brand: "Canon", price: 877000, tag: "8K_RAW", category: "cameras", in_stock: true, image_url: "/products/canon-r5c.jpg", description: "Merges Canon's EOS R5 mirrorless system with cinema-grade 8K RAW recording and unlimited record times.", specs: [{ label: "Sensor", value: "45MP Full-Frame CMOS" }, { label: "Resolution", value: "8K RAW / 4K 120fps" }, { label: "Cooling", value: "Active Fan Cooling" }, { label: "Mount", value: "Canon RF Mount" }, { label: "Body Weight", value: "680g" }, { label: "Recording", value: "CFexpress + SD" }] },
  { slug: "nikon-z9", name: "Nikon Z9 Mirrorless Camera", brand: "Nikon", price: 1122000, tag: "PRO_FLAGSHIP", category: "cameras", in_stock: false, image_url: "/products/nikon-z9.jpg", description: "Nikon's flagship mirrorless powerhouse with a stacked 45.7MP sensor, 8K internal recording, and no mechanical shutter.", specs: [{ label: "Sensor", value: "45.7MP Full-Frame Stacked CMOS" }, { label: "Resolution", value: "8K 60fps / 4K 120fps" }, { label: "Burst Rate", value: "120fps RAW" }, { label: "Mount", value: "Nikon Z Mount" }, { label: "Body Weight", value: "1,340g" }, { label: "Battery", value: "EN-EL18d" }] },
  { slug: "red-v-raptor", name: "RED V-RAPTOR 8K VV", brand: "RED Digital Cinema", price: 5000000, tag: "8K_VV", category: "cameras", in_stock: true, image_url: "/products/red-v-raptor.jpg", description: "The V-RAPTOR shoots 8K at up to 120fps in VistaVision format with 17+ stops of dynamic range.", specs: [{ label: "Sensor", value: "35.4MP VistaVision CMOS" }, { label: "Resolution", value: "8K VV 120fps" }, { label: "Dynamic Range", value: "17+ stops" }, { label: "Mount", value: "DSMC3 Interchangeable" }, { label: "Body Weight", value: "1,450g" }, { label: "Recording", value: "REDCODE RAW" }] },
  { slug: "fujifilm-x-h2s", name: "Fujifilm X-H2S Mirrorless", brand: "Fujifilm", price: 510000, tag: "APSC_SPEED", category: "cameras", in_stock: true, image_url: "/products/fujifilm-x-h2s.jpg", description: "Fujifilm's speed champion: 26.16MP stacked BSI sensor with 6.2K 30fps open-gate video and ProRes RAW output.", specs: [{ label: "Sensor", value: "26.16MP APS-C Stacked BSI CMOS" }, { label: "Resolution", value: "6.2K 30fps / 4K 120fps" }, { label: "Burst Rate", value: "40fps (electronic)" }, { label: "Mount", value: "Fujifilm X Mount" }, { label: "Body Weight", value: "660g" }, { label: "Battery", value: "NP-W235" }] },
  { slug: "sigma-18-35-art", name: "Sigma 18-35mm f/1.8 Art DC HSM", brand: "Sigma", price: 163000, tag: "ART_SERIES", category: "lenses", in_stock: true, image_url: "/products/sigma-18-35-art.jpg", description: "Industry-leading f/1.8 maximum aperture across the full zoom range.", specs: [{ label: "Focal Length", value: "18–35mm" }, { label: "Aperture", value: "f/1.8 – f/16" }, { label: "Elements", value: "17 elements / 12 groups" }, { label: "Mount", value: "Canon EF / Nikon F / Sony A" }, { label: "Filter Thread", value: "72mm" }, { label: "Weight", value: "810g" }] },
  { slug: "canon-rf-85-1-2", name: "Canon RF 85mm f/1.2L USM", brand: "Canon", price: 571000, tag: "L_SERIES", category: "lenses", in_stock: true, image_url: "/products/canon-rf-85.jpg", description: "Masterpiece portrait prime with f/1.2 delivering creamy bokeh and razor-sharp subject separation.", specs: [{ label: "Focal Length", value: "85mm" }, { label: "Aperture", value: "f/1.2 – f/16" }, { label: "Elements", value: "13 elements / 9 groups" }, { label: "Mount", value: "Canon RF" }, { label: "Filter Thread", value: "82mm" }, { label: "Weight", value: "1,195g" }] },
  { slug: "laowa-12mm-zero-d", name: "Laowa 12mm f/2.8 Zero-D", brand: "Laowa", price: 173000, tag: "ZERO_DISTORTION", category: "lenses", in_stock: true, image_url: "/products/laowa-12mm.jpg", description: "Ultra-wide prime with near-zero distortion — perfect for architecture and cinematic wide shots.", specs: [{ label: "Focal Length", value: "12mm" }, { label: "Aperture", value: "f/2.8 – f/22" }, { label: "Elements", value: "16 elements / 10 groups" }, { label: "Mount", value: "Canon EF / Nikon F / Sony FE" }, { label: "Filter Thread", value: "77mm" }, { label: "Weight", value: "540g" }] },
  { slug: "sony-gmaster-50-1-2", name: "Sony FE 50mm f/1.2 GM", brand: "Sony", price: 408000, tag: "GM_SERIES", category: "lenses", in_stock: true, image_url: "/products/sony-gmaster-50.jpg", description: "Sony's G Master 50mm standard prime with f/1.2 and near-perfect bokeh.", specs: [{ label: "Focal Length", value: "50mm" }, { label: "Aperture", value: "f/1.2 – f/22" }, { label: "Elements", value: "14 elements / 10 groups" }, { label: "Mount", value: "Sony FE" }, { label: "Filter Thread", value: "72mm" }, { label: "Weight", value: "778g" }] },
  { slug: "tokina-cinema-50mm-t1-5", name: "Tokina Cinema ATX 50mm T1.5", brand: "Tokina", price: 235000, tag: "CINEMA_PRIME", category: "lenses", in_stock: false, image_url: "/products/tokina-cinema-50.jpg", description: "PL/EF cinema prime with smooth, clickless iris and linear focus.", specs: [{ label: "Focal Length", value: "50mm" }, { label: "T-Stop", value: "T1.5 – T22" }, { label: "Elements", value: "11 elements / 8 groups" }, { label: "Mount", value: "Canon EF / PL" }, { label: "Filter Thread", value: "77mm" }, { label: "Weight", value: "960g" }] },
  { slug: "sirui-anamorphic-50mm", name: "SIRUI 50mm T2.9 1.6x Anamorphic", brand: "SIRUI", price: 183000, tag: "ANAMORPHIC", category: "lenses", in_stock: true, image_url: "/products/sirui-anamorphic-50.jpg", description: "Affordable 1.6x anamorphic prime delivering cinematic oval bokeh and horizontal lens flares.", specs: [{ label: "Focal Length", value: "50mm (1.6x squeeze)" }, { label: "T-Stop", value: "T2.9 – T16" }, { label: "Format", value: "Full-Frame / APS-C" }, { label: "Mount", value: "Sony FE / Canon RF / Nikon Z / L" }, { label: "Filter Thread", value: "82mm" }, { label: "Weight", value: "680g" }] },
  { slug: "rode-ntg5", name: "Røde NTG5 Broadcast Shotgun", brand: "Røde", price: 102000, tag: "BROADCAST_SHOTGUN", category: "microphones", in_stock: true, image_url: "/products/rode-ntg5.jpg", description: "Ultra-compact broadcast-grade shotgun mic with RF-bias technology.", specs: [{ label: "Type", value: "Condenser — Line Gradient" }, { label: "Frequency", value: "20Hz – 20kHz" }, { label: "Sensitivity", value: "-30 dBV/Pa" }, { label: "Self Noise", value: "10 dB(A)" }, { label: "Connector", value: "3-pin XLR" }, { label: "Length", value: "203mm / 76g" }] },
  { slug: "shure-sm7b", name: "Shure SM7B Dynamic Vocal Mic", brand: "Shure", price: 81000, tag: "PODCAST_LEGEND", category: "microphones", in_stock: true, image_url: "/products/shure-sm7b.jpg", description: "The industry standard for podcasting, broadcasting, and vocal recording.", specs: [{ label: "Type", value: "Dynamic Cardioid" }, { label: "Frequency", value: "50Hz – 20kHz" }, { label: "Sensitivity", value: "-59 dBV/Pa" }, { label: "Output", value: "3-pin XLR" }, { label: "Weight", value: "765g" }, { label: "Requires", value: "Preamp / Audio Interface" }] },
  { slug: "sennheiser-ew-512p", name: "Sennheiser EW 512P G4 Wireless", brand: "Sennheiser", price: 163000, tag: "WIRELESS_LAV", category: "microphones", in_stock: true, image_url: "/products/sennheiser-ew-512p.jpg", description: "Professional UHF wireless lav system with 42MHz tuning bandwidth and ultra-low latency at 1.9ms.", specs: [{ label: "Type", value: "Wireless Lavalier System" }, { label: "Frequency", value: "566–608 MHz" }, { label: "Latency", value: "1.9ms" }, { label: "Range", value: "Up to 100m line-of-sight" }, { label: "Battery", value: "AA / Rechargeable" }, { label: "Channels", value: "Up to 32 compatible" }] },
  { slug: "audio-technica-at4053b", name: "Audio-Technica AT4053b Hypercardioid", brand: "Audio-Technica", price: 71000, tag: "HYPERCARDIOID", category: "microphones", in_stock: true, image_url: "/products/audio-technica-at4053b.jpg", description: "Professional hypercardioid condenser for film production, ENG, and live broadcast.", specs: [{ label: "Type", value: "Condenser Hypercardioid" }, { label: "Frequency", value: "20Hz – 20kHz" }, { label: "Self Noise", value: "12 dB SPL" }, { label: "Max SPL", value: "153 dB" }, { label: "Connector", value: "5-pin LEMO" }, { label: "Weight", value: "79g" }] },
  { slug: "zoom-h6-essential", name: "Zoom H6essential Portable Recorder", brand: "Zoom", price: 55000, tag: "FIELD_RECORDER", category: "microphones", in_stock: true, image_url: "/products/zoom-h6.jpg", description: "Six-track portable field recorder with 32-bit float recording and 4 XLR/TRS combo inputs.", specs: [{ label: "Tracks", value: "6 simultaneous" }, { label: "Bit Depth", value: "32-bit Float" }, { label: "Sample Rate", value: "44.1 / 48 / 96kHz" }, { label: "Inputs", value: "4 × XLR/TRS Combo + 2 built-in" }, { label: "Storage", value: "SDXC (up to 512GB)" }, { label: "Power", value: "4 × AA / USB-C" }] },
  { slug: "datavideo-tp-650", name: "Datavideo TP-650 Portable Teleprompter", brand: "Datavideo", price: 71000, tag: "PORTABLE_PRO", category: "teleprompters", in_stock: true, image_url: "/products/datavideo-tp650.jpg", description: "Camera-mounted teleprompter with 15\" beam-splitter glass supporting tablets up to 12.9\".", specs: [{ label: "Screen Size", value: "Supports up to 12.9\" tablet" }, { label: "Glass", value: "60/40 Beam Splitter" }, { label: "Compatibility", value: "iPad / Android Tablets" }, { label: "Hood Material", value: "Fabric (collapsible)" }, { label: "Weight", value: "1.8kg" }, { label: "App", value: "Datavideo Prompter (iOS/Android)" }] },
  { slug: "feelworld-tp10", name: "FEELWORLD TP10 Teleprompter Kit", brand: "FEELWORLD", price: 37000, tag: "BUDGET_PRO", category: "teleprompters", in_stock: true, image_url: "/products/feelworld-tp10.jpg", description: "Lightweight aluminum teleprompter kit with 10\" semi-transparent glass.", specs: [{ label: "Screen Size", value: "Supports up to 9.7\" tablet" }, { label: "Glass", value: "Semi-transparent reflective" }, { label: "Material", value: "Aluminum Alloy" }, { label: "Hood", value: "Black Matte Hood Included" }, { label: "Weight", value: "1.1kg" }, { label: "App", value: "Universal (any prompter app)" }] },
  { slug: "glide-gear-tmp100", name: "Glide Gear TMP100 Pro Teleprompter", brand: "Glide Gear", price: 45000, tag: "DUAL_GLASS", category: "teleprompters", in_stock: true, image_url: "/products/glide-gear-tmp100.jpg", description: "Professional dual camera-mount teleprompter with 70/30 beam-splitter glass.", specs: [{ label: "Screen Size", value: "Supports up to 11\" tablet" }, { label: "Glass", value: "70/30 Beam Splitter" }, { label: "Material", value: "Aluminum & ABS" }, { label: "Mount", value: "Standard 1/4\"-20 tripod thread" }, { label: "Weight", value: "1.5kg" }, { label: "Compatibility", value: "Universal" }] },
  { slug: "parrot-presidential", name: "Parrot Presidential Teleprompter", brand: "Parrot", price: 611000, tag: "FLOOR_STAND", category: "teleprompters", in_stock: false, image_url: "/products/parrot-presidential.jpg", description: "Broadcast-grade floor-standing teleprompter with 17\" LCD monitor and full studio rigging.", specs: [{ label: "Monitor", value: "17\" 1920×1200 LCD" }, { label: "Glass", value: "60/40 Optical Glass" }, { label: "Scroll", value: "Hardware Controller Included" }, { label: "Stand", value: "Heavy-Duty Tripod Base" }, { label: "Weight", value: "12kg (full kit)" }, { label: "Software", value: "Autocue QMaster Compatible" }] },
  { slug: "ikan-pt-elite", name: "Ikan PT-ELITE-V2 Teleprompter", brand: "Ikan", price: 112000, tag: "ELITE_SERIES", category: "teleprompters", in_stock: true, image_url: "/products/ikan-pt-elite.jpg", description: "Advanced teleprompter with 17\" high-brightness LCD monitor and foot pedal controller.", specs: [{ label: "Monitor", value: "17\" 1280×1024 LCD" }, { label: "Brightness", value: "500 cd/m²" }, { label: "Glass", value: "50/50 Beam Splitter" }, { label: "Controller", value: "Foot Pedal + Hand Remote" }, { label: "Weight", value: "6.3kg" }, { label: "Software", value: "Ikan Prompt (iOS/Android/Win)" }] },
  { slug: "aputure-ls-600d-pro", name: "Aputure LS 600d Pro LED Light", brand: "Aputure", price: 285000, tag: "600W_DAYLIGHT", category: "lighting", in_stock: true, image_url: "/products/aputure-ls-600d.jpg", description: "600W daylight LED with Bowens mount, weather resistance, and 45,000 lux at 1m.", specs: [{ label: "Power", value: "600W LED" }, { label: "Color Temp", value: "5600K ±200K" }, { label: "CRI / TLCI", value: "96+ / 97+" }, { label: "Output", value: "45,000 lux @ 1m" }, { label: "Mount", value: "Bowens Mount" }, { label: "IP Rating", value: "IP54 Weather Resistant" }] },
  { slug: "nanlite-forza-60b", name: "Nanlite Forza 60B Bi-Color LED", brand: "Nanlite", price: 71000, tag: "BI_COLOR", category: "lighting", in_stock: true, image_url: "/products/nanlite-forza-60b.jpg", description: "Compact 60W bi-color LED spotlight with 2700–6500K range and Bowens mount.", specs: [{ label: "Power", value: "60W" }, { label: "Color Temp", value: "2700K – 6500K" }, { label: "CRI", value: "96+" }, { label: "Output", value: "7,140 lux @ 1m (5600K)" }, { label: "Mount", value: "Bowens Mount" }, { label: "Control", value: "DMX / Bluetooth / CRMX" }] },
  { slug: "godox-sl-200ii", name: "Godox SL-200W II LED Video Light", brand: "Godox", price: 59000, tag: "STUDIO_LED", category: "lighting", in_stock: true, image_url: "/products/godox-sl-200ii.jpg", description: "200W daylight-balanced studio LED with quiet fan and Bowens mount.", specs: [{ label: "Power", value: "200W" }, { label: "Color Temp", value: "5600K ±200K" }, { label: "CRI / TLCI", value: "96 / 97" }, { label: "Output", value: "18,100 lux @ 1m" }, { label: "Mount", value: "Bowens Mount" }, { label: "Dimming", value: "0–100% PWM" }] },
  { slug: "luxli-cello-2", name: "Luxli Cello 2 RGBAW Panel", brand: "Luxli", price: 112000, tag: "RGBAW_PANEL", category: "lighting", in_stock: true, image_url: "/products/luxli-cello-2.jpg", description: "Compact RGBAW on-camera LED panel with 2000–10000K range and free iOS/Android app.", specs: [{ label: "Size", value: "6\" × 6\" Panel" }, { label: "Color Temp", value: "2000K – 10,000K" }, { label: "Colors", value: "RGBAW" }, { label: "CRI", value: "95+" }, { label: "Power", value: "V-Mount / Anton Bauer / USB-C" }, { label: "Control", value: "Bluetooth App + DMX" }] },
  { slug: "aputure-amaran-200x", name: "Aputure Amaran 200x Bi-Color", brand: "Aputure", price: 53000, tag: "AMARAN_SERIES", category: "lighting", in_stock: true, image_url: "/products/aputure-amaran-200x.jpg", description: "200W bi-color LED with sidus Link app control and Bowens S-mount compatibility.", specs: [{ label: "Power", value: "200W" }, { label: "Color Temp", value: "2700K – 6500K" }, { label: "CRI / TLCI", value: "95 / 97" }, { label: "Output", value: "14,200 lux @ 1m" }, { label: "Control", value: "Sidus Link App + 2.4GHz" }, { label: "Mount", value: "Bowens S-Mount" }] },
  { slug: "nanlite-pavotube-ii-30c", name: "Nanlite PavoTube II 30C RGB Tube", brand: "Nanlite", price: 41000, tag: "RGB_TUBE", category: "lighting", in_stock: true, image_url: "/products/nanlite-pavotube.jpg", description: "2-foot RGBWW LED tube light with internal battery and 14 built-in effects.", specs: [{ label: "Length", value: "60cm / 2ft" }, { label: "Color Temp", value: "2700K – 6500K + RGB" }, { label: "CRI", value: "95+" }, { label: "Output", value: "1,300 lux @ 1m" }, { label: "Battery", value: "Built-in (2 hrs runtime)" }, { label: "Effects", value: "14 built-in (lightning, fire, etc.)" }] },
];

export async function autoSeed() {
  // Admin user
  const hash = await bcrypt.hash("12345678", 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin') ON CONFLICT (email) DO NOTHING`,
    ["admin@divinsstore.com", hash]
  );

  // Categories
  for (const c of categoryData) {
    await pool.query(
      `INSERT INTO categories (slug, name, sort_order) VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order`,
      [c.slug, c.name, c.sort_order]
    );
  }

  // Products
  for (const p of products) {
    await pool.query(
      `INSERT INTO products (slug, name, brand, price, tag, description, specs, image_url, in_stock, is_featured, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (slug) DO UPDATE SET
         name=EXCLUDED.name, brand=EXCLUDED.brand, price=EXCLUDED.price,
         tag=EXCLUDED.tag, description=EXCLUDED.description, specs=EXCLUDED.specs,
         image_url=EXCLUDED.image_url, in_stock=EXCLUDED.in_stock, category=EXCLUDED.category,
         updated_at=NOW()`,
      [p.slug, p.name, p.brand, p.price, p.tag, p.description,
       JSON.stringify(p.specs), p.image_url, p.in_stock, false, p.category]
    );
  }

  // Seed suppliers
  const suppliers = [
    { name: "Sony Professional", contact_person: "John Smith", email: "sales@sonypro.com", phone: "+1-800-686-7669" },
    { name: "Canon Imaging", contact_person: "Sarah Johnson", email: "b2b@canon.com", phone: "+1-800-652-2666" },
    { name: "Blackmagic Design", contact_person: "Mike Chen", email: "sales@blackmagicdesign.com", phone: "+61-3-9682-8888" },
    { name: "Audio-Technica Corp", contact_person: "Lisa Wang", email: "pro@audio-technica.com", phone: "+1-330-686-2600" },
    { name: "Aputure Imaging", contact_person: "David Lee", email: "wholesale@aputure.com", phone: "+86-755-8621-9300" },
  ];

  for (const s of suppliers) {
    await pool.query(
      `INSERT INTO suppliers (name, contact_person, email, phone) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [s.name, s.contact_person, s.email, s.phone]
    );
  }

  // Seed chart of accounts
  const accounts = [
    { code: "1000", name: "Cash", account_type: "asset" },
    { code: "1100", name: "Accounts Receivable", account_type: "asset" },
    { code: "1200", name: "Inventory", account_type: "asset" },
    { code: "1500", name: "Equipment", account_type: "asset" },
    { code: "2000", name: "Accounts Payable", account_type: "liability" },
    { code: "2100", name: "Sales Tax Payable", account_type: "liability" },
    { code: "3000", name: "Owner's Equity", account_type: "equity" },
    { code: "4000", name: "Sales Revenue", account_type: "revenue" },
    { code: "5000", name: "Cost of Goods Sold", account_type: "expense" },
    { code: "6000", name: "Operating Expenses", account_type: "expense" },
    { code: "6100", name: "Rent Expense", account_type: "expense" },
    { code: "6200", name: "Utilities Expense", account_type: "expense" },
  ];

  for (const a of accounts) {
    await pool.query(
      `INSERT INTO accounts (code, name, account_type) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING`,
      [a.code, a.name, a.account_type]
    );
  }

  // Update products with initial inventory quantities and cost prices
  await pool.query(`
    UPDATE products SET 
      quantity_on_hand = 5,
      quantity_reserved = 0,
      reorder_level = 2,
      cost_price = FLOOR(price * 0.6)
    WHERE quantity_on_hand = 0
  `);

  // Seed payment types
  const paymentTypes = [
    { name: "Cash", code: "cash", sort_order: 1 },
    { name: "Card", code: "card", sort_order: 2 },
    { name: "Check", code: "check", sort_order: 3 },
    { name: "Credit", code: "credit", sort_order: 4 },
    { name: "Mobile Money", code: "mobile", sort_order: 5 },
  ];

  for (const pt of paymentTypes) {
    await pool.query(
      `INSERT INTO payment_types (name, code, sort_order, is_active) 
       VALUES ($1, $2, $3, true) ON CONFLICT (code) DO NOTHING`,
      [pt.name, pt.code, pt.sort_order]
    );
  }

  // Seed tax rates
  const taxRates = [
    { name: "VAT 18%", rate: 18.00, is_default: true },
    { name: "No Tax", rate: 0.00, is_default: false },
    { name: "Reduced VAT 5%", rate: 5.00, is_default: false },
  ];

  for (const tr of taxRates) {
    await pool.query(
      `INSERT INTO tax_rates (name, rate, is_active, is_default) 
       VALUES ($1, $2, true, $3) ON CONFLICT DO NOTHING`,
      [tr.name, tr.rate, tr.is_default]
    );
  }

  // Seed default price list
  await pool.query(
    `INSERT INTO price_lists (name, description, discount_percent, is_active) 
     VALUES ('Standard', 'Standard retail pricing', 0, true) ON CONFLICT DO NOTHING`
  );

  await pool.query(
    `INSERT INTO price_lists (name, description, discount_percent, is_active) 
     VALUES ('Wholesale', 'Wholesale pricing with 10% discount', 10, true) ON CONFLICT DO NOTHING`
  );

  // Seed company settings
  await pool.query(
    `INSERT INTO company_settings (company_name, address, phone, email, currency, receipt_footer)
     VALUES ('Davin''s Camera Store', 'Kampala, Uganda', '+256-XXX-XXXXXX', 'info@divinsstore.com', 'UGX', 'Thank you for your business!')
     ON CONFLICT DO NOTHING`
  );

  // Seed countries
  const countries = [
    { code: "UG", name: "Uganda" },
    { code: "KE", name: "Kenya" },
    { code: "TZ", name: "Tanzania" },
    { code: "RW", name: "Rwanda" },
  ];

  for (const country of countries) {
    await pool.query(
      `INSERT INTO countries (code, name, is_active) 
       VALUES ($1, $2, true) ON CONFLICT (code) DO NOTHING`,
      [country.code, country.name]
    );
  }

  // Update admin user to have POS access
  await pool.query(
    `UPDATE users SET can_access_pos = true WHERE email = 'admin@divinsstore.com'`
  );

  // Get default tax rate and assign to products
  const defaultTax = await pool.query(
    "SELECT id FROM tax_rates WHERE is_default = true LIMIT 1"
  );
  
  if (defaultTax.rows[0]) {
    await pool.query(
      "UPDATE products SET tax_rate_id = $1 WHERE tax_rate_id IS NULL",
      [defaultTax.rows[0].id]
    );
  }

  console.log("✅ Auto-seed complete (admin + categories + products + suppliers + accounts + inventory + POS data)");
}
