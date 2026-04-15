const fs = require('fs');

// Parser function
const parseBrokerExportCSV = (csvText) => {
  const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
    console.log('  ERROR: Less than 2 lines in CSV');
    return [];
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  console.log('  Headers detected:', headers.slice(0, 8).join(', '), '...');
  
  const trades = [];

  // Find column indices
  let dateIdx = headers.findIndex(h => h.includes('date') && !h.includes('exit'));
  let symbolIdx = headers.findIndex(h => h.includes('contract') || h.includes('symbol'));
  let directionIdx = headers.findIndex(h => h.includes('b/s') || h.includes('b_s'));
  let entryIdx = headers.findIndex(h => h.includes('avgprice') || h.includes('avg'));
  let pnlIdx = headers.findIndex(h => h.includes('pnl') || h.includes('profit'));

  console.log('  Column indices:');
  console.log(`    Date: ${dateIdx}, Symbol: ${symbolIdx}, Direction: ${directionIdx}, Entry: ${entryIdx}, PnL: ${pnlIdx}`);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim());
    const dirStr = (values[directionIdx] || '').toUpperCase();
    const direction = dirStr.includes('SELL') ? 'Short' : 'Long';
    
    const entryVal = parseFloat(values[entryIdx] || '0');
    const pnlVal = parseFloat(values[pnlIdx] || '0');

    if (!isNaN(entryVal) && entryVal !== 0) {
      trades.push({
        date: values[dateIdx] || '',
        symbol: (values[symbolIdx] || 'UNKNOWN').toUpperCase(),
        direction,
        entry: entryVal,
        exit: entryVal,
        pnl: pnlVal
      });
    }
  }

  return trades;
};

// TEST
console.log('\n' + '='.repeat(60));
console.log('🧪 BROKER EXPORT CSV PARSER TEST');
console.log('='.repeat(60));

// Test with sample_trades_format2.csv
console.log('\n📄 Reading: sample_trades_format2.csv');
try {
  const csvText = fs.readFileSync('sample_trades_format2.csv', 'utf-8');
  const lines = csvText.split('\n');
  console.log(`  Total lines: ${lines.length}`);
  console.log(`  Header: ${lines[0]}`);
  console.log(`  First trade: ${lines[1]}`);
  
  console.log('\n🔄 Parsing...');
  const trades = parseBrokerExportCSV(csvText);
  
  console.log(`\n✅ Result: ${trades.length} trades parsed`);
  
  if (trades.length > 0) {
    console.log('\n📊 First 3 trades:');
    trades.slice(0, 3).forEach((t, idx) => {
      console.log(`   ${idx + 1}. ${t.date} | ${t.symbol} | ${t.direction} | Entry: ${t.entry} | PnL: ${t.pnl}`);
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total: ${trades.length} trades`);
    const wins = trades.filter(t => t.pnl > 0).length;
    const pnlTotal = trades.reduce((sum, t) => sum + t.pnl, 0);
    console.log(`   Win Rate: ${Math.round((wins / trades.length) * 100)}%`);
    console.log(`   Total P&L: $${pnlTotal}`);
  }
} catch (err) {
  console.log(`  ❌ Error: ${err.message}`);
  console.log(`     ${err.stack}`);
}

console.log('\n' + '='.repeat(60) + '\n');
