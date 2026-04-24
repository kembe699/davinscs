const fs = require('fs');
let content = fs.readFileSync('server/routes/pos.js', 'utf-8');

const newRoute = `
// PUBLIC VERIFY ENDPOINT (No Auth Required)
router.get("/verify/:sale_number", async (req, res) => {
  const schema = req.headers["x-schema-name"];
  if (!schema) return res.status(400).json({ error: "Schema name is required" });

  try {
    const sale = await db(schema)("pos_sales").where({ sale_number: req.params.sale_number }).first();
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const items = await db(schema)("pos_sale_items")
      .join("products", "pos_sale_items.product_id", "products.id")
      .where({ "pos_sale_items.pos_sale_id": sale.id })
      .select("pos_sale_items.*", "products.name as product_name", "products.sku");

    const company = await db(schema)("settings").where({ id: 1 }).first() || {};

    res.json({
      sale,
      items,
      company: {
        name: company.company_name,
        address: company.address,
        phone: company.phone,
        email: company.email,
        tax_id: company.tax_id,
        logo: company.logo
      }
    });
  } catch (error) {
    console.error("Error verifying sale:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
`;

content = content.replace('const router = express.Router();', 'const router = express.Router();\n' + newRoute);
fs.writeFileSync('server/routes/pos.js', content);
