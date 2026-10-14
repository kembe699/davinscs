/** Shared thermal receipt builder — 80mm POS format.
 *  Used by POSMain (live sale) and SalesHistory (reprint). */

import QRCode from 'qrcode';
import { formatConvertedCurrency } from './currency';

/** The URL a scan of the receipt's QR code should land on. */
export function getReceiptVerifyUrl(saleNumber: string): string {
  const tenantSlug = window.location.pathname.split('/')[1] || '';
  return `${window.location.origin}/${tenantSlug}/verify/${saleNumber}`;
}

/** Renders the QR code locally as a data URI so printing never depends on a
 *  third-party image request completing in time (or at all). Falls back to
 *  the external QR image service only if local generation somehow fails. */
export async function generateReceiptQrDataUrl(saleNumber: string): Promise<string> {
  const url = getReceiptVerifyUrl(saleNumber);
  try {
    return await QRCode.toDataURL(url, { width: 160, margin: 1, errorCorrectionLevel: 'M' });
  } catch {
    return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}`;
  }
}

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
  /** Pre-generated QR data URI (from generateReceiptQrDataUrl). If omitted,
   *  falls back to the external qrserver.com image URL. */
  qrDataUrl?: string;
  /** Prints as a held/unpaid order ticket instead of a paid receipt — swaps the
   *  header and the payment line, no "Change" line (nothing was collected yet). */
  unpaid?: boolean;
}

export function buildThermalReceipt(opts: ReceiptOptions): string {
  const { sale, items, companyData: co, baseCurrencySymbol, baseCurrencyCode, secondaryCurrency, exchangeRate, qrDataUrl, unpaid } = opts;

  const sym  = baseCurrencySymbol || 'UGX';
  // Two different rates, and they answer different questions.
  //
  // exchange_rate_used records what this sale was transacted at. A sale taken in
  // the base currency stores 1.0, which is correct and means "no conversion
  // happened" — it does not mean "there is nothing to display". Treating it as
  // the display rate switched the second currency off on every ordinary sale,
  // which is nearly all of them: the till showed a converted price and the
  // receipt showed none.
  //
  // So: a sale struck in a foreign currency carries its own rate and a reprint
  // must use that snapshot, however far the rate has moved since. Anything else
  // is converted for information at the rate set now.
  const saleRate = sale.exchange_rate_used ? Number(sale.exchange_rate_used) : null;
  const rate = (saleRate && saleRate !== 1) ? saleRate : (exchangeRate ?? null);
  const hasFx = rate && rate !== 1 && secondaryCurrency;

  const money  = (n: number) => `${sym} ${Number(n || 0).toLocaleString()}`;
  const fxMoney = (n: number) => {
    if (!hasFx) return '';
    // Shared with the till, so the slip states what the screen did. Two decimals
    // once the figure is big enough to mean something, and the literal value
    // below that — a 2.50 item at 0.00013 is 0.000325, not "0.00".
    return formatConvertedCurrency(n * rate!, secondaryCurrency!.symbol);
  };

  const COLS = 42;
  const dash = '-'.repeat(COLS);
  const eq   = '='.repeat(COLS);

  const subtotal     = sale.subtotal ?? 0;
  const taxAmount    = sale.taxAmount ?? sale.tax_amount ?? 0;
  const discAmount   = sale.discountAmount ?? sale.discount_amount ?? 0;
  const total        = sale.total ?? sale.total_amount ?? 0;
  const customerName = sale.customerName ?? sale.customer_name ?? 'Cash Customer';
  const paymentName  = sale.paymentTypeName ?? 'Cash';
  const saleDate     = new Date(sale.created_at).toLocaleString();
  const runDate      = new Date().toLocaleDateString();

  // The converted figure goes on the total, not on every line.
  //
  // A line each doubled the rows and, at real magnitudes, wrapped: a 42-column
  // slip cannot hold an item name, a quantity, a price and a nine-digit
  // conversion, so the name broke across three lines and the receipt became
  // harder to read than it was without any of it. The total is the number the
  // customer is actually converting, and the rate below it lets any line be
  // worked out.
  const itemRows = items.map(item => `
    <tr class="item-row">
      <td class="col-item">${item.name.substring(0, 20)}</td>
      <td class="col-qty">${item.quantity.toFixed(2)}</td>
      <td class="col-unit">PCE</td>
      <td class="col-price">${money(item.unit_price).replace(sym+' ', '')}</td>
      <td class="col-total">${money(item.total).replace(sym+' ', '')}</td>
    </tr>
  `).join('');

  // Tax breakdown (approximate based on standard VAT)
  const amtWoVat = total - taxAmount;
  const netAmt = total;

  const qrSrc = qrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(getReceiptVerifyUrl(sale.sale_number))}`;

  const css = `
    @page { size: 80mm auto; margin: 4mm 3mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    /* color was already pure #000, but a thin monospace at 10-11px prints
       visibly faded on a lot of real thermal printers regardless of the
       colour value — more heat gets applied per stroke on a bolder
       weight, which is what actually reads as "darker" on thermal paper.
       600 (not full 700/bold) keeps .total-row's existing bold still
       reading as the heaviest line on the slip. */
    body { font-family: 'Courier New', Courier, monospace; font-weight: 600; font-size: 11px; color: #000; background: #fff; width: 74mm; padding-bottom: 20px; }
    .center { text-align: center; }
    .left { text-align: left; }
    .bold   { font-weight: bold; }
    .large  { font-size: 13px; }
    .small  { font-size: 9px; }
    .dash   { white-space: pre; overflow: hidden; margin: 3px 0; }
    .row    { display: flex; justify-content: space-between; margin: 1px 0; }
    /* Converted amounts sit under the figure they restate, lighter and smaller,
       so the base currency stays the one the eye lands on. Thermal paper has no
       colour, so the distinction is size and italics rather than grey. */
    .fx-row { font-size: 0.82em; font-style: italic; }
    .fx-row td { padding-bottom: 2px; }
    .total-row { font-size: 13px; font-weight: bold; margin: 2px 0; }
    table  { width: 100%; border-collapse: collapse; margin: 2px 0; }
    th     { font-size: 10px; font-weight: 600; padding: 1px 1px; border-bottom: 1px dashed #000; text-align: right; }
    th.col-item { text-align: left; }
    td     { font-size: 10px; padding: 2px 1px; vertical-align: top; text-align: right; }
    .col-item  { width: 40%; text-align: left; }
    .col-qty   { width: 10%; }
    .col-unit  { width: 10%; text-align: center; }
    .col-price { width: 20%; }
    .col-total { width: 20%; }
    .vat-table th { border-bottom: none; border-top: 1px dashed #000; padding-top: 4px; }
    .vat-table td { padding-bottom: 4px; border-bottom: 1px dashed #000; }
    .qr-container { display: flex; flex-direction: column; align-items: center; margin-top: 5px; }
    .barcode-container { display: flex; justify-content: center; margin: 4px 0 8px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  `;

  return `
<style>${css}</style>
${co?.logo ? `<div class="center" style="margin-bottom:4px;"><img src="${co.logo}" style="max-height:48px;max-width:60mm;object-fit:contain;"></div>` : ''}
<div class="center bold large" style="margin-bottom:4px;">${(co?.name || 'SUPERMARKET').toUpperCase()}</div>
${co?.address ? `<div class="center">${co.address}</div>` : ''}
${co?.phone   ? `<div class="center">${co.phone}</div>` : ''}
${co?.email   ? `<div class="center">${co.email}</div>` : ''}
${co?.tax_id  ? `<div class="center" style="margin-bottom: 4px;">TIN : ${co.tax_id}</div>` : ''}

<div class="dash">${dash}</div>
<div class="center bold large" style="margin: 4px 0;">${unpaid ? 'UNPAID ORDER / HOLD TICKET' : 'CASH SALE / TAX INVOICE'}</div>
<div class="center" style="margin-bottom: 6px;">${sale.sale_number}</div>

<div class="barcode-container">
  <img src="https://barcode.tec-it.com/barcode.ashx?data=${sale.sale_number}&code=Code128&dpi=96" style="max-width:100%;height:40px;" />
</div>

<div class="row"><span>Date : ${saleDate}</span><span>Till: TILL 1</span></div>
<div class="row"><span>Run Date : ${runDate}</span></div>

<div style="margin: 6px 0;">Customer Name : ${customerName}</div>

<div class="dash">${dash}</div>
<table>
  <thead>
    <tr>
      <th class="col-item">Item</th>
      <th class="col-qty">Qty</th>
      <th class="col-unit">Unit</th>
      <th class="col-price">Price (${sym})</th>
      <th class="col-total">Amount (${sym})</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<div class="row total-row" style="margin-top: 4px;"><span>Total :</span><span>${money(total)}</span></div>
${hasFx ? `<div class="row fx-row"><span>Total (${secondaryCurrency!.code}) :</span><span>${fxMoney(total)}</span></div>
<div class="row fx-row"><span>Rate :</span><span>1 ${baseCurrencyCode || sym} = ${rate} ${secondaryCurrency!.code}</span></div>` : ''}
${unpaid
  ? `<div class="row bold"><span>Balance Due :</span><span>${money(total)}</span></div>`
  : `<div class="row"><span>${paymentName}</span><span>${money(total)}</span></div>
<div class="row"><span>Change :</span><span>0</span></div>`}
<div class="row" style="margin-bottom: 4px;"><span>Total Items :</span><span>${items.length}</span></div>

<table class="vat-table">
  <thead>
    <tr>
      <th style="text-align:left;">VAT</th>
      <th style="text-align:right;">Amt W/o VAT</th>
      <th style="text-align:right;">VAT Amt</th>
      <th style="text-align:right;">Net Amt</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:left;">Standard</td>
      <td style="text-align:right;">${money(amtWoVat).replace(sym+' ', '')}</td>
      <td style="text-align:right;">${money(taxAmount).replace(sym+' ', '')}</td>
      <td style="text-align:right;">${money(netAmt).replace(sym+' ', '')}</td>
    </tr>
  </tbody>
</table>

<div class="row" style="margin-top:4px;"><span>Fiscal Doc No :</span><span class="bold">${sale.sale_number}</span></div>
<div class="row"><span>Verification Code :</span><span class="bold">${Date.now()}${Math.floor(Math.random()*1000)}</span></div>

<div class="qr-container">
  <img src="${qrSrc}" style="width:80px; height:80px;" />
</div>

${unpaid ? '<div class="center bold" style="margin: 6px 0;">*** NOT YET PAID ***</div>' : ''}
<div class="footer-line">Received By : _______________________</div>
<div class="footer-line">You Were Served By : ${(sale as any).userName || 'ADMIN'}</div>
<div class="footer-line bold">Thank You !!! Please Come Again....</div>

<div class="footer-line">Powered by FlippedPOS (www.flippedpos.com)</div>
`;
}

