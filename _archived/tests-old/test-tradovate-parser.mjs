import fs from 'fs';

// Read the actual CSV file
const csvText = fs.readFileSync('c:\\Users\\cooko\\Downloads\\Orders (2).csv', 'utf8');

// Copy the helper function
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

function formatDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {}
  return dateStr;
}

const calculateTradovateNQPnL = (contract, isLong, entryPrice, exitPrice, qty) => {
  const multipliers = {
    'NQM6': 20, 'NQU6': 20, 'NQZ6': 20, 'NQH6': 20,
    'ESM6': 50, 'ESU6': 50, 'ESZ6': 50, 'ESH6': 50,
    'CLM6': 1000, 'CLU6': 1000, 'CLZ6': 1000, 'CLH6': 1000,
    'GCM6': 100, 'GCU6': 100, 'GCZ6': 100, 'GCH6': 100,
  };
  const multiplier = multipliers[contract] || 20;
  const pointsDiff = isLong ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
  return Math.round(pointsDiff * multiplier * qty * 100) / 100;
};

// Parse headers
const lines = csvText.trim().split('\n');
const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

console.log('✓ Headers:', headers);
console.log('');

// Find columns - handle spaces in headers
const dateIdx = headers.findIndex(h => h === 'date');
const bsIdx = headers.findIndex(h => h === 'b/s' || h === 'b_s');
const contractIdx = headers.findIndex(h => h === 'contract');
const statusIdx = headers.findIndex(h => h === 'status');
const avgPriceIdx = headers.findIndex(h => h === 'avgprice' || h === 'avg fill price' || h === 'avg_fill_price');
const filledQtyIdx = headers.findIndex(h => h === 'filled qty' || h === 'filledqty' || h === 'filled_qty');
const fillTimeIdx = headers.findIndex(h => h === 'fill time' || h === 'filltime' || h === 'fill_time');
const textIdx = headers.findIndex(h => h === 'text');
const typeIdx = headers.findIndex(h => h === 'type');

console.log('Column indices:', { dateIdx, bsIdx, contractIdx, statusIdx, avgPriceIdx, filledQtyIdx, fillTimeIdx, textIdx, typeIdx });
console.log('');

// Parse orders
const filledOrders = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const values = parseCSVLine(line);
  if (values.length < 10) continue;

  const status = (values[statusIdx] || '').trim();
  if (!status.toLowerCase().includes('filled')) continue;

  const bs = (values[bsIdx] || '').trim();
  const contract = (values[contractIdx] || '').trim();
  const avgPrice = parseFloat((values[avgPriceIdx] || '0').replace(/[^0-9.-]/g, ''));
  const filledQty = parseFloat((values[filledQtyIdx] || '0').replace(/[^0-9.-]/g, ''));
  const fillTime = (values[fillTimeIdx] || '').trim();
  const date = (values[dateIdx] || '').trim();
  const text = (values[textIdx] || '').trim();
  const type = (values[typeIdx] || '').trim();

  if (!contract || isNaN(avgPrice) || avgPrice === 0 || filledQty === 0) continue;

  // Try alternate column indices if primary ones are empty
  let finalAvgPrice = avgPrice;
  let finalFilledQty = filledQty;

  // Check for alternate avgprice column (index 25 = "avg fill price")
  if (finalAvgPrice === 0 && avgPriceIdx !== 25) {
    const altPrice = parseFloat((values[25] || '0').replace(/[^0-9.-]/g, ''));
    if (altPrice > 0) finalAvgPrice = altPrice;
  }

  // Check for alternate filledQty column (index 26 = "filled qty")  
  if (finalFilledQty === 0 && filledQtyIdx !== 26) {
    const altQty = parseFloat((values[26] || '0').replace(/[^0-9.-]/g, ''));
    if (altQty > 0) finalFilledQty = altQty;
  }

  if (!contract || isNaN(finalAvgPrice) || finalAvgPrice === 0 || finalFilledQty === 0) continue;

  filledOrders.push({
    date, contract, bs, avgPrice: finalAvgPrice, filledQty: finalFilledQty, fillTime, text, type,
    dateTime: fillTime,  // Use fillTime directly instead of combining with date
    isLong: !bs.toUpperCase().includes('SELL'),
  });
}

