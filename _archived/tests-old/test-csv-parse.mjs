import fs from 'fs';

// Read the CSV file
const csvText = fs.readFileSync('sample_trades_format2.csv', 'utf8');

// Helper function for parsing CSV with quoted values
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const lines = csvText.trim().split('\n');
const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

console.log('✓ Headers found:', headers);
console.log('');
console.log('✓ Column indices:');
console.log(`  - Date: ${headers.findIndex(h => h.includes('date') && !h.includes('entry') && !h.includes('exit'))}`);
console.log(`  - B/S: ${headers.findIndex(h => h.includes('b'))}`);
console.log(`  - Contract: ${headers.findIndex(h => h.includes('contract'))}`);
console.log(`  - avgPrice: ${headers.findIndex(h => h.includes('avgprice') || (h.includes('avg') && h.includes('price')))}`);
console.log(`  - PnL: ${headers.findIndex(h => h.includes('pnl') || h.includes('profit'))}`);
console.log(`  - Qty: ${headers.findIndex(h => h.includes('qty'))}`);
console.log('');
console.log('✓ First 3 data rows:');
for (let i = 1; i <= 3 && i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  console.log(`  Row ${i}: ${values.join(' | ')}`);
}
