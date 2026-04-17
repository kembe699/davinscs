-- Create currencies table
CREATE TABLE IF NOT EXISTS currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  is_base BOOLEAN DEFAULT FALSE,
  exchange_rate DECIMAL(15,6) NOT NULL DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code);

-- Create index on is_base for quick base currency lookup
CREATE INDEX IF NOT EXISTS idx_currencies_is_base ON currencies(is_base) WHERE is_base = TRUE;

-- Ensure only one base currency
CREATE UNIQUE INDEX IF NOT EXISTS idx_currencies_single_base ON currencies(is_base) WHERE is_base = TRUE;
