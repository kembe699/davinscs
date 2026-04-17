-- Create exchange_rates table for managing currency conversion rates with expiry
CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  from_currency_id INTEGER REFERENCES currencies(id) ON DELETE CASCADE,
  to_currency_id INTEGER REFERENCES currencies(id) ON DELETE CASCADE,
  rate DECIMAL(15,6) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_currency_id, to_currency_id, effective_date)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_currency ON exchange_rates(from_currency_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_to_currency ON exchange_rates(to_currency_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_active ON exchange_rates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_exchange_rates_dates ON exchange_rates(effective_date, expiry_date);
