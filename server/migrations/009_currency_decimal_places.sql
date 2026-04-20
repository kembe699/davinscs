-- Add decimal_places to currencies for correct per-currency rounding
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS decimal_places INTEGER NOT NULL DEFAULT 2;

-- UGX (Ugandan Shilling) has 0 decimal places
UPDATE currencies SET decimal_places = 0 WHERE code = 'UGX';

-- JPY (Japanese Yen) has 0 decimal places if it exists
UPDATE currencies SET decimal_places = 0 WHERE code = 'JPY';

-- KWD, BHD, OMR have 3 decimal places if they exist
UPDATE currencies SET decimal_places = 3 WHERE code IN ('KWD', 'BHD', 'OMR');
