-- Migration: Add tracking and cancellation columns to customer_orders
-- Date: 2026-04-17

ALTER TABLE customer_orders 
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id);
