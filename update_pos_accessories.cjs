const fs = require('fs');
const path = require('path');

const files = [
  '/home/levi96/Documents/Int/davinscs/src/pages/pos/SalesHistory.tsx',
  '/home/levi96/Documents/Int/davinscs/src/pages/pos/CashManagement.tsx',
  '/home/levi96/Documents/Int/davinscs/src/pages/pos/EndOfDay.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Replace admin classes with the new POS design classes
    content = content.replace(/bg-admin-bg/g, 'bg-[#F8F9FA] dark:bg-gray-900');
    content = content.replace(/bg-admin-surface/g, 'bg-white dark:bg-gray-800');
    content = content.replace(/border-admin-border/g, 'border-gray-200 dark:border-gray-700');
    content = content.replace(/text-admin-text-secondary/g, 'text-gray-500 dark:text-gray-400');
    content = content.replace(/text-admin-text/g, 'text-[#1A1A2E] dark:text-gray-100');
    
    // Convert any custom specific styles if found
    content = content.replace(/bg-primary(?!(\/| dark|-))/g, 'bg-[#00A896] dark:bg-[#00A896]');
    content = content.replace(/text-primary(?!(\/| dark|-))/g, 'text-[#00A896] dark:text-[#00A896]');

    fs.writeFileSync(file, content);
    console.log(`Updated ${path.basename(file)}`);
  }
});
