# 🚀 Quick Start Commands

## Installation & Setup (One Time)

```bash
# 1. Install Node dependencies
npm install

# 2. Install Python (if you don't have it)
# https://www.python.org/downloads/

# 3. Install Python packages
pip install MetaTrader5 flask flask-cors
```

## Configuration

### For Tradovate Users
```bash
# Edit .env.local with your credentials:
TRADOVATE_API_KEY=your_key_here
TRADOVATE_API_SECRET=your_secret_here
TRADOVATE_ACCOUNT_ID=your_account_id
TRADOVATE_API_URL=https://api.tradovate.com/v1
```

### For Vantage MT5 Users
```
# No setup needed - MT5 will connect to your local instance
# Just make sure MetaTrader 5 is running with Vantage account
```

---

## Running the Application

### Option 1: Tradovate Only
```bash
npm run dev
# Automatically starts:
# - Next.js frontend on http://localhost:3000
# - Express backend on http://localhost:5000
```

### Option 2: Vantage MT5 (+ Optional Tradovate)

**Terminal 1 - Frontend + Backend:**
```bash
npm run dev
```

**Terminal 2 - Python MT5 API:**
```bash
# Option A: Windows (uses batch launcher)
start-mt5-api.bat

# Option B: Mac/Linux
python mt5_api.py

# Option C: Manual with control
python3 -m flask --app mt5_api run --port 5001
```

### Option 3: Both Brokers (Full Setup)
```bash
# Terminal 1
npm run dev

# Terminal 2
python mt5_api.py
```

---

## Verification Checklist

After starting the servers:

```bash
# Test Tradovate endpoint (if configured):
curl http://localhost:5000/api/brokers/tradovate/status

# Test MT5 endpoint:
curl http://localhost:5000/api/brokers/vantage/status

# Test frontend:
curl http://localhost:3000
```

---

## Using the Dashboard

1. **Open browser:** http://localhost:3000
2. **Click:** "⚡ Connect Broker" button (top right)
3. **Select broker:**
   - Tradovate → Enter API credentials
   - Vantage MT5 → Just click Connect
4. **View trades:** Real data appears in dashboard
5. **Switch brokers:** Disconnect and reconnect to different one

---

## Troubleshooting

### "Cannot connect to broker"
```bash
# Check backend is running:
curl http://localhost:5000/api/health

# Should return: {"status":"Server running",...}
```

### "Python API not responding" (MT5 error)
```bash
# Check Python is running:
curl http://localhost:5001

# Should return: {"status":"Python API running"}

# If not, restart MT5 API:
# Terminal: python mt5_api.py
```

### "Port already in use"
```bash
# Check what's using port 3000, 5000, or 5001:
# Windows PowerShell:
netstat -ano | findstr :3000

# Then kill the process (Windows):
taskkill /PID <PID> /F

# Or use different ports in .env.local
```

---

## Development Commands

```bash
# Run with detailed logging:
DEBUG=* npm run dev

# Kill all Node processes (Windows):
taskkill /F /IM node.exe

# Reset everything (fresh start):
rm -r node_modules
npm install
npm run dev
```

---

## Environment Variables Reference

```bash
# .env.local

# Required for Tradovate
TRADOVATE_API_KEY=xxx
TRADOVATE_API_SECRET=xxx
TRADOVATE_ACCOUNT_ID=xxx

# Optional
TRADOVATE_API_URL=https://api.tradovate.com/v1
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Dashboard Features Once Connected

✅ **Trades Table** - All historical closed trades  
✅ **Open Positions** - Current open trades with P&L  
✅ **Statistics** - Win rate, profit factor, sharpe ratio  
✅ **Performance** - Daily/weekly/monthly P&L  
✅ **Account Info** - Balance, equity, margin available  
✅ **Trading Journal** - Notes on each trade  
✅ **Calendar Heatmap** - Best/worst trading days  

---

## Connecting to Your Broker

### Tradovate
1. Go to https://www.tradovate.com
2. Create account or sign in
3. Generate API key/secret
4. Copy to `.env.local`
5. Restart app
6. Connect in modal

### Vantage MT5
1. Download MetaTrader 5
2. Open Vantage account from within MT5
3. Make sure MT5 is running
4. Start Python API: `python mt5_api.py`
5. Connect in modal
6. Done!

---

## Support

Check these guides for detailed help:
- **COMPLETE_SETUP.md** - Full setup guide
- **VANTAGE_MT5_SETUP.md** - MT5 specific
- **QUICK_START.md** - Tradovate quick setup
- **TESTING.md** - Full testing checklist
- **ARCHITECTURE.md** - How it works
- **IMPLEMENTATION_SUMMARY.md** - What was built

---

**Remember:** Keep terminals running while using the app. Open in http://localhost:3000 🎉
