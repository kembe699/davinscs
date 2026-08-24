// Currency utility functions for formatting and conversion

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_base: boolean;
  exchange_rate: number;
  is_active: boolean;
}

let cachedCurrencies: Currency[] = [];
let cachedBaseCurrency: Currency | null = null;

// Fetch and cache all currencies
export async function getCurrencies(): Promise<Currency[]> {
  if (cachedCurrencies.length > 0) {
    return cachedCurrencies;
  }
  
  try {
    const token = localStorage.getItem('cms_token');
    const response = await fetch('/api/currencies', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to fetch currencies');
    cachedCurrencies = await response.json();
    return cachedCurrencies;
  } catch (error) {
    console.error('Error fetching currencies:', error);
    // Return default UGX if fetch fails
    return [{ 
      id: 1, 
      code: 'UGX', 
      name: 'Ugandan Shilling', 
      symbol: 'UGX', 
      is_base: true, 
      exchange_rate: 1.0,
      is_active: true 
    }];
  }
}

// Get base currency
export async function getBaseCurrency(): Promise<Currency> {
  if (cachedBaseCurrency) {
    return cachedBaseCurrency;
  }
  
  try {
    const token = localStorage.getItem('cms_token');
    const response = await fetch('/api/currencies/base', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to fetch base currency');
    cachedBaseCurrency = await response.json();
    return cachedBaseCurrency;
  } catch (error) {
    console.error('Error fetching base currency:', error);
    // Return default UGX if fetch fails
    const defaultCurrency = { 
      id: 1, 
      code: 'UGX', 
      name: 'Ugandan Shilling', 
      symbol: 'UGX', 
      is_base: true, 
      exchange_rate: 1.0,
      is_active: true 
    };
    cachedBaseCurrency = defaultCurrency;
    return defaultCurrency;
  }
}

// Clear cache (call when currencies are updated)
export function clearCurrencyCache() {
  cachedCurrencies = [];
  cachedBaseCurrency = null;
}

// Get currency symbol by code
export function getCurrencySymbol(code: string): string {
  const currency = cachedCurrencies.find(c => c.code === code);
  return currency?.symbol || code;
}

// Rounds to 2 decimal places (the actual precision every money column in the
// database stores, NUMERIC(15,2)) — for computed amounts (a % discount, tax on
// a fractional subtotal, price derived from cost+margin) that would otherwise
// carry raw floating-point noise (e.g. 13.433000000000002) into a saved value.
// Never round further than this — a real fractional amount a user typed (7.2,
// 2.3, …) must reach the database exactly as entered, not snapped to a whole
// number.
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

// Format amount with currency symbol
// Amount is expected in cents (divide by 100 for display)
export async function formatCurrency(
  amount: number,
  currencyCode?: string,
  showDecimals: boolean = true
): Promise<string> {
  const baseCurrency = await getBaseCurrency();
  const code = currencyCode || baseCurrency.code;
  const symbol = getCurrencySymbol(code) || code;

  // Postgres NUMERIC columns come back from the API as strings (node-postgres'
  // default, to avoid silent float precision loss) — String.prototype.toLocaleString
  // is effectively a no-op (no grouping, no fraction-digit padding), so an
  // unparsed string here doesn't error, it just silently renders wrong
  // ("101000.00" instead of "101,000.00"). Number() first makes this safe
  // regardless of whether the caller already converted it.
  const n = Number(amount) || 0;
  const formatted = showDecimals
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return `${symbol} ${formatted}`;
}

// Synchronous version for when currency is already loaded
export function formatCurrencySync(
  amount: number,
  currencySymbol: string = 'UGX',
  showDecimals: boolean = true
): string {
  // See formatCurrency above for why this coercion matters.
  const n = Number(amount) || 0;
  const formatted = showDecimals
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return `${currencySymbol} ${formatted}`;
}

// Convert amount from one currency to another
export async function convertAmount(
  amount: number,
  fromCode: string,
  toCode: string
): Promise<number> {
  const currencies = await getCurrencies();
  const fromCurrency = currencies.find(c => c.code === fromCode);
  const toCurrency = currencies.find(c => c.code === toCode);
  
  if (!fromCurrency || !toCurrency) {
    throw new Error(`Currency not found: ${fromCode} or ${toCode}`);
  }
  
  // Convert to base currency first, then to target currency
  const amountInBase = amount / fromCurrency.exchange_rate;
  const convertedAmount = amountInBase * toCurrency.exchange_rate;
  
  return convertedAmount;
}
