# Strategy Page Blank Issue - Diagnostic Guide

## 🔍 Quick Diagnostic (Run in Browser Console)

Copy and paste each command into your browser console (F12 → Console tab):

### 1. Check localStorage for strategies
```javascript
const stored = localStorage.getItem("tr4de_strategies");
console.log("localStorage tr4de_strategies:", stored ? JSON.parse(stored) : "❌ EMPTY");
```

### 2. Check localStorage for trades
```javascript
const trades = localStorage.getItem("tr4de_trades");
console.log("localStorage tr4de_trades:", trades ? JSON.parse(trades).length + " trades" : "❌ EMPTY");
```

### 3. Check apex_strategies
```javascript
const apex = localStorage.getItem("apex_strategies");
console.log("localStorage apex_strategies:", apex ? JSON.parse(apex) : "❌ EMPTY");
```

### 4. Look for recent debug logs
- Open Console tab (F12)
- Filter by: `🔍 StrategyPage`
- Should see: 
  - ✅ strategiesHook: returned
  - ✅ strategies array: X items
  - Or: ❌ null/undefined (if problem exists)

### 5. Check if hooks are initialized
Look for console messages starting with:
- `⚡ Stratégies chargées depuis localStorage` → Good, hook is loading
- `❌ Error` → Problem with data format or hook

---

## 📋 What Each Fix Does

| Fix | Purpose | How to Verify |
|-----|---------|---------------|
| Hook capture (line 112) | Prevent destructuring null | Should see hook return in console |
| Safe defaults (line 115) | Prevent "cannot read length of undefined" | strategies should always be array |
| Array checks (line 254) | Guard against null/undefined | Empty state displays button if true |
| Debug info box | Show what's wrong | Yellow box appears with type info |

---

## ✅ Expected Behavior After Fix

1. **Page loads** → Header visible with "Stratégies" title
2. **Button visible** → "Créer une stratégie" button in top right
3. **Either:**
   - If strategies exist: **List shows cards** with strategy info
   - If no strategies: **Empty state appears** with goal emoji and create button

## ❌ If Still Blank (Troubleshooting)

### Check 1: localStorage empty?
→ Import trades first in Dashboard tab, then create a strategy

### Check 2: Hook not working?
Look for in console (F12):
```
❌ strategiesHook: null/undefined
```
→ Problem with `useAuth()` or Supabase client initialization

### Check 3: Render error?
→ Check "Errors" tab in DevTools (red icon)
→ Look for "Cannot read property 'length' of undefined"

---

## 🔧 Manual Test Steps

1. **Open DevTools:** F12
2. **Go to Console tab**
3. **Refresh page:** Ctrl+Shift+R (hard refresh)
4. **Watch console for logs starting with:**
   - 🔍 (debug info)
   - ⚡ (fast load from localStorage)
   - ❌ (errors)
   - ✅ (success)

5. **Check if page shows:**
   - Header + button
   - Strategy list or empty state

---

## 📞 If Problem Persists

Share these console outputs:
1. Run diagnostic commands above
2. Screenshot of console showing:
   - All output from step 1-4
   - Any error messages (red)
3. Note whether you see:
   - ✅ Header/button visible
   - ❌ Page completely blank
   - ⚠️ Partial rendering (some elements show)
