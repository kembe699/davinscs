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

  // Combine all rows
  const wsData = [...headerData, ...dataRows];

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

  // Create PDF document
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Add company header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(companyInfo.address, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;

  doc.text(`Phone: ${companyInfo.phone} | Email: ${companyInfo.email}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;

  if (companyInfo.website) {
    doc.text(`Website: ${companyInfo.website}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
  }

  if (companyInfo.tax_id) {
    doc.text(`Tax ID: ${companyInfo.tax_id}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
  }

  // Add separator line
  yPosition += 5;
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 10;

  // Add report title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Add date range
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(dateRange, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

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

  // Add table
  autoTable(doc, {
    startY: yPosition,
    head: [columns.map(col => col.header)],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      // Add footer with page number
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      
      // Add generation timestamp
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        pageWidth - 15,
        pageHeight - 10,
        { align: 'right' }
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
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #2980b9;
          padding-bottom: 20px;
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
        <div class="company-name">${companyInfo.name}</div>
        <div class="company-info">
          ${companyInfo.address}<br>
          Phone: ${companyInfo.phone} | Email: ${companyInfo.email}
          ${companyInfo.website ? `<br>Website: ${companyInfo.website}` : ''}
          ${companyInfo.tax_id ? `<br>Tax ID: ${companyInfo.tax_id}` : ''}
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
