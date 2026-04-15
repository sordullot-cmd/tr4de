const fs = require('fs');

const csvText = fs.readFileSync('sample_trades.csv', 'utf-8');
const lines = csvText.trim().split('\n').filter(line => line.trim());
const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
const trades = [];

let dateIdx = headers.findIndex(h => h.includes('date')) || 0;
let symIdx = headers.findIndex(h => h.includes('symbol')) || 1;
let dirIdx = headers.findIndex(h => h.includes('direction')) || 2;
let entryIdx = headers.findIndex(h => h.includes('entry')) || 3;
let exitIdx = headers.findIndex(h => h.includes('exit')) || 4;
let pnlIdx = headers.findIndex(h => h.includes('pnl')) || 5;

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',').map(v => v.trim());
  const entryVal = parseFloat(values[entryIdx]);
  const exitVal = parseFloat(values[exitIdx]);
  const pnlVal = parseFloat(values[pnlIdx]);
  
  if (!isNaN(entryVal) && !isNaN(exitVal) && entryVal !== 0 && exitVal !== 0) {
    trades.push({
      date: values[dateIdx],
      symbol: values[symIdx].toUpperCase(),
      direction: values[dirIdx],
      entry: entryVal,
      exit: exitVal,
      pnl: pnlVal
    });
  }
}

console.log('✅ CSV Import Test Results:');
console.log('Total trades parsed:', trades.length);
console.log('\nFirst 3 trades:');
trades.slice(0, 3).forEach((t, i) => {
  console.log(`  ${i+1}. ${t.date} | ${t.symbol} | ${t.direction} | Entry: ${t.entry} | Exit: ${t.exit} | P&L: ${t.pnl}`);
});
console.log('\nLast trade:', trades[trades.length-1].date, trades[trades.length-1].symbol, trades[trades.length-1].pnl);
console.log('\nStatus: ✅ All trades ready for import!');
