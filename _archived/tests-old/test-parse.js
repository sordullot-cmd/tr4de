const fs = require('fs');
const { parseCSV, calculateStats } = require('./lib/csvParsers.js');

const csvText = fs.readFileSync('sample_trades_format2.csv', 'utf8');

console.log('Testing CSV parsing...\n');
const trades = parseCSV(csvText, 'tradovate');

console.log(`✓ Parsed ${trades.length} trades\n`);

if (trades.length > 0) {
  console.log('First 3 trades:');
  trades.slice(0, 3).forEach((t, i) => {
    console.log(`\n${i+1}. ${t.symbol} ${t.direction}`);
    console.log(`   Entry/Exit: ${t.entry} / ${t.exit}`);
    console.log(`   PnL: ${t.pnl} | Qty: ${t.qty}`);
    console.log(`   Date: ${t.date}`);
  });

  const stats = calculateStats(trades);
  console.log('\n\nStats:');
  console.log(`Total Trades: ${stats.totalTrades}`);
  console.log(`Win Rate: ${((stats.winningTrades / stats.totalTrades) * 100).toFixed(1)}%`);
  console.log(`Total PnL: $${stats.totalPnL.toFixed(2)}`);
  console.log(`Profit Factor: ${stats.profitFactor}`);
}
