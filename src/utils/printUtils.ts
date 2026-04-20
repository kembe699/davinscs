/** Shared print template — matches the invoice PDF style exactly */

export const SHARED_PRINT_CSS = `
  @page { size: A4 portrait; margin: 1.2cm 1.5cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #222; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2980b9; padding-bottom: 14px; margin-bottom: 14px; }
  .header-left { display: flex; align-items: flex-start; gap: 14px; }
  .logo { width: 150px; height: 110px; object-fit: contain; }
  .logo-placeholder { width: 110px; height: 110px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 9px; text-align: center; }
  .company-name { font-size: 18px; font-weight: bold; color: #2c3e50; margin-bottom: 4px; }
  .company-detail { font-size: 10px; color: #666; line-height: 1.7; }
  .doc-meta { text-align: right; flex-shrink: 0; }
  .doc-title { font-size: 22px; font-weight: bold; color: #2980b9; letter-spacing: 2px; }
  .doc-number { font-size: 13px; color: #2c3e50; font-weight: bold; margin-top: 4px; }
  .doc-date { font-size: 10px; color: #666; margin-top: 2px; }
  .info-box { background: #f7f9fb; border: 1px solid #dce3ea; padding: 10px 14px; margin: 14px 0; }
  .info-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .info-name { font-size: 13px; font-weight: bold; color: #2c3e50; }
  .info-detail { font-size: 10px; color: #666; margin-top: 2px; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 2px; font-size: 10px; font-weight: bold; margin-top: 6px; }
  .status-draft     { background: #f3f4f6; color: #6b7280; }
  .status-sent      { background: #dbeafe; color: #1d4ed8; }
  .status-accepted  { background: #d1fae5; color: #059669; }
  .status-rejected  { background: #fee2e2; color: #dc2626; }
  .status-converted { background: #ede9fe; color: #7c3aed; }
  .status-unpaid    { background: #fee2e2; color: #dc2626; }
  .status-partial   { background: #fef3c7; color: #d97706; }
  .status-paid      { background: #d1fae5; color: #059669; }
  .status-voided    { background: #f3f4f6; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th { background: #2980b9; color: #fff; padding: 7px 6px; font-size: 10px; font-weight: bold; text-align: left; border: 1px solid #2471a3; }
  td { padding: 6px; font-size: 10px; color: #222; border: 1px solid #ddd; }
  tr:nth-child(even) td { background: #f7f9fb; }
  tfoot td { background: #e8edf1; font-weight: bold; border-top: 2px solid #999; }
  .num { text-align: right; font-family: monospace; }
  .right { text-align: right; }
  .center { text-align: center; }
  .section-title { font-size: 11px; font-weight: bold; color: #2c3e50; margin: 16px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
  .summary { display: flex; justify-content: flex-end; margin: 10px 0; }
  .summary-table { width: 260px; }
  .summary-table td { border: none; padding: 3px 6px; font-size: 11px; }
  .summary-table .total-row td { font-size: 13px; font-weight: bold; border-top: 2px solid #999; padding-top: 6px; }
  .summary-table .paid-row td { color: #059669; }
  .summary-table .balance-row td { color: #dc2626; font-weight: bold; }
  .notes-box { margin-top: 14px; font-size: 10px; color: #555; border: 1px solid #ddd; padding: 8px; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; color: #888; text-align: center; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 14px 0; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .summary-card { border: 1px solid #dce3ea; padding: 8px 10px; background: #f7f9fb; }
  .summary-card .s-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 3px; }
  .summary-card .s-value { font-size: 15px; font-weight: bold; color: #2c3e50; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

export function companyHeaderHTML(co: any, docTitle: string, docNumber: string, extraMeta = ""): string {
  return `
  <div class="header">
    <div class="header-left">
      ${co?.logo
        ? `<img class="logo" src="${co.logo}" alt="${co?.name || ''}">`
        : `<div class="logo-placeholder">No<br>Logo</div>`}
      <div>
        <div class="company-name">${co?.name || 'Company Name'}</div>
        <div class="company-detail">
          ${co?.address ? `${co.address}<br>` : ''}
          ${co?.city ? `${co.city}${co?.country ? ', ' + co.country : ''}<br>` : ''}
          ${co?.phone ? `Tel: ${co.phone}<br>` : ''}
          ${co?.email ? `Email: ${co.email}<br>` : ''}
          ${co?.website ? `Web: ${co.website}<br>` : ''}
          ${co?.tax_id ? `Tax ID: ${co.tax_id}` : ''}
        </div>
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">${docTitle}</div>
      <div class="doc-number">${docNumber}</div>
      ${extraMeta}
    </div>
  </div>`;
}

function buildFullHTML(title: string, bodyHTML: string): string {
  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"><title>${title}</title>
    <style>${SHARED_PRINT_CSS}</style>
  </head><body>${bodyHTML}</body></html>`;
}

/** Print directly — opens the OS print dialog without opening a new tab */
export function printDocument(title: string, bodyHTML: string): void {
  const html = buildFullHTML(title, bodyHTML);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;left:0;top:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow!.focus();
  setTimeout(() => {
    iframe.contentWindow!.print();
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
  }, 300);
}

/** Download as PDF — opens a print-ready window and triggers the browser print dialog.
 *  The user clicks "Save as PDF" in the dialog (works in all modern browsers).
 *  This replaces the broken jsPDF/html2canvas approach which produced empty files
 *  and caused page colour changes due to html2canvas DOM manipulation. */
export function downloadDocument(filename: string, bodyHTML: string): void {
  const html = buildFullHTML(filename, bodyHTML);
  const win = window.open('', '_blank');
  if (!win) {
    alert('Allow pop-ups to download this document as PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 400);
}

/** Print a thermal (80mm) receipt — uses NO shared A4 CSS so the caller's
 *  @page { size: 80mm auto } rule is the only one in the document. */
export function printThermal(title: string, bodyHTML: string): void {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${bodyHTML}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;left:0;top:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow!.focus();
  setTimeout(() => {
    iframe.contentWindow!.print();
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
  }, 300);
}

/** @deprecated use printDocument instead */
export function openPrintWindow(title: string, bodyHTML: string): void {
  printDocument(title, bodyHTML);
}