console.log(`✓ Found ${filledOrders.length} FILLED orders\n`);

// Show first 10
console.log('First 10 filled orders:');
filledOrders.slice(0, 10).forEach((o, i) => {
  console.log(`${i+1}. [${o.date}] ${o.contract} ${o.bs} ${o.filledQty}@${o.avgPrice} (${o.text})`);
});

console.log('\n' + '='.repeat(80));
console.log('TRADING PAIRS EXTRACTION');
console.log('='.repeat(80) + '\n');

// Match pairs
const trades = [];
const processed = new Set();

for (let i = 0; i < filledOrders.length; i++) {
  if (processed.has(i)) continue;

  const entry = filledOrders[i];
  let exitIdx = -1;

  // Find matching exit
  for (let j = i + 1; j < filledOrders.length; j++) {
    if (processed.has(j)) continue;
    const potential = filledOrders[j];
    
    if (potential.contract === entry.contract &&
        potential.filledQty === entry.filledQty &&
        potential.isLong !== entry.isLong) {
      
      const entryT = new Date(entry.dateTime).getTime();
      const exitT = new Date(potential.dateTime).getTime();
      
      if (exitT >= entryT) {
        exitIdx = j;
        break;
      }
    }
  }

  if (exitIdx === -1) continue;

  const exit = filledOrders[exitIdx];
  processed.add(i);
  processed.add(exitIdx);

  // Determine exit type
  let exitType = 'Manual Exit';
  if (exit.text.toLowerCase().includes('exit')) exitType = 'Manual Exit';
  else if (exit.type.toLowerCase().includes('stop')) exitType = 'Stop Loss';
  else if (exit.type.toLowerCase().includes('limit')) exitType = 'Take Profit';
  if (exit.text.toLowerCase().includes('autoliq')) exitType = 'AutoLiq';

  const pnl = calculateTradovateNQPnL(entry.contract, entry.isLong, entry.avgPrice, exit.avgPrice, entry.filledQty);
  
  const entryDt = new Date(entry.dateTime);
  const exitDt = new Date(exit.dateTime);
  const holdMin = Math.round((exitDt - entryDt) / 60000);

  trades.push({
    date: entry.date,
    contract: entry.contract,
    direction: entry.isLong ? 'LONG' : 'SHORT',
    entry: entry.avgPrice,
    exit: exit.avgPrice,
    qty: entry.filledQty,
    holdMin,
    pnl,
    exitType,
  });

  console.log(`${trades.length}. ${entry.date} | ${entry.contract} ${entry.isLong ? 'LONG' : 'SHORT'} | Entry: ${entry.avgPrice} → Exit: ${exit.avgPrice} | Qty: ${entry.filledQty} | PnL: $${pnl} | Hold: ${holdMin}min | Exit: ${exitType}`);
}

console.log('\n' + '='.repeat(80));
console.log(`✓ TOTAL TRADES: ${trades.length}`);
console.log('='.repeat(80));

// Stats
if (trades.length > 0) {
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const totalPnL = trades.reduce((s, t) => s + t.pnl, 0);
  const avgPnL = totalPnL / trades.length;

  console.log(`\nStats:`);
  console.log(`  Wins: ${wins.length} | Losses: ${losses.length} | Win Rate: ${((wins.length/trades.length)*100).toFixed(1)}%`);
  console.log(`  Total PnL: $${totalPnL.toFixed(2)}`);
  console.log(`  Avg PnL per trade: $${avgPnL.toFixed(2)}`);
  console.log(`  Total Hold Time: ${trades.reduce((s,t) => s + t.holdMin, 0)} minutes`);
}
