# Micro vs Mini Contracts - Implementation Complete ✅

## What's the Difference?

### **MICRO Contracts** 🔴
- **1/10th the size** of mini contracts
- **Much smaller position size**
- **Lower risk per trade**
- **Symbols**: MNQ, MES, MYM, M2K
- **Point multipliers**: 
  - MNQ: $2/point (vs NQ: $20/point)
  - MES: $5/point (vs ES: $50/point)

### **MINI Contracts** 🟦
- **Standard futures contracts**
- **10x larger than micro**
- **More capital required**
- **Symbols**: NQ, ES, YM, NK
- **Point multipliers**: 
  - NQ: $20/point
  - ES: $50/point

### **Example: Real Money Difference**
```
Trade: NASDAQ-100 up 10 points

MNQ (Micro):  10 pts × $2/pt = $20 per contract
NQ (Mini):    10 pts × $20/pt = $200 per contract
              ↑ 10x DIFFERENCE! ↑
```

## What Changed in Your App

### 1. **Database Schema** 
```sql
-- Added 2 new fields:
ALTER TABLE apex_trades
ADD COLUMN contract_type VARCHAR(20) DEFAULT 'standard',
ADD COLUMN lot_size INT DEFAULT 1;
```
- `contract_type`: "micro", "mini", or "standard"
- `lot_size`: Number of contracts traded

### 2. **CSV Import Enhancement**
All parsers now automatically detect contract type:
- ✅ Tradovate CSV
- ✅ MetaTrader 5 (HTML & CSV)
- ✅ WealthCharts CSV
- ✅ Generic CSV

### 3. **PnL Calculation Fixed** 🔧
**Before**: All contracts used $20/point (WRONG!)
**After**: Uses correct multiplier per contract type

| Contract | Multiplier | Before | After |
|----------|-----------|--------|-------|
| MNQ | $2/pt | ❌ $20/pt | ✅ $2/pt |
| MES | $5/pt | ❌ $20/pt | ✅ $5/pt |
| NQ | $20/pt | ✅ $20/pt | ✅ $20/pt |
| ES | $50/pt | ❌ $20/pt | ✅ $50/pt |

### 4. **Trades Table Display** 📊
New "Type" column shows contract category with color coding:
- 🔴 **Micro** (red) - High risk/high control
- 🔵 **Mini** (teal) - Standard futures
- ⚫ **Standard** (gray) - Other instruments

### 5. **Dashboard Updates**
- Statistics now properly grouped by contract type
- Can filter/analyze micro vs mini separately
- Correct PnL calculations for all positions

## Migration Steps

### ⚠️ Important: Run This in Supabase

1. **Open Supabase Dashboard** → Your Project → SQL Editor
2. **Create New Query** and paste this:

```sql
-- Add contract_type field to distinguish MICRO vs MINI contracts
ALTER TABLE apex_trades
ADD COLUMN contract_type VARCHAR(20) DEFAULT 'standard',
ADD COLUMN lot_size INT DEFAULT 1;

-- Create index for filtering by contract type
CREATE INDEX idx_apex_trades_contract_type ON apex_trades(user_id, contract_type);

-- Auto-detect existing trades by symbol
UPDATE apex_trades 
SET contract_type = 'micro'
WHERE symbol IN ('MNQ', 'MES', 'MYM', 'M2K');

UPDATE apex_trades 
SET contract_type = 'mini'
WHERE symbol IN ('NQ', 'ES', 'YM', 'NK', 'NE', 'GE');

UPDATE apex_trades
SET contract_type = 'standard'
WHERE symbol NOT IN ('MNQ', 'MES', 'MYM', 'M2K', 'NQ', 'ES', 'YM', 'NK', 'NE', 'GE');
```

3. **Run Query** (click ▶️)
4. **Refresh Browser** - Changes take effect immediately

## Why This Matters

### ✅ Accurate PnL Tracking
- No more inflated/deflated profits
- Real money impact per trade

### ✅ Risk Management
- Clearly see if you're trading micro (low risk) or mini (high risk)
- Different strategies for different contract sizes

### ✅ Performance Analysis
- Compare stats: "My ES trades" vs "My MES trades"
- Identify which contract size works for you

### ✅ Filter & Sort
- Group trades by contract type
- Find your best performing contracts

## Supported Contracts

| Code | Name | Type | Multiplier |
|------|------|------|-----------|
| MNQ | Micro NASDAQ-100 | Micro | $2/pt |
| MES | Micro S&P 500 | Micro | $5/pt |
| MYM | Micro Dow Jones | Micro | $0.50/pt |
| M2K | Micro Russell 2000 | Micro | $0.20/pt |
| NQ | E-Mini NASDAQ-100 | Mini | $20/pt |
| ES | E-Mini S&P 500 | Mini | $50/pt |
| YM | Micro Dow Jones | Mini | $5/pt |
| NK | Micro Russell 2000 | Mini | $2/pt |
| GC | Gold | Commodity | $100/pt |
| CL | Crude Oil | Commodity | $1000/pt |

## Import Data

Your next import will automatically:
1. ✅ Detect contract type from symbol
2. ✅ Store in `contract_type` field
3. ✅ Calculate correct PnL
4. ✅ Display type badge in table

**No manual action needed!** Everything happens automatically.
