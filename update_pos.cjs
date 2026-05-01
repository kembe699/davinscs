const fs = require('fs');

let content = fs.readFileSync('/home/levi96/Documents/Int/davinscs/src/pages/pos/POSMain.tsx', 'utf8');

// Replacements
content = content.replace(/bg-\[\#F8F9FA\]/g, 'bg-[#F8F9FA] dark:bg-gray-900');
content = content.replace(/text-\[\#1A1A2E\]/g, 'text-[#1A1A2E] dark:text-gray-100');
content = content.replace(/bg-white(?!(\/| dark|-))/g, 'bg-white dark:bg-gray-800');
content = content.replace(/border-gray-200/g, 'border-gray-200 dark:border-gray-700');
content = content.replace(/border-gray-100/g, 'border-gray-100 dark:border-gray-700/50');
content = content.replace(/text-gray-600/g, 'text-gray-600 dark:text-gray-300');
content = content.replace(/text-gray-500/g, 'text-gray-500 dark:text-gray-400');
content = content.replace(/text-gray-700/g, 'text-gray-700 dark:text-gray-200');
content = content.replace(/text-gray-800/g, 'text-gray-800 dark:text-gray-100');
content = content.replace(/text-gray-400/g, 'text-gray-400 dark:text-gray-500');
content = content.replace(/bg-gray-50(?!(\/| dark|-))/g, 'bg-gray-50 dark:bg-gray-800/50');
content = content.replace(/bg-gray-100(?!(\/| dark|-))/g, 'bg-gray-100 dark:bg-gray-700');
content = content.replace(/bg-gray-200/g, 'bg-gray-200 dark:bg-gray-600');
content = content.replace(/hover:bg-gray-50(?!(\/| dark|-))/g, 'hover:bg-gray-50 dark:hover:bg-gray-700');
content = content.replace(/bg-\[\#00A896\]\/10/g, 'bg-[#00A896]/10 dark:bg-[#00A896]/20');

fs.writeFileSync('/home/levi96/Documents/Int/davinscs/src/pages/pos/POSMain.tsx', content);
