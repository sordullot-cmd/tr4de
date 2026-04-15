const fs = require('fs');

// Import the parsers
const { parseCSV, calculateStats } = require('./lib/csvParsers.js');

console.log('\n' + '='.repeat(60));
console.log('🧪 ADVANCED CSV PARSER TEST');
console.log('='.repeat(60));

// Test 1: Generic format
console.log('\n📋 Test 1: Generic Format (sample_trades.csv)');
try {
  const genericCSV = fs.readFileSync('sample_trades.csv', 'utf-8');
  const genericTrades = parseCSV(genericCSV, 'generic');
  console.log(`  ✅ Parsed ${genericTrades.length} trades`);
  if (genericTrades.length > 0) {
    console.log(`     First: ${genericTrades[0].symbol} | ${genericTrades[0].direction} | Entry: ${genericTrades[0].entry} | PnL: ${genericTrades[0].pnl}`);
  }
} catch (err) {
  console.log(`  ❌ Error: ${err.message}`);
}

// Test 2: Broker export format
console.log('\n🏦 Test 2: Broker Export Format (sample_trades_format2.csv)');
try {
  const exportCSV = fs.readFileSync('sample_trades_format2.csv', 'utf-8');
  const exportTrades = parseCSV(exportCSV); // Auto-detect
  console.log(`  ✅ Parsed ${exportTrades.length} trades`);
  
  if (exportTrades.length > 0) {
    console.log('\n  📊 First 3 trades:');
    exportTrades.slice(0, 3).forEach((t, idx) => {
      console.log(`     ${idx + 1}. ${t.date} | ${t.symbol} | ${t.direction} | Entry: ${t.entry} | PnL: ${t.pnl}`);
    });
  }
  
  // Calculate stats
  if (exportTrades.length > 0) {
    const stats = calculateStats(exportTrades);
    console.log('\n  📈 Statistics:');
    console.log(`     Total Trades: ${stats.totalTrades}`);
    console.log(`     Win Rate: ${stats.winRate}%`);
    console.log(`     Total P&L: $${stats.totalPnL}`);
    console.log(`     Profit Factor: ${stats.profitFactor}`);
  }
} catch (err) {
  console.log(`  ❌ Error: ${err.message}`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ Test Complete');
console.log('='.repeat(60) + '\n');
