import React from 'react';

interface Column {
  header: string;
  accessor: string;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => string;
}

interface ReportTableProps {
  columns: Column[];
  data: any[];
  showTotals?: boolean;
  totalsExclude?: string[];
}

export default function ReportTable({ columns, data, showTotals = true, totalsExclude = [] }: ReportTableProps) {
  const calculateTotal = (accessor: string) => {
    if (totalsExclude.includes(accessor)) return '';
    
    // Check if any row has a numeric value for this accessor
    const hasNumericValues = data.some(row => {
      const val = row[accessor];
      return val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(val));
    });
    
    if (!hasNumericValues) return '';
    
    const sum = data.reduce((acc, row) => {
      const val = parseFloat(row[accessor]) || 0;
      return acc + val;
    }, 0);
    
    return sum;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#2980b9', color: 'white' }}>
            {columns.map((col, idx) => (
              <th 
                key={idx}
                className={`px-4 py-3 font-bold border border-gray-400 ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} style={{ backgroundColor: rowIdx % 2 === 0 ? 'white' : '#f5f5f5' }}>
              {columns.map((col, colIdx) => (
                <td 
                  key={colIdx}
                  className={`px-4 py-3 text-gray-900 border border-gray-300 ${
                    col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : ''
                  }`}
                >
                  {col.format ? col.format(row[col.accessor]) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {showTotals && data.length > 0 && (
          <tfoot>
            <tr style={{ backgroundColor: '#dcdcdc', fontWeight: 'bold', borderTop: '2px solid #333' }}>
              {columns.map((col, idx) => {
                if (idx === 0) {
                  return (
                    <td key={idx} className="px-4 py-3 text-gray-900 border border-gray-400">
                      TOTAL
                    </td>
                  );
                }
                
                const total = calculateTotal(col.accessor);
                return (
                  <td 
                    key={idx}
                    className={`px-4 py-3 text-gray-900 border border-gray-400 ${
                      col.align === 'right' ? 'text-right font-mono' : ''
                    }`}
                  >
                    {total !== '' && col.format ? col.format(total) : total}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
