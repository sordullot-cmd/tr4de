# 🧪 Testing Guide - ApexTrader Broker Integration

## Pre-flight Checklist

Before testing, ensure:
- ✅ Node.js and npm installed
- ✅ Python 3.7+ installed (for MT5)
- ✅ MetaTrader 5 installed (for MT5 tests)
- ✅ npm install completed

---

## Test 1: Backend API Health

### What it tests
- Express server is running
- Backend can respond to requests

### Steps
1. Start backend:
   ```bash
   npm run dev
   ```

2. In another terminal, test health:
   **PowerShell:**
   ```bash
   Invoke-WebRequest -Uri http://localhost:5000/api/health -UseBasicParsing | Select-Object -ExpandProperty Content
   ```

3. **Expected response:**
   ```json
   {"status":"Server running","timestamp":"2026-04-02T..."}
   ```

✅ If you see JSON, backend is working!

---

## Test 2: Frontend Loading

### What it tests
- Next.js frontend is running
- React app loads

### Steps
1. Open http://localhost:3000 in your browser
2. You should see the ApexTrader dashboard with mock data

✅ If you see the dashboard, frontend is working!

---

## Test 3: Broker Connection (Mock)

### What it tests
- Modal UI works
- Forms submit correctly
- Error handling

### Steps
1. Click **"⚡ Connect Broker"** button
2. Try entering fake credentials:
   - **API Key**: `test123`
   - **API Secret**: `test456`
   - **Account ID**: `99999`
3. Click **Connect**

✅ Should show error (expected - fake creds)

---

## Test 4: Broker Connection (Real - Tradovate)

### Prerequisites
- Tradovate account with API access
- API credentials ready

### Steps
1. Get your credentials from Tradovate
2. Update `.env.local`:
   ```env
   TRADOVATE_API_KEY=your_real_key
   TRADOVATE_API_SECRET=your_real_secret
   TRADOVATE_ACCOUNT_ID=your_real_id
   ```
3. Restart backend (`npm run dev`)
4. Open http://localhost:3000
5. Click **"⚡ Connect Broker"** → **Tradovate**
6. Click **Connect** (no manual credentials needed - uses .env)
7. You should see **"✓ Tradovate Connected"**

✅ If dashboard shows your real trades, connection works!

---

## Test 5: Python API (MT5)

### Prerequisites
- MetaTrader 5 installed
- Vantage account connected in MT5
- Python packages installed

### Steps

1. **Install Python packages:**
   ```bash
   pip install MetaTrader5 flask flask-cors
   ```

2. **Start Python API** in new terminal:
   ```bash
   python mt5_api.py
   ```

3. **Test Python API health:**
   **PowerShell:**
   ```bash
   Invoke-WebRequest -Uri http://localhost:5001/api/health -UseBasicParsing | Select-Object -ExpandProperty Content
   ```

4. **Expected response:**
   ```json
   {"status":"Python API running","mt5_connected":false}
   ```

✅ Python API is running!

---

## Test 6: MetaTrader 5 Connection

### Prerequisites
- MetaTrader 5 running
- Vantage account connected

### Steps

1. **Ensure MT5 is running** and connected

2. **Test MT5 connection via Python API:**
   ```bash
   # In PowerShell
   Invoke-WebRequest -Uri http://localhost:5001/api/mt5/connect -Method POST -UseBasicParsing | Select-Object -ExpandProperty Content
   ```

3. **Expected response (if MT5 connected):**
   ```json
   {
     "success": true,
     "message": "Connected to MT5",
     "account": {
       "login": 123456,
       "server": "VantageMT5-Demo",
       "currency": "USD",
       "balance": 10000,
       "equity": 9500
     }
   }
   ```

✅ MT5 is connected!

---

## Test 7: MT5 Trades in Dashboard

### Steps

1. Make sure all services are running:
   ```bash
   npm run dev        # Terminal 1
   python mt5_api.py  # Terminal 2
   ```

2. Open http://localhost:3000

3. Click **"⚡ Connect Broker"** → **Vantage MT5**

4. Click **Connect**

5. You should see:
   - **"✓ Vantage Connected"** button
   - Dashboard loading your **real MT5 trades**

✅ MT5 integration works!

---

## Test 8: Switching Between Brokers

### Steps

1. Start with Tradovate connected

2. Click **Disconnect**

3. Click **"⚡ Connect Broker"** → **Vantage MT5**

4. Click **Connect**

5. Dashboard should update with MT5 trades

✅ Broker switching works!

---

## Full Integration Test Checklist

Use this complete checklist:

```
□ Backend running on port 5000
□ Frontend running on port 3000
□ Python API running on port 5001 (if using MT5)
□ Dashboard loads with mock data
□ Modal can open/close
□ Tradovate connection works
□ MT5 connection works
□ Real trades display correctly
□ Switching between brokers works
□ Disconnect button works
□ Statistics update correctly
□ Responsive design works
```

---

## Performance Tests

### Frontend Performance
```bash
# Open DevTools (F12)
# Go to Performance tab
# Click "Start" then interact with dashboard
# Should see minimal lag
```

### Backend Response Time
```bash
# Should respond < 100ms for API calls
Invoke-WebRequest -Uri http://localhost:5000/api/brokers -UseBasicParsing
```

### Python API Response Time
```bash
# Should respond < 500ms for MT5 queries
Invoke-WebRequest -Uri http://localhost:5001/api/mt5/trades -UseBasicParsing
```

---

## Common Test Issues & Fixes

| Issue | Fix |
|-------|-----|
| Port 3000 in use | Kill Node process: `Get-Process node \| Stop-Process -Force` |
| Port 5000 in use | Change in `package.json` script |
| Port 5001 in use | Change in `mt5_api.py` last line |
| MT5 not responding | Verify MT5 is running and connected |
| Credentials rejected | Check API keys are correct |
| Python not found | Reinstall Python with "Add to PATH" |

---

## Debugging Tips

### Enable Verbose Logging

Edit `server.js`:
```javascript
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

### Check Network Requests

In browser DevTools (F12):
- Go to Network tab
- Filter by "XHR"
- Watch API calls to backend

### Python API Debugging

```python
# Add to mt5_api.py
if __name__ == '__main__':
    app.run(host='localhost', port=5001, debug=True)  # debug=True for verbose
```

---

## Manual API Testing

### Using PowerShell to test endpoints

**Test Tradovate connection:**
```bash
$body = @{
    apiKey = "test"
    apiSecret = "test"
    accountId = "999"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:5000/api/brokers/tradovate/connect `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -UseBasicParsing
```

**Test MT5 trades:**
```bash
Invoke-WebRequest -Uri http://localhost:5000/api/brokers/vantage/trades `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## Automated Test Script (Optional)

Create `test.js`:
```javascript
const http = require('http');

function testEndpoint(port, path, method = 'GET') {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => resolve({ error: e.message }));
    req.end();
  });
}

(async () => {
  console.log('Testing API endpoints...');
  
  const tests = [
    { port: 5000, path: '/api/health', name: 'Backend health' },
    { port: 3000, path: '/', name: 'Frontend' },
    { port: 5001, path: '/api/health', name: 'Python API health' },
  ];

  for (const test of tests) {
    const result = await testEndpoint(test.port, test.path);
    console.log(`${test.name}: ${result.status || result.error}`);
  }
})();
```

Run with:
```bash
node test.js
```

---

## ✅ All Tests Passing?

If all tests pass, your ApexTrader installation is complete and ready to use!

🎉 **Start trading with real broker data!**
