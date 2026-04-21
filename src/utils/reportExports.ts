import * as XLSX from 'xlsx';
import { SHARED_PRINT_CSS } from './printUtils';
import { showGlobalToast } from './toastBridge';

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  tax_id?: string;
  logo?: string;
}

export interface ReportExportOptions {
  reportTitle: string;
  dateRange: string;
  companyInfo: CompanyInfo;
  data: any[];
  columns: { header: string; dataKey: string }[];
  currency?: string;
}

// Format currency for display
const formatCurrency = (value: number, symbol: string = 'UGX'): string => {
  return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Export to Excel
export const exportToExcel = (options: ReportExportOptions) => {
  const { reportTitle, dateRange, companyInfo, data, columns } = options;

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create header rows
  const headerData = [
    [companyInfo.name],
    [companyInfo.address],
    [`Phone: ${companyInfo.phone} | Email: ${companyInfo.email}`],
    companyInfo.website ? [`Website: ${companyInfo.website}`] : [],
    [],
    [reportTitle],
    [dateRange],
    [],
    columns.map(col => col.header)
  ].filter(row => row.length > 0);

  // Create data rows
  const dataRows = data.map(row => 
    columns.map(col => {
      const value = row[col.dataKey];
      // Check if it's a currency value (typically large numbers)
      if (typeof value === 'number' && value > 1000) {
        return value.toLocaleString();
      }
      return value;
    })
  );

  // Calculate totals for numeric columns
  const totalsRow = columns.map((col, idx) => {
    if (idx === 0) return 'TOTAL';
    
    const isNumeric = data.some(row => typeof row[col.dataKey] === 'number');
    if (isNumeric && !col.dataKey.includes('average') && !col.dataKey.includes('avg')) {
      const sum = data.reduce((acc, row) => {
        const val = parseFloat(row[col.dataKey]) || 0;
        return acc + val;
      }, 0);
      
      if (sum > 1000) {
        return sum.toLocaleString();
      }
      return sum;
    }
    return '';
  });

  // Combine all rows
  const wsData = [...headerData, ...dataRows, totalsRow];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = columns.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, reportTitle.substring(0, 31));

  // Generate filename
  const filename = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Save file
  XLSX.writeFile(wb, filename);
};

