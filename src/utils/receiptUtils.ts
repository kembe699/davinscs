/** Shared thermal receipt builder — 80mm POS format.
 *  Used by POSMain (live sale) and SalesHistory (reprint). */

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ReceiptSale {
  sale_number: string;
  created_at: string;
  customerName?: string;
  customer_name?: string;
  subtotal: number;
  taxAmount?: number;
  tax_amount?: number;
  taxRate?: number;
  discountAmount?: number;
  discount_amount?: number;
  promotionName?: string;
  total: number;
  total_amount?: number;
  paymentTypeName?: string;
  exchange_rate_used?: number | string | null;
  sale_currency_id?: number | null;
}

export interface ReceiptOptions {
  sale: ReceiptSale;
  items: ReceiptItem[];
  companyData: any;
  baseCurrencySymbol: string;
  baseCurrencyCode?: string;
  secondaryCurrency?: { id: number; code: string; symbol: string } | null;
  exchangeRate?: number | null;
}

export function buildThermalReceipt(opts: ReceiptOptions): string {
  const { sale, items, companyData: co, baseCurrencySymbol, baseCurrencyCode, secondaryCurrency, exchangeRate } = opts;

  const sym  = baseCurrencySymbol || 'UGX';
  const rate = sale.exchange_rate_used ? Number(sale.exchange_rate_used) : (exchangeRate ?? null);
  const hasFx = rate && rate !== 1 && secondaryCurrency;

  const money  = (n: number) => `${sym} ${Number(n || 0).toLocaleString()}`;
  const fxMoney = (n: number) => {
    if (!hasFx) return '';
    const converted = n * rate!;
    const formatted = converted >= 10
      ? Math.round(converted).toLocaleString()
      : converted.toFixed(2);
    return `${secondaryCurrency!.symbol} ${formatted}`;
  };

  const COLS = 42;
  const dash = '-'.repeat(COLS);
  const eq   = '='.repeat(COLS);

  const subtotal     = sale.subtotal ?? 0;
  const taxAmount    = sale.taxAmount ?? sale.tax_amount ?? 0;
  const discAmount   = sale.discountAmount ?? sale.discount_amount ?? 0;
  const total        = sale.total ?? sale.total_amount ?? 0;
  const customerName = sale.customerName ?? sale.customer_name ?? 'Walk-in Customer';
  const paymentName  = sale.paymentTypeName ?? '';
  const saleDate     = new Date(sale.created_at).toISOString().split('T')[0];

  const itemRows = items.map(item => `
    <tr class="item-row">
      <td class="col-item">${item.name.substring(0, 26)}</td>
      <td class="col-qty">${item.quantity}</td>
      <td class="col-price">${money(item.unit_price)}</td>
      <td class="col-total">${money(item.total)}</td>
    </tr>
  `).join('');

  const rateLine = hasFx
    ? `<div class="rate-box">Rate: 1 ${baseCurrencyCode || 'BASE'} = ${rate!.toFixed(4)} ${secondaryCurrency!.code} (manual, ${saleDate})</div>`
    : '';

  const css = `
    @page { size: 80mm auto; margin: 4mm 3mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; background: #fff; width: 74mm; }
    .center { text-align: center; }
    .bold   { font-weight: bold; }
    .large  { font-size: 13px; }
    .small  { font-size: 9px; }
    .dash   { white-space: pre; overflow: hidden; margin: 3px 0; }
    .row    { display: flex; justify-content: space-between; margin: 1px 0; }
    .total-row { font-size: 13px; font-weight: bold; margin: 2px 0; }
    .fx-total  { font-size: 12px; font-weight: bold; color: #333; }
    .rate-box  { font-size: 9px; border: 1px dashed #999; padding: 2px 4px; margin: 2px 0; }
    table  { width: 100%; border-collapse: collapse; margin: 2px 0; }
    th     { font-size: 10px; font-weight: bold; padding: 1px 2px; border-bottom: 1px solid #000; }
    td     { font-size: 10px; padding: 2px 2px; vertical-align: top; }
    .col-item  { width: 44%; text-align: left; }
    .col-qty   { width: 8%;  text-align: right; }
    .col-price { width: 24%; text-align: right; }
    .col-total { width: 24%; text-align: right; }
    tr.item-row td { border-bottom: 1px dashed #ccc; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  `;

  return `
<style>${css}</style>
${co?.logo ? `<div class="center" style="margin-bottom:4px;"><img src="${co.logo}" style="max-height:48px;max-width:60mm;object-fit:contain;"></div>` : ''}
<div class="center bold large">${(co?.name || '').toUpperCase()}</div>
${co?.address ? `<div class="center small">${co.address}</div>` : ''}
${co?.city    ? `<div class="center small">${co.city}${co.country ? ', ' + co.country : ''}</div>` : ''}
${co?.phone   ? `<div class="center small">Tel: ${co.phone}</div>` : ''}
${co?.email   ? `<div class="center small">Email: ${co.email}</div>` : ''}
<div class="dash">${dash}</div>
<div class="center bold">** SALES RECEIPT **</div>
<div class="center small">#${sale.sale_number}</div>
<div class="center small">${new Date(sale.created_at).toLocaleString()}</div>
<div class="small" style="margin-top:2px;">Customer: ${customerName}</div>
<div class="dash">${dash}</div>
<table>
  <thead>
    <tr>
      <th class="col-item">ITEM</th>
      <th class="col-qty">QTY</th>
      <th class="col-price">PRICE</th>
      <th class="col-total">TOTAL</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>
<div class="dash">${dash}</div>
<div class="row"><span>Subtotal:</span><span>${money(subtotal)}</span></div>
${discAmount > 0 ? `<div class="row"><span>Discount${sale.promotionName ? ` (${sale.promotionName})` : ''}:</span><span>-${money(discAmount)}</span></div>` : ''}
<div class="row"><span>Tax (${sale.taxRate ?? 0}%):</span><span>${money(taxAmount)}</span></div>
<div class="dash">${eq}</div>
<div class="row total-row"><span>TOTAL:</span><span>${money(total)}</span></div>
${hasFx ? `<div class="row fx-total"><span>TOTAL (${secondaryCurrency!.code}):</span><span>${fxMoney(total)}</span></div>${rateLine}` : ''}
<div class="dash">${dash}</div>
<div class="row"><span>Payment:</span><span>${paymentName}</span></div>
<div class="dash" style="margin-top:6px;">${dash}</div>
<div class="center bold">*** THANK YOU ***</div>
<div class="center small">Please come again!</div>
<div class="dash">${dash}</div>
<div class="center small" style="margin-top:2px;">Powered by FlippedPOS</div>
`;
}
