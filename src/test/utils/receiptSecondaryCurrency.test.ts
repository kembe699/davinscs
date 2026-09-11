/**
 * A receipt has to show the same two currencies the customer was quoted.
 *
 * The converter existed and was wired all the way through — POSMain fetches the
 * rate and passes it in — but nothing ever called it, so the till showed a price
 * in the second currency and the printed slip showed only the base. The customer
 * asking "how much in dollars?" got one answer on screen and none on paper.
 */
import { describe, it, expect } from 'vitest';
import { buildThermalReceipt } from '@/utils/receiptUtils';

const sale = {
  id: 1,
  receipt_number: 'R-001',
  created_at: new Date('2026-09-11T10:00:00Z').toISOString(),
  subtotal: 40000,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 40000,
  customer_name: 'Cash Customer',
  paymentTypeName: 'Cash',
} as any;

const items = [
  { name: 'Chicken Curry', quantity: 2, unit_price: 15000, total: 30000 },
  { name: 'Soda', quantity: 1, unit_price: 10000, total: 10000 },
] as any;

const base = { baseCurrencySymbol: 'UGX', baseCurrencyCode: 'UGX' };
const usd = { id: 2, code: 'USD', symbol: '$' };

describe('receipt shows the second currency', () => {
  it('prints a converted amount for every line and for the total', () => {
    const html = buildThermalReceipt({
      sale, items, companyData: {} as any, ...base,
      secondaryCurrency: usd, exchangeRate: 0.00026,
    } as any);

    // 15000 * 0.00026 = 3.90, under 10 so it keeps its decimals.
    expect(html).toContain('$ 3.90');
    // 30000 -> 7.80, 10000 -> 2.60, total 40000 -> 10.40
    expect(html).toContain('$ 7.80');
    expect(html).toContain('$ 2.60');
    expect(html).toContain('Total (USD)');
    expect(html).toContain('$ 10.40');
  });

  it('states the rate it converted at, so the slip can be checked later', () => {
    const html = buildThermalReceipt({
      sale, items, companyData: {} as any, ...base,
      secondaryCurrency: usd, exchangeRate: 0.00026,
    } as any);
    expect(html).toMatch(/1 UGX = 0\.00026 USD/);
  });

  it('says nothing extra when the shop has only one currency', () => {
    // No second currency configured: the receipt must look exactly as before,
    // not carry empty rows or a stray "≈".
    const html = buildThermalReceipt({
      sale, items, companyData: {} as any, ...base,
      secondaryCurrency: null, exchangeRate: null,
    } as any);
    // The class lives in the stylesheet either way; what matters is that no row
    // using it was rendered.
    expect(html).not.toContain('class="item-row fx-row"');
    expect(html).not.toContain('Total (');
  });

  it('says nothing when the rate is 1 — the two would read identically', () => {
    const html = buildThermalReceipt({
      sale, items, companyData: {} as any, ...base,
      secondaryCurrency: usd, exchangeRate: 1,
    } as any);
    expect(html).not.toContain('class="item-row fx-row"');
    expect(html).not.toContain('Total (');
  });

  it('uses the rate the sale was struck at, not today\'s', () => {
    // A reprint months later must not restate the sale at a rate that has moved.
    const html = buildThermalReceipt({
      sale: { ...sale, exchange_rate_used: 0.0005 },
      items, companyData: {} as any, ...base,
      secondaryCurrency: usd, exchangeRate: 0.00026,
    } as any);
    expect(html).toContain('$ 20.00');    // 40000 * 0.0005
    expect(html).not.toContain('$ 10.40'); // not today's rate
  });
});
