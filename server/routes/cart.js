import express from "express";
import pool from "../db.js";

const router = express.Router();

function getSessionId(req) {
  if (!req.session.id) {
    req.session.regenerate((err) => {
      if (err) console.error("Session regeneration error:", err);
    });
  }
  return req.session.id;
}

router.get("/", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const { rows } = await pool.query(`
      SELECT 
        ci.id, ci.quantity, ci.created_at,
        p.id as product_id, p.name, p.slug, p.price, p.image_url,
        p.quantity_on_hand, p.quantity_reserved,
        (p.quantity_on_hand - p.quantity_reserved) as available
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.session_id = $1
      ORDER BY ci.created_at DESC
    `, [sessionId]);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/add", async (req, res) => {
  const { product_id, quantity } = req.body;
  
  if (!product_id || !quantity || quantity < 1) {
    return res.status(400).json({ error: "Valid product ID and quantity required" });
  }
  
  try {
    const sessionId = getSessionId(req);
    
    const productResult = await pool.query(
      "SELECT quantity_on_hand, quantity_reserved FROM products WHERE id = $1",
      [product_id]
    );
    
    if (!productResult.rows[0]) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    const available = productResult.rows[0].quantity_on_hand - productResult.rows[0].quantity_reserved;
    
    if (available < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }
    
    const existingResult = await pool.query(
      "SELECT id, quantity FROM cart_items WHERE session_id = $1 AND product_id = $2",
      [sessionId, product_id]
    );
    
    if (existingResult.rows[0]) {
      const newQuantity = existingResult.rows[0].quantity + quantity;
      
      if (available < newQuantity) {
        return res.status(400).json({ error: "Insufficient stock for total quantity" });
      }
      
      const { rows } = await pool.query(
        "UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [newQuantity, existingResult.rows[0].id]
      );
      res.json(rows[0]);
    } else {
      const { rows } = await pool.query(
        "INSERT INTO cart_items (session_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *",
        [sessionId, product_id, quantity]
      );
      res.status(201).json(rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/update/:id", async (req, res) => {
  const { quantity } = req.body;
  
  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: "Valid quantity required" });
  }
  
  try {
    const sessionId = getSessionId(req);
    
    const cartItemResult = await pool.query(
      "SELECT product_id FROM cart_items WHERE id = $1 AND session_id = $2",
      [req.params.id, sessionId]
    );
    
    if (!cartItemResult.rows[0]) {
      return res.status(404).json({ error: "Cart item not found" });
    }
    
    const productResult = await pool.query(
      "SELECT quantity_on_hand, quantity_reserved FROM products WHERE id = $1",
      [cartItemResult.rows[0].product_id]
    );
    
    const available = productResult.rows[0].quantity_on_hand - productResult.rows[0].quantity_reserved;
    
    if (available < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }
    
    const { rows } = await pool.query(
      "UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [quantity, req.params.id]
    );
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/remove/:id", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const { rowCount } = await pool.query(
      "DELETE FROM cart_items WHERE id = $1 AND session_id = $2",
      [req.params.id, sessionId]
    );
    
    if (rowCount === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/clear", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    await pool.query("DELETE FROM cart_items WHERE session_id = $1", [sessionId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
