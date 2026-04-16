import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import pool from "../db.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    const { rows } = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (!rows[0]) {
      console.log(`[forgot-password] email not found in DB: ${email}`);
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }
    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      "DELETE FROM password_resets WHERE email = $1",
      [email.toLowerCase()]
    );
    await pool.query(
      "INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3)",
      [email.toLowerCase(), token, expires]
    );
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const resetLink = `${appUrl}/admin/reset-password?token=${token}`;
    console.log(`[forgot-password] SMTP_USER=${process.env.SMTP_USER} sending to ${email}`);
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
    await transporter.sendMail({
      from: `"Davin's Store" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset \u2014 Davin's CMS",
      html: `<p>Click the link below to reset your password. It expires in 1 hour.</p>
             <p><a href="${resetLink}">${resetLink}</a></p>
             <p>If you did not request this, ignore this email.</p>`,
    });
    console.log(`[forgot-password] email sent successfully to ${email}`);
    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("[forgot-password] error:", err.message);
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token and password required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  try {
    const { rows } = await pool.query(
      "SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW()",
      [token]
    );
    if (!rows[0]) return res.status(400).json({ error: "Invalid or expired reset token" });
    const hash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hash, rows[0].email]);
    await pool.query("DELETE FROM password_resets WHERE token = $1", [token]);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