// Export to PDF — uses browser-native print-to-PDF so page size is always true A4
export const exportToPDF = (options: ReportExportOptions) => {
  const { reportTitle, dateRange, companyInfo, data, columns } = options;

  const pdfWindow = window.open('', '_blank');
  if (!pdfWindow) {
    showGlobalToast('Please allow pop-ups in your browser to export PDF reports.', 'warning', 'Pop-up Blocked');
    return;
  }

  const tableRows = data.length > 0 ? `
    <table>
      <thead>
        <tr>${columns.map(col => `<th>${col.header}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${data.map((row, ri) => `
          <tr class="${ri % 2 === 0 ? '' : 'alt'}">
            ${columns.map((col, ci) => {
              const val = row[col.dataKey];
              const isNum = ci > 0 && (
                typeof val === 'number' ||
                (typeof val === 'string' && /^[\d,.\s]+$/.test(val.trim()))
              );
              return `<td class="${isNum ? 'num' : ''}">${val ?? ''}</td>`;
            }).join('')}
          </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          ${columns.map((col, idx) => {
            if (idx === 0) return '<td>TOTAL</td>';
            const vals = data.map(r => parseFloat(String(r[col.dataKey]).replace(/[^0-9.-]/g, ''))).filter(v => !isNaN(v));
            if (vals.length && !col.dataKey.includes('average') && !col.dataKey.includes('avg')) {
              const sum = vals.reduce((a, b) => a + b, 0);
              return `<td class="num">${sum.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>`;
            }
            return '<td></td>';
          }).join('')}
        </tr>
      </tfoot>
    </table>` : '<p class="no-data">No data available for the selected date range</p>';

  pdfWindow.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"><title>${reportTitle}</title>
  <style>${SHARED_PRINT_CSS}</style>
</head><body>
  <div class="header">
    <div class="header-left">
      ${companyInfo.logo
        ? `<img class="logo" src="${companyInfo.logo}" alt="${companyInfo.name}">`
        : `<div class="logo-placeholder">No<br>Logo</div>`}
      <div>
        <div class="company-name">${companyInfo.name}</div>
        <div class="company-detail">
          ${companyInfo.address ? companyInfo.address + '<br>' : ''}
          Phone: ${companyInfo.phone}${companyInfo.email ? ' | Email: ' + companyInfo.email : ''}
          ${companyInfo.website ? '<br>Web: ' + companyInfo.website : ''}
          ${companyInfo.tax_id ? '<br>Tax ID: ' + companyInfo.tax_id : ''}
        </div>
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">${reportTitle.toUpperCase()}</div>
      <div class="doc-date">Period: ${dateRange}</div>
    </div>
  </div>

  ${tableRows}

  <div class="footer">
    Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; This is a computer-generated document. No signature is required.
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
</body></html>`);

  pdfWindow.document.close();
};

// Print functionality
export const printReport = (options: ReportExportOptions) => {
  const { reportTitle, dateRange, companyInfo, data, columns, currency = 'UGX' } = options;

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showGlobalToast('Please allow pop-ups in your browser to print reports.', 'warning', 'Pop-up Blocked');
    return;
  }

  // Build HTML content
  let htmlContent = `
    <!DOCTYPE html><html><head>
      <title>${reportTitle}</title>
      <style>${SHARED_PRINT_CSS}</style>
    </head><body>
      <div class="header">
        <div class="header-left">
          ${companyInfo.logo
            ? `<img class="logo" src="${companyInfo.logo}" alt="${companyInfo.name}">`
            : `<div class="logo-placeholder">No<br>Logo</div>`}
          <div>
            <div class="company-name">${companyInfo.name}</div>
            <div class="company-detail">
              ${companyInfo.address ? companyInfo.address + '<br>' : ''}
              Phone: ${companyInfo.phone}${companyInfo.email ? ' | Email: ' + companyInfo.email : ''}
              ${companyInfo.website ? '<br>Web: ' + companyInfo.website : ''}
              ${companyInfo.tax_id ? '<br>Tax ID: ' + companyInfo.tax_id : ''}
            </div>
          </div>
        </div>
        <div class="doc-meta">
          <div class="doc-title">${reportTitle.toUpperCase()}</div>
          <div class="doc-date">${dateRange}</div>
        </div>
      </div>
      
      ${data.length > 0 ? `
        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${col.header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${columns.map(col => {
                  const value = row[col.dataKey];
                  let displayValue = value;
                  
                  // Format currency values
                  if (typeof value === 'number' && value > 1000 && 
                      (col.dataKey.includes('revenue') || col.dataKey.includes('amount') || 
                       col.dataKey.includes('spent') || col.dataKey.includes('price') || 
                       col.dataKey.includes('total') || col.dataKey.includes('sale'))) {
                    displayValue = formatCurrency(value, currency);
                  }
                  
                  // Format dates
                  if (col.dataKey.includes('date') && value) {
                    displayValue = new Date(value).toLocaleDateString();
                  }
                  
                  const isNumeric = typeof value === 'number' || col.dataKey.includes('revenue') || 
                                   col.dataKey.includes('amount') || col.dataKey.includes('quantity');
                  
                  return `<td class="${isNumeric ? 'text-right' : ''}">${displayValue || ''}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
          <tfoot style="background-color: #f0f0f0; font-weight: bold; border-top: 2px solid #333;">
            <tr>
              ${columns.map((col, idx) => {
                if (idx === 0) return '<td>TOTAL</td>';
                
                const isNumeric = data.some(row => typeof row[col.dataKey] === 'number');
                if (isNumeric && !col.dataKey.includes('average') && !col.dataKey.includes('avg')) {
                  const sum = data.reduce((acc, row) => {
                    const val = parseFloat(row[col.dataKey]) || 0;
                    return acc + val;
                  }, 0);
                  
                  let displayValue = sum;
                  if (sum > 1000 && (col.dataKey.includes('revenue') || col.dataKey.includes('amount') || 
                      col.dataKey.includes('spent') || col.dataKey.includes('price') || 
                      col.dataKey.includes('total') || col.dataKey.includes('sale'))) {
                    displayValue = formatCurrency(sum, currency);
                  }
                  
                  return `<td class="text-right">${displayValue}</td>`;
                }
                return '<td></td>';
              }).join('')}
            </tr>
          </tfoot>
        </table>
      ` : '<div class="no-data">No data available for the selected date range</div>'}
      
      <div class="footer">
        Generated on ${new Date().toLocaleString()}<br>
        This is a computer-generated document. No signature is required.
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};
