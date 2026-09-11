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
  it('prints a converted total, and not a line for every item', () => {
    const html = buildThermalReceipt({
      sale, items, companyData: {} as any, ...base,
      secondaryCurrency: usd, exchangeRate: 0.00026,
    } as any);

    expect(html).toContain('Total (USD)');
    expect(html).toContain('$ 10.40');       // 40000 * 0.00026

    // Per-item conversions doubled the rows and wrapped the item name on a
    // 42-column slip. The rate below the total covers the same ground.
    expect(html).not.toContain('$ 7.80');    // 30000 converted
    expect(html).not.toContain('$ 2.60');    // 10000 converted
    expect(html).not.toContain('class="item-row fx-row"');
  });

  it('drops the decimals on a large converted figure', () => {
    // At a rate of 7500 a 200,000 total is 1,500,000,000 — nobody reads the
    // cents there, and they cost a line wrap on thermal paper.
    const html = buildThermalReceipt({
      sale: { ...sale, total_amount: 200000 }, items, companyData: {} as any,
      baseCurrencySymbol: 'USD', baseCurrencyCode: 'USD',
      secondaryCurrency: { id: 3, code: 'SSP', symbol: 'SSP' }, exchangeRate: 7500,
    } as any);

    expect(html).toContain('SSP 1,500,000,000');
    expect(html).not.toContain('1,500,000,000.00');
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

  it('shows a tiny converted amount literally, not as 0.00', () => {
    // 1 SSP = 0.00013 USD, so a 2.50 item is 0.000325. Two fixed decimals
    // renders that as "0.00", which reads as a broken conversion rather than a
    // small number.
    const smallSale = { ...sale, subtotal: 2.5, total_amount: 2.5 };
    const smallItems = [{ name: 'Tea', quantity: 1, unit_price: 2.5, total: 2.5 }] as any;

    const html = buildThermalReceipt({
      sale: smallSale, items: smallItems, companyData: {} as any,
      baseCurrencySymbol: 'SSP', baseCurrencyCode: 'SSP',
      secondaryCurrency: usd, exchangeRate: 0.00013,
    } as any);

    // The total converts to 0.000325 and must read as that, not "0.00".
    expect(html).toContain('$ 0.000325');
  });

  it('trims trailing zeros so the figure reads as itself', () => {
    // 1 * 0.00013 is 0.00013, not 0.000130.
    const oneSale = { ...sale, subtotal: 1, total_amount: 1 };
    const oneItem = [{ name: 'Sweet', quantity: 1, unit_price: 1, total: 1 }] as any;

    const html = buildThermalReceipt({
      sale: oneSale, items: oneItem, companyData: {} as any,
      baseCurrencySymbol: 'SSP', baseCurrencyCode: 'SSP',
      secondaryCurrency: usd, exchangeRate: 0.00013,
    } as any);

    expect(html).toContain('$ 0.00013');
    expect(html).not.toContain('$ 0.000130');
  });

  it('still converts a sale taken in the base currency', () => {
    // exchange_rate_used is 1.0 on every ordinary sale — it records that no
    // conversion happened at the till, not that none should be shown. Reading it
    // as the display rate silenced the second currency on nearly every receipt.
    const html = buildThermalReceipt({
      sale: { ...sale, exchange_rate_used: 1 },
      items, companyData: {} as any, ...base,
      secondaryCurrency: usd, exchangeRate: 0.00026,
    } as any);

    expect(html).toContain('Total (USD)');
    expect(html).toContain('$ 10.40');
  });

  it('keeps two decimals once the amount is large enough to matter', () => {
    // The small-number handling must not follow a normal amount around: 10.40
    // stays 10.40, not 10.4.
    const html = buildThermalReceipt({
      sale, items, companyData: {} as any, ...base,
      secondaryCurrency: usd, exchangeRate: 0.00026,
    } as any);
    expect(html).toContain('$ 10.40');
  });
});
