import { showGlobalToast } from './toastBridge';

/** Shared print template — professional letterhead style used by every
 *  printed/exported document (invoices, POs, GRNs, bills, quotations, reports).
 *  Accent color comes from the tenant's own Brand Color (Company Settings),
 *  injected per-document via brandAccentStyleTag() — falls back to a neutral
 *  charcoal if a tenant hasn't set one. */

export const SHARED_PRINT_CSS = `
  @page { size: A4 portrait; margin: 1.3cm 1.6cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1f2937; background: #fff; -webkit-font-smoothing: antialiased; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid var(--accent, #1f2937); padding-bottom: 16px; margin-bottom: 18px; }
  .header-left { display: flex; align-items: flex-start; gap: 14px; }
  .logo { width: 130px; height: 100px; object-fit: contain; }
  .logo-placeholder { width: 100px; height: 100px; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 9px; text-align: center; }
  .company-name { font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 4px; letter-spacing: 0.2px; }
  .company-detail { font-size: 9.5px; color: #6b7280; line-height: 1.7; }
  .doc-meta { text-align: right; flex-shrink: 0; }
  .doc-title { font-size: 19px; font-weight: 700; color: #111827; letter-spacing: 3px; text-transform: uppercase; }
  .doc-number { font-size: 12px; color: var(--accent, #1f2937); font-weight: 700; margin-top: 5px; font-family: 'Courier New', monospace; }
  .doc-date { font-size: 9.5px; color: #6b7280; margin-top: 3px; }
  .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 3px solid var(--accent, #1f2937); padding: 10px 14px; margin: 16px 0; }
  .info-label { font-size: 8.5px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px; font-weight: 600; }
  .info-name { font-size: 13px; font-weight: 700; color: #111827; }
  .info-detail { font-size: 9.5px; color: #6b7280; margin-top: 2px; }
  .status-badge { display: inline-block; padding: 2px 9px; border-radius: 3px; font-size: 9.5px; font-weight: 700; margin-top: 6px; letter-spacing: 0.3px; }
  .status-draft     { background: #f3f4f6; color: #6b7280; }
  .status-sent      { background: #f0fdfa; color: #0f766e; }
  .status-accepted  { background: #ecfdf5; color: #047857; }
  .status-rejected  { background: #fef2f2; color: #b91c1c; }
  .status-converted { background: #f5f3ff; color: #6d28d9; }
  .status-unpaid    { background: #fef2f2; color: #b91c1c; }
  .status-partial   { background: #fffbeb; color: #b45309; }
  .status-paid      { background: #ecfdf5; color: #047857; }
  .status-voided    { background: #f3f4f6; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #f9fafb; color: #374151; padding: 8px 7px; font-size: 9px; font-weight: 700; text-align: left; border-bottom: 2px solid var(--accent, #1f2937); text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 7px; font-size: 10px; color: #1f2937; border-bottom: 1px solid #eef0f2; }
  tr:nth-child(even) td { background: #fafbfc; }
  tfoot td { background: #f9fafb; font-weight: 700; border-top: 2px solid #111827; border-bottom: none; }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'Courier New', monospace; }
  .right { text-align: right; }
  .center { text-align: center; }
  .section-title { font-size: 10px; font-weight: 700; color: #111827; margin: 18px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; text-transform: uppercase; letter-spacing: 1.5px; }
  .summary { display: flex; justify-content: flex-end; margin: 12px 0; }
  .summary-table { width: 270px; }
  .summary-table td { border: none; padding: 4px 6px; font-size: 11px; }
  .summary-table .total-row td { font-size: 13px; font-weight: 700; border-top: 2px solid #111827; padding-top: 7px; }
  .summary-table .paid-row td { color: #047857; }
  .summary-table .balance-row td { color: #b91c1c; font-weight: 700; }
  .notes-box { margin-top: 16px; font-size: 9.5px; color: #4b5563; border: 1px solid #e5e7eb; border-left: 3px solid var(--accent, #1f2937); padding: 9px 12px; background: #fafbfc; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 8.5px; color: #9ca3af; text-align: center; letter-spacing: 0.2px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 16px 0; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .summary-card { border: 1px solid #e5e7eb; border-top: 2px solid var(--accent, #1f2937); padding: 9px 11px; background: #fafbfc; }
  .summary-card .s-label { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 4px; font-weight: 600; }
  .summary-card .s-value { font-size: 15px; font-weight: 700; color: #111827; }
  .no-data { padding: 40px; text-align: center; color: #9ca3af; font-size: 11px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

/** Sets the --accent CSS variable for this document from the tenant's own
 *  Brand Color (Company Settings), falling back to a neutral charcoal.
 *  Prepend this to any body HTML that isn't already covered by companyHeaderHTML(). */
export function brandAccentStyleTag(co: any): string {
  const accent = co?.brand_color_start || '#1f2937';
  return `<style>:root{--accent:${accent};}</style>`;
}

export function companyHeaderHTML(co: any, docTitle: string, docNumber: string, extraMeta = ""): string {
  return `
  ${brandAccentStyleTag(co)}
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

