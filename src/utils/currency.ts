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

/**
 * Format an amount that has been converted into another currency.
 *
 * A fixed two decimals is right for money people hand over and wrong for money
 * they only read. At a rate of 0.00013, a 2.50 item is 0.000325 in the second
 * currency — two decimals renders that as "0.00", which tells the customer
 * nothing and looks like the conversion is broken.
 *
 * So: two decimals once the figure is large enough for them to mean something,
 * and below that, enough decimals to show the number rather than round it away.
 * Trailing zeros are trimmed so the result reads as the literal value — 0.00013,
 * not 0.000130.
 */
export function formatConvertedAmount(amount: number): string {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);

  if (abs === 0) return '0.00';

  // Past a thousand, decimals are noise — nobody reads the cents on a figure
  // like 1,500,000,000, and on 42-column thermal paper they cost a line wrap.
  if (abs >= 1000) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  if (abs >= 0.01) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Three significant figures, however small. Capped so a rate with an absurd
  // number of zeros cannot produce an unreadable string.
  const decimals = Math.min(10, Math.ceil(-Math.log10(abs)) + 2);
  return n.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '');
}

/** The same, with the currency's symbol in front. */
export function formatConvertedCurrency(amount: number, symbol: string): string {
  return `${symbol} ${formatConvertedAmount(amount)}`;
}
