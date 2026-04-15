# 📥 CSV Trade Import System

## 🎯 Overview

ApexTrader now uses a **simple CSV import system** instead of broker API connections. This allows you to:

- ✅ Import trades from any broker
- ✅ Use historical data going back years
- ✅ Control which trades to include
- ✅ No need for API credentials
- ✅ Works offline

---

## 📋 Supported CSV Formats

### 1. **Tradovate Export**
```
Exit Date,Entry Date,Symbol,Quantity,Avg Fill Price,Avg Exit Price,P&L,Account
2026-03-31,2026-03-31,NQ,1,19842,19920,312,LIVEACCT
```

### 2. **MetaTrader 5 Export**
```
Ticket,Open Date,Open Time,Type,Symbol,Volume,Open Price,Close Price,Close Date,Close Time,Commission,Comment,Profit
123456,2026-03-31,09:30,BUY,EURUSD,1.0,1.0950,1.0960,2026-03-31,10:45,0,Trade note,150.00
```

### 3. **Generic Format (Recommended)**
```
Date,Symbol,Direction,Entry,Exit,PnL
2026-03-31,NQ,Long,19842,19920,312
2026-03-31,ES,Short,5290,5268,440
2026-03-28,CL,Long,71.20,71.85,650
```

---

## 🔄 How to Import

### Step 1: Prepare Your CSV File

**Export from your broker:**

#### Tradovate
1. Log in to Tradovate
2. Go to **Account → Trade History**
3. Select date range
4. Click **Export to CSV**

#### MetaTrader 5
1. Open MT5 Terminal
2. Go to **View → Account History** (or **Trade History**)
3. Right-click → **Save As → CSV**

#### Generic Format
Create a simple Excel/Google Sheets file with these columns:
```
Date | Symbol | Direction | Entry | Exit | PnL
```

### Step 2: Open ApexTrader
- Go to http://localhost:3000
- Click **📥 Import Trades** button

### Step 3: Select Format
- Choose your broker format:
  - 📄 Format Générique
  - 📊 Tradovate Export
  - 🔷 MetaTrader 5 Export

### Step 4: Select File
- Click to browse and select your CSV file
- Review the preview (first 5 trades)
- Click **✓ Import Trades**

### Step 5: Success!
- Navigate to **Trades** tab
- See all your traded with statistics
- View dashboard with profit/loss analysis

---

## 📊 After Import

Once trades are imported, you can:

| Feature | What You Get |
|---------|-------------|
| **Dashboard** | Win rate, profit factor, P&L charts |
| **Trades Table** | All trades with entry/exit prices |
| **Statistics** | Avg win/loss, total P&L, best trade |
| **Charts** | Cumulative P&L bar chart |
| **Export** | Download trades as CSV again |

---

## 🔧 Import Multiple Times

**Add more trades later:**

1. Click **+ Import More**button in Trades tab
2. Select your file
3. New trades are added to existing ones (duplicates removed)
4. Dashboard updates automatically

**Clear all trades:**
1. Click **🗑️ Clear** button
2. Confirm deletion
3. Trades are removed from local storage

---

## 💾 Data Storage

- **Location:** Browser's `localStorage`
- **Persistence:** Trades stay until you clear them
- **Privacy:** 100% local, never sent to servers
- **Backup:** Export trades regularly

### Manual Backup

To save your trades as backup:
```javascript
// In browser console:
trades = JSON.parse(localStorage.getItem('apex_trades'));
console.log(JSON.stringify(trades, null, 2));
// Copy output to a text file
```

---

## 🐛 Troubleshooting

### "Aucun trade trouvé dans le fichier"
**Problem:** CSV format not recognized

**Solutions:**
1. Check file is actually CSV (not .xlsx or .xls)
2. Verify column headers match expected format
3. Ensure there's data below headers
4. Try **Generic Format** - it's most flexible

### Missing Trades After Import
**Problem:** Trades not showing in table

**Solutions:**
1. Check they're sorted by date (should show oldest first)
2. Ensure P&L column has numeric values
3. Try reimporting with different broker format

### Want to Merge from Multiple Sources?
**Solution:**
1. Import from Broker A
2. Export to CSV
3. Combine with Broker B CSV (same columns)
4. Re-import merged file

---

## 🛣️ CSV File Template

Create this in Excel or Google Sheets:

```
Date       | Symbol | Direction | Entry  | Exit   | PnL
-----------|--------|-----------|--------|--------|------
2026-03-31 | NQ     | Long      | 19842  | 19920  | 312
2026-03-31 | ES     | Short     | 5290   | 5268   | 440
2026-03-28 | CL     | Long      | 71.20  | 71.85  | 650
2026-03-28 | NQ     | Short     | 19880  | 19920  | -160
2026-03-27 | ES     | Long      | 5270   | 5290   | 400
```

**Then:**
1. Save as CSV (File → Save As → CSV)
2. Import into ApexTrader
3. Done!

---

## 📝 Supported Columns (Generic Format)

| Column | Description | Example |
|--------|-------------|---------|
| **Date** | Trade date | 2026-03-31 |
| **Symbol** | Instrument/pair | NQ, ES, EURUSD |
| **Direction** | Long, Short, Buy, Sell | Long |
| **Entry** | Entry price | 19842 |
| **Exit** | Exit price | 19920 |
| **PnL** | Profit/Loss $ | 312 or -160 |

---

## 🔐 Privacy & Security

✅ **No data sent to servers**
- All trades stay in your browser
- Uses browser localStorage only
- No account credentials needed
- 100% private trading journal

---

## 🚀 Next Steps

1. **Export** your trades from your broker
2. **Import** them into ApexTrader
3. **Analyze** your trading performance
4. **Track** your progress over time
5. **Improve** your strategy based on statistics

---

## 📞 Support

### Common Questions

**Q: Can I import multiple files at once?**
A: No, import one at a time. They'll automatically merge.

**Q: Will my trades be lost if I clear browser data?**
A: Yes! Export/backup regularly using the Export button.

**Q: Can I import trades from multiple brokers?**
A: Yes! Import from each broker separately and they'll merge automatically.

**Q: How far back can I import?**
A: As far as your broker provides history (typically 2+ years).

---

## 💡 Pro Tips

- 📊 **Export regularly** to backup your data
- 🔍 **Review trades** monthly to improve strategy
- 📈 **Track symbols** to see which are most profitable
- ⏰ **Analyze timing** to find best trading hours
- 📝 **Use notes** to track setup details

---

**Enjoy tracking your trades! 🎯**