function waitForImagesAndPrint(iframe: HTMLIFrameElement) {
  const doc = iframe.contentDocument;
  if (!doc) return;

  const images = Array.from(doc.images);
  if (images.length === 0) {
    setTimeout(() => {
      iframe.contentWindow!.print();
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
    }, 100);
    return;
  }

  let loadedCount = 0;
  let hasPrinted = false;

  const doPrint = () => {
    if (hasPrinted) return;
    hasPrinted = true;
    iframe.contentWindow!.print();
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
  };

  images.forEach(img => {
    if (img.complete) {
      loadedCount++;
    } else {
      img.onload = () => {
        loadedCount++;
        if (loadedCount === images.length) doPrint();
      };
      img.onerror = () => {
        // Fallback for failed images
        loadedCount++;
        if (loadedCount === images.length) doPrint();
      };
    }
  });

  if (loadedCount === images.length) {
    doPrint();
  } else {
    // Fallback timeout to ensure it prints even if an image hangs
    setTimeout(doPrint, 1500);
  }
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
  waitForImagesAndPrint(iframe);
}

/** Download as PDF — opens a print-ready window and triggers the browser print dialog.
 *  The user clicks "Save as PDF" in the dialog (works in all modern browsers).
 *  This replaces the broken jsPDF/html2canvas approach which produced empty files
 *  and caused page colour changes due to html2canvas DOM manipulation. */
export function downloadDocument(filename: string, bodyHTML: string): void {
  const html = buildFullHTML(filename, bodyHTML);
  const win = window.open('', '_blank');
  if (!win) {
    showGlobalToast('Please allow pop-ups in your browser to download this document as PDF.', 'warning', 'Pop-up Blocked');
    return;
  }
  win.document.write(html);
  win.document.close();
  
  const images = Array.from(win.document.images);
  if (images.length === 0) {
    setTimeout(() => { win.print(); }, 400);
    return;
  }
  
  let loadedCount = 0;
  let hasPrinted = false;
  const doPrint = () => {
    if (hasPrinted) return;
    hasPrinted = true;
    win.print();
  };
  
  images.forEach(img => {
    if (img.complete) loadedCount++;
    else {
      img.onload = () => { loadedCount++; if (loadedCount === images.length) doPrint(); };
      img.onerror = () => { loadedCount++; if (loadedCount === images.length) doPrint(); };
    }
  });
  
  if (loadedCount === images.length) doPrint();
  else setTimeout(doPrint, 1500);
}

export function printThermal(title: string, bodyHTML: string): void {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${bodyHTML}</body></html>`;
  
  // Mobile browsers (especially Safari/Chrome on iOS/Android) struggle with printing hidden iframes.
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      
      const images = Array.from(win.document.images);
      if (images.length === 0) {
        setTimeout(() => { win.print(); }, 500);
        return;
      }
      
      let loadedCount = 0;
      let hasPrinted = false;
      const doPrint = () => {
        if (hasPrinted) return;
        hasPrinted = true;
        win.print();
      };
      
      images.forEach(img => {
        if (img.complete) loadedCount++;
        else {
          img.onload = () => { loadedCount++; if (loadedCount === images.length) doPrint(); };
          img.onerror = () => { loadedCount++; if (loadedCount === images.length) doPrint(); };
        }
      });
      
      if (loadedCount === images.length) doPrint();
      else setTimeout(doPrint, 1500);
      return;
    }
    // Fallback to iframe if popup is blocked
  }

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;left:0;top:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow!.focus();
  waitForImagesAndPrint(iframe);
}

/** @deprecated use printDocument instead */
export function openPrintWindow(title: string, bodyHTML: string): void {
  printDocument(title, bodyHTML);
}

export type BarcodeLabel = { code: string; name: string; price?: string };

/** Prints one small shelf/product label per barcode (name, price, scannable
 *  Code128 image, human-readable code underneath). Uses the same hosted
 *  barcode renderer already relied on for receipt barcodes, and
 *  printThermal() so it goes through the OS print dialog like every other
 *  printed document in the app rather than a plain data: export. */
export function printBarcodeLabels(labels: BarcodeLabel[]): void {
  const css = `
    @page { size: 50mm 30mm; margin: 2mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; }
    .label { width: 46mm; height: 26mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; text-align: center; page-break-after: always; }
    .label:last-child { page-break-after: auto; }
    .label .name { font-size: 9px; font-weight: 600; max-width: 44mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .label .price { font-size: 9px; font-weight: 700; }
    .label img { height: 30px; margin: 2px 0; }
    .label .code { font-size: 9px; letter-spacing: 1px; font-family: 'Courier New', monospace; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  `;
  const body = labels.map(l => `
    <div class="label">
      <div class="name">${l.name}</div>
      ${l.price ? `<div class="price">${l.price}</div>` : ''}
      <img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(l.code)}&code=Code128&dpi=96" />
      <div class="code">${l.code}</div>
    </div>
  `).join('');
  printThermal('Barcode label', `<style>${css}</style>${body}`);
}
