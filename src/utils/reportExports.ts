import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  return `${symbol} ${(value / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        return (value / 100).toFixed(2);
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
        return (sum / 100).toFixed(2);
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

// Export to PDF
export const exportToPDF = (options: ReportExportOptions) => {
  const { reportTitle, dateRange, companyInfo, data, columns, currency = 'UGX' } = options;

  // Create PDF document with A4 size and better margins
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 25;
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;

  // Add company logo on the left if available
  if (companyInfo.logo) {
    try {
      doc.addImage(companyInfo.logo, 'JPEG', leftMargin, yPosition, 35, 35);
    } catch (err) {
      console.log('Could not add logo to PDF');
    }
  }

  // Add company header on the right with professional styling
  const textStartX = pageWidth - 20;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 128, 185); // Professional blue color
  doc.text(companyInfo.name, textStartX, yPosition + 2, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80); // Dark gray for contact info
  yPosition += 10;
  doc.text(companyInfo.address, textStartX, yPosition, { align: 'right' });
  yPosition += 5;

  doc.text(`Phone: ${companyInfo.phone}`, textStartX, yPosition, { align: 'right' });
  yPosition += 5;
  
  doc.text(`Email: ${companyInfo.email}`, textStartX, yPosition, { align: 'right' });
  yPosition += 5;

  if (companyInfo.website) {
    doc.text(`Website: ${companyInfo.website}`, textStartX, yPosition, { align: 'right' });
    yPosition += 5;
  }

  if (companyInfo.tax_id) {
    doc.text(`Tax ID: ${companyInfo.tax_id}`, textStartX, yPosition, { align: 'right' });
    yPosition += 5;
  }

  // Add professional separator line
  yPosition = Math.max(yPosition, 65); // Ensure we're below the logo
  doc.setDrawColor(41, 128, 185); // Blue line
  doc.setLineWidth(1);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 15;

  // Add report title with professional styling
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80); // Dark blue-gray
  doc.text(reportTitle.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Add date range with subtle styling
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 140, 141); // Medium gray
  doc.text(`Period: ${dateRange}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Prepare table data
  const tableData = data.map(row => 
    columns.map(col => {
      const value = row[col.dataKey];
      
      // Format currency values
      if (typeof value === 'number' && value > 1000 && 
          (col.dataKey.includes('revenue') || col.dataKey.includes('amount') || 
           col.dataKey.includes('spent') || col.dataKey.includes('price') || 
           col.dataKey.includes('total') || col.dataKey.includes('sale'))) {
        return formatCurrency(value, currency);
      }
      
      // Format dates
      if (col.dataKey.includes('date') && value) {
        return new Date(value).toLocaleDateString();
      }
      
      return value?.toString() || '';
    })
  );

  // Calculate totals row
  const totalsRow = columns.map((col, idx) => {
    if (idx === 0) return 'TOTAL';
    
    const isNumeric = data.some(row => typeof row[col.dataKey] === 'number');
    if (isNumeric && !col.dataKey.includes('average') && !col.dataKey.includes('avg')) {
      const sum = data.reduce((acc, row) => {
        const val = parseFloat(row[col.dataKey]) || 0;
        return acc + val;
      }, 0);
      
      if (sum > 1000 && (col.dataKey.includes('revenue') || col.dataKey.includes('amount') || 
          col.dataKey.includes('spent') || col.dataKey.includes('price') || 
          col.dataKey.includes('total') || col.dataKey.includes('sale'))) {
        return formatCurrency(sum, currency);
      }
      return sum.toString();
    }
    return '';
  });

  // Add table with professional styling
  autoTable(doc, {
    startY: yPosition,
    head: [columns.map(col => col.header)],
    body: [...tableData, totalsRow],
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 5,
      lineColor: [189, 195, 199],
      lineWidth: 0.5,
      textColor: [44, 62, 80],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11,
      halign: 'center',
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    footStyles: {
      fillColor: [236, 240, 241],
      fontStyle: 'bold',
      textColor: [44, 62, 80],
      fontSize: 10,
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data) => {
      // Style the last row (totals) as footer
      if (data.row.index === tableData.length) {
        data.cell.styles.fillColor = [236, 240, 241];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
        data.cell.styles.textColor = [44, 62, 80];
      }
      
      // Right-align numeric columns
      if (data.section === 'body' && data.column.index > 0) {
        const cellValue = data.cell.raw;
        if (typeof cellValue === 'string' && (cellValue.match(/^\d/) || cellValue.includes(currency))) {
          data.cell.styles.halign = 'right';
        }
      }
    },
    didDrawPage: (data) => {
      // Add professional footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      
      // Footer background
      doc.setFillColor(250, 250, 250);
      doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
      
      // Footer line
      doc.setDrawColor(189, 195, 199);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
      
      // Page number
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(127, 140, 141);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 12,
        { align: 'center' }
      );
      
      // Generation timestamp
      doc.setFontSize(8);
      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        pageWidth - 20,
        pageHeight - 12,
        { align: 'right' }
      );
      
      // Company name in footer
      doc.text(
        companyInfo.name,
        20,
        pageHeight - 12,
        { align: 'left' }
      );
    },
  });

  // Generate filename
  const filename = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  // Save PDF
  doc.save(filename);
};

// Print functionality
export const printReport = (options: ReportExportOptions) => {
  const { reportTitle, dateRange, companyInfo, data, columns, currency = 'UGX' } = options;

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to print reports');
    return;
  }

  // Build HTML content
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${reportTitle}</title>
      <style>
        @media print {
          @page {
            margin: 1cm;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        
        .header {
          display: flex;
          align-items: flex-start;
          gap: 30px;
          margin-bottom: 30px;
          border-bottom: 2px solid #2980b9;
          padding-bottom: 20px;
        }
        
        .logo-container {
          flex-shrink: 0;
        }
        
        .logo-container img {
          width: 120px;
          height: 120px;
          object-fit: contain;
        }
        
        .company-details {
          flex: 1;
          text-align: right;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .company-info {
          font-size: 12px;
          color: #7f8c8d;
          line-height: 1.6;
        }
        
        .report-title {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0 10px 0;
          color: #2c3e50;
        }
        
        .date-range {
          text-align: center;
          font-size: 12px;
          color: #7f8c8d;
          margin-bottom: 20px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        
        th {
          background-color: #2980b9;
          color: white;
          padding: 12px 8px;
          text-align: left;
          font-size: 12px;
          font-weight: bold;
        }
        
        td {
          padding: 10px 8px;
          border-bottom: 1px solid #ddd;
          font-size: 11px;
        }
        
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        tr:hover {
          background-color: #f5f5f5;
        }
        
        .text-right {
          text-align: right;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          color: #7f8c8d;
          text-align: center;
        }
        
        .no-data {
          text-align: center;
          padding: 40px;
          color: #7f8c8d;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-container">
          ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="${companyInfo.name}">` : '<div style="width: 120px; height: 120px; border: 2px solid #ddd; display: flex; align-items: center; justify-content: center; color: #999;">No Logo</div>'}
        </div>
        <div class="company-details">
          <div class="company-name">${companyInfo.name}</div>
          <div class="company-info">
            ${companyInfo.address}<br>
            Phone: ${companyInfo.phone} | Email: ${companyInfo.email}
            ${companyInfo.website ? `<br>Website: ${companyInfo.website}` : ''}
            ${companyInfo.tax_id ? `<br>Tax ID: ${companyInfo.tax_id}` : ''}
          </div>
        </div>
      </div>
      
      <div class="report-title">${reportTitle}</div>
      <div class="date-range">${dateRange}</div>
      
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
