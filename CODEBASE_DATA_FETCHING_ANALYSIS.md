# TR4DE Codebase Data Fetching & Management Analysis

**Date Created:** April 15, 2026  
**Analysis Scope:** Complete data flow for trades, strategies, journal, rules, accounts, and disciplines

---

## Executive Summary

The tr4de application uses a **hybrid architecture** mixing:
- **Supabase** (PostgreSQL) for persistent data storage
- **localStorage** for client-side caching and state
- **React hooks** for data management patterns
- **Multiple data inconsistencies** between these layers

**Critical Finding:** Data is being loaded/stored in multiple places without clear synchronization, creating potential for data loss and inconsistencies.

---

## 1. HOW TRADES ARE LOADED/FETCHED

### Primary Source: `useTrades()` Hook
**File:** `lib/hooks/useTradeData.ts`

```typescript
export function useTrades() {
  const { user } = useAuth();
  const supabase = createClient();
  const [trades, setTrades] = useState([]);

  // Fetch on component mount (when user.id changes)
  useEffect(() => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("apex_trades")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    setTrades(data || []);
  }, [user?.id]);
}
```

**Source:** Supabase table `apex_trades`  
**Trigger:** When component mounts or user changes  
**Loaded Into:** State (`trades`), component re-renders  
**API Methods:** 
- `addTrade()` - Insert to Supabase
- `updateTrade()` - Update in Supabase
- `deleteTrade()` - Delete from Supabase

### Secondary Source: DashboardNew.jsx
**File:** `components/DashboardNew.jsx` (Line 4410)

```javascript
const { trades, addTrade, updateTrade, deleteTrade } = useTrades();
```

Uses the hook above - **THIS IS THE CORRECT WAY**

### Fallback/Export Source: CSV Import
**File:** `lib/csvParsers.js`

When users import trades via AddTradePage:
1. Parse CSV file locally
2. Filter trades (only trades with |pnl| >= $50)
3. Insert to Supabase `apex_trades` table
4. Re-fetch from Supabase to get UUID IDs

```javascript
const { data: freshTrades } = await supabase
  .from("apex_trades")
  .select("*")
  .eq("user_id", userId)
  .eq("account_id", accountId)
  .order("created_at", { ascending: false });
```

### ⚠️ LEGACY/PROBLEMATIC: TradesManager.jsx
**File:** `components/TradesManager.jsx`

Uses **obsolete pattern** - still references old API endpoint:
```javascript
const API_URL = "http://localhost:5000/api/trades";
const headers = { Authorization: `Bearer ${token}` };
const response = await axios.get(`${API_URL}?${params}`, { headers });
```

**Status:** DEPRECATED - Not used in main UI  
**Issue:** References old Express backend, not Supabase

### ⚠️ LEGACY: StrategyPage.jsx
**File:** `components/StrategyPage.jsx` (Line 44)

```javascript
const tradesData = localStorage.getItem('apex_trades');
if (tradesData) {
  const parsed = JSON.parse(tradesData);
  setTrades(parsed);
}
```

**Status:** DEPRECATED - Reads from localStorage instead of hook  
**Issue:** Data loaded once, not synchronized with Supabase

---

## 2. HOW STRATEGIES ARE LOADED/FETCHED

### Primary Source: `useStrategies()` Hook
**File:** `lib/hooks/useUserData.ts`

```typescript
export function useStrategies() {
  const { user } = useAuth();
  const supabase = createClient();
  const [strategies, setStrategies] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("strategies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    setStrategies(data || []);
  }, [user?.id]);
}
```

**Source:** Supabase table `strategies`  
**Trigger:** When component mounts  
**Loaded Into:** State, used by components

### Secondary Source: localStorage (LEGACY)
**File:** Multiple files

```javascript
localStorage.getItem('apex_strategies')  // Format: Array of strategy objects
localStorage.setItem('apex_strategies', JSON.stringify(updated))
```

**Used In:**
- `StrategyPage.jsx` - Initial load
- `DashboardNew.jsx` - Loads available strategies for UI
- `TradesPage.jsx` - Filters strategies by ID
- `AddTradePage.jsx` - Strategy selector dropdown

**Data Format:**
```javascript
{
  id: Date.now() (numeric),
  name: "Strategy Name",
  description: "...",
  color: "#5F7FB4",
  groups: [
    {
      id: Number,
      name: "Group Name",
      rules: [
        { id: Number, text: "Rule text" }
      ]
    }
  ],
  created: "date string"
}
```

### ⚠️ MISMATCH: useStrategies() creates in Supabase, localStorage still used for display
- Strategies CAN be created via `addStrategy()` hook (Supabase)
- BUT displayed strategies often come from localStorage in legacy components
- **Result:** New strategies in Supabase not visible in old pages

---

## 3. HOW TRADING ACCOUNTS ARE LOADED

### Primary Source: `useTradingAccounts()` Hook
**File:** `lib/hooks/useTradeData.ts`

```typescript
export function useTradingAccounts() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("trading_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    setAccounts(data || []);
  }, [user?.id]);
}
```

**Source:** Supabase table `trading_accounts`  
**Fields:** 
- `id` (UUID)
- `user_id`
- `name` (account name)
- `broker` (MetaTrader 5, Tradovate, WealthCharts)
- `account_type` ('live' or 'eval')
- `eval_account_size` ($25k, $50k, $100k, $150k)
- `created_at`, `updated_at`

### Secondary Source: TradingAccountsManager.jsx (HYBRID)
**File:** `components/TradingAccountsManager.jsx`

Uses **BOTH localStorage and Supabase**:
```javascript
// First load from localStorage
const savedAccounts = JSON.parse(localStorage.getItem("trading_accounts") || "[]");
setAccounts(savedAccounts);

// Then try to load from Supabase (if user has UUID)
if (userId && isValidUUID(userId)) {
  const { data } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", userId);
  
  const merged = [...savedAccounts, ...data];
  setAccounts(merged);
}
```

**Issue:** localStorage IDs are `local_${timestamp}_${random}` strings, not UUIDs  
**Problem:** Data duplication when both sources used simultaneously

---

## 4. HOW JOURNAL ENTRIES ARE MANAGED

### Primary Source: `useTradingJournal()` Hook
**File:** `lib/hooks/useUserData.ts`

```typescript
export function useTradingJournal() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("trading_journal")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    
    setEntries(data || []);
  }, [user?.id]);
}
```

**Source:** Supabase table `trading_journal`  
**Fields:** `id`, `user_id`, `date`, content, etc.

### Secondary Source: localStorage (CURRENT IMPLEMENTATION)
**File:** `DashboardNew.jsx` - JournalPage component

```javascript
React.useEffect(() => {
  // Load trade notes
  const savedTrade = localStorage.getItem("tr4de_trade_notes");
  if (savedTrade) setTradeNotes(JSON.parse(savedTrade));
  
  // Load daily notes
  const savedDaily = localStorage.getItem("tr4de_daily_notes");
  if (savedDaily) setDailyNotes(JSON.parse(savedDaily));
}, []);

// Save on change
const updateTradeNote = (tradeId, text) => {
  const updated = { ...tradeNotes, [tradeId]: text };
  setTradeNotes(updated);
  localStorage.setItem("tr4de_trade_notes", JSON.stringify(updated));
};
```

**Storage Keys:**
- `tr4de_trade_notes` - Map of tradeId -> note text
- `tr4de_daily_notes` - Map of date -> daily note text

**⚠️ CRITICAL ISSUE:** All data stored in localStorage, **NOT synced to Supabase**
- If user clears cache or changes device, notes are lost
- Supabase table `trading_journal` exists but is not used

---

## 5. HOW DISCIPLINES/RULES ARE MANAGED

### Rules Tables in Supabase
**File:** `lib/hooks/useUserData.ts`

```typescript
export function useTradingRules() {
  useEffect(() => {
    const { data } = await supabase
      .from("trading_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: false });
    
    setRules(data || []);
  }, [user?.id]);
}
```

**Supabase Table:** `trading_rules`

### Current Implementation: localStorage (DISCIPLINE TRACKER)
**File:** `DashboardNew.jsx` - DisciplinePage component

Stores daily discipline completion:
```javascript
localStorage.setItem(
  `tr4de_checked_rules_${date}`,
  JSON.stringify(checkedRulesData)
);

// Format: { ruleId: boolean, journal: true, premarket: false, ... }
```

**Storage Keys:**
- `tr4de_discipline_rules_config` - Max loss per trade, max loss per day
- `tr4de_discipline_active_days` - Which days each rule applies
- `tr4de_discipline_manual_rules` - Custom rules created by user
- `tr4de_checked_rules_${date}` - Daily completion status

**Hardcoded Base Rules:**
```javascript
const allRules = [
  { id: "premarket", label: "Pre Market Routine" },
  { id: "biais", label: "Biais Journalier" },
  { id: "news", label: "News et Key Levels" },
  { id: "followall", label: "Followed All Rules" },
  { id: "journal", label: "Journal d'après session" }
];
```

**⚠️ ISSUE:** Rules are defined in localStorage, not Supabase  
**Missing:** No synchronization to `trading_rules` table

---

## 6. ALL COMPONENTS DISPLAYING/MANIPULATING DATA

### Dashboard/Main Display Components

| Component | Data Used | Source | Purpose |
|-----------|-----------|--------|---------|
| **DashboardNew.jsx** | trades, strategiesloadingstrategies, strategies | `useTrades()`, `useStrategies()` | Main dashboard stats and visualizations |
| **Dashboard()** subcomponent | trades | Props | P&L calculations, calendar heatmap |
| **JournalPage()** | trades, tradeNotes, dailyNotes | Props + localStorage | Trade notes and daily journal |
| **TradesPage()** | trades, strategies | Props | Trade list table, emotion/error tags |
| **StrategyPage.jsx** | trades, strategies | localStorage (DEPRECATED) | Strategy management |
| **StrategyDetailPage.jsx** | - | - | (Not analyzed) |
| **TradingAccountsManager.jsx** | accounts | localStorage + Supabase | Account selector and management |
| **QuickAccountSelector.jsx** | - | - | (Wrapper component) |
| **MultiAccountSelector.jsx** | Accounts | Props | Multi-select account dropdown |
| **AddTradePage()** | trades, strategies, accounts | Props + `useTrades()`, `useStrategies()` | Trade import interface |
| **CalendarPage()** | trades | Props | Monthly heatmap view |
| **DisciplinePage()** | rules (hardcoded) | localStorage | Daily discipline tracker |

### Data-Specific Components

#### Trades
- `TradesManager.jsx` - DEPRECATED Express API backend
- CSV import via `parseCSV()` in `lib/csvParsers.js`

#### Strategies
- Strategy selector in AddTradePage
- Strategy badges in TradesPage

#### Accounts
- TradingAccountsManager dropdown
- Account selector in AddTradePage

---

## 7. ALL localStorage REFERENCES STILL IN USE

### Active localStorage Keys

```javascript
// Trades & Strategies
'apex_trades'                           // DEPRECATED - old CSV data
'apex_strategies'                       // Active - strategy list

// Trade Metadata
'tr4de_trade_notes'                     // Active - trade notes map
'tr4de_trade_strategies'                // Active - trade->strategy mapping
'tr4de_emotion_tags'                    // Active - emotion tag assignments
'tr4de_error_tags'                      // Active - error tag assignments

// Journal & Daily Data
'tr4de_daily_notes'                     // Active - daily journal notes
'tr4de_checked_rules_${date}'           // Active - daily rule completion

// Discipline & Rules
'tr4de_discipline_rules_config'         // Active - rule settings
'tr4de_discipline_active_days'          // Active - rule schedule
'tr4de_discipline_manual_rules'         // Active - custom rules
'tr4de_rules_cleaned_v2'                // Cleanup flag

// UI State
'tr4de_active_tab'                      // Active - current tab
'tr4de_emotion_tags'                    // (duplicate entry?)

// Trading Accounts
'trading_accounts'                      // Semi-active - local account cache
'selectedAccountIds'                    // Active - selected account IDs

// Auth
'authToken'                             // (referenced in TradesManager)
'user'                                  // (referenced in ACCOUNT_SYSTEM.md)
```

### Unused/Obsolete Keys
```javascript
'apex_trades'                           // Replaced by Supabase apex_trades table
'tr4de_checked_rules_*'                 // Pattern: Individual date files (deprecated, replaced by daily keys)
```

---

## 8. GAPS: SUPABASE vs localStorage

| Data Type | Supabase Table | localStorage Key | Status | Issue |
|-----------|----------------|-----------------|--------|-------|
| **Trades** | `apex_trades` ✓ | `apex_trades` ✗ | SYNCED | Old data might linger |
| **Strategies** | `strategies` ✓ | `apex_strategies` ✓ | HYBRID | Dual storage, inconsistency risk |
| **Trade Notes** | - ✗ | `tr4de_trade_notes` ✓ | MISSING | No persistence to DB |
| **Daily Notes** | `trading_journal` ✓ | `tr4de_daily_notes` ✓ | HYBRID | Not synced to Supabase |
| **Emotion Tags** | - ✗ | `tr4de_emotion_tags` ✓ | MISSING | No persistence to DB |
| **Error Tags** | - ✗ | `tr4de_error_tags` ✓ | MISSING | No persistence to DB |
| **Trade-Strategy Link** | - ✗ | `tr4de_trade_strategies` ✓ | MISSING | No DB table |
| **Accounts** | `trading_accounts` ✓ | `trading_accounts` ✓ | HYBRID | Inconsistent IDs (UUID vs local) |
| **Trading Rules** | `trading_rules` ✓ | `tr4de_discipline_*` ✓ | BOTH | Rules defined in localStorage, not synced |
| **Daily Rule Check** | - ✗ | `tr4de_checked_rules_${date}` ✓ | MISSING | No DB persistence |

---

## 9. FETCH/LOAD CALL SUMMARY

### At Component Mount
1. **DashboardNew.jsx**
   - `useTrades()` → Fetches from `apex_trades` table
   - `useStrategies()` → Fetches from `strategies` table
   - Loads `tr4de_*` keys from localStorage

2. **TradesPage()** (inside DashboardNew)
   - Loads from localStorage: `tr4de_trade_notes`, `tr4de_trade_strategies`, `tr4de_emotion_tags`, `tr4de_error_tags`
   - **Critical:** Always reloads on mount (`console.log("📝 TradesPage mounted")`)

3. **StrategyPage.jsx**
   - Loads from localStorage: `apex_trades`, `apex_strategies`
   - **Does NOT** use hooks

4. **JournalPage()** (inside DashboardNew)
   - Loads from localStorage: `tr4de_trade_notes`, `tr4de_daily_notes`, `tr4de_checked_rules`

5. **TradingAccountsManager.jsx**
   - First: localStorage `trading_accounts`
   - Then: Supabase `trading_accounts` (if valid UUID)
   - Merges both sources

6. **DisciplinePage()** (inside DashboardNew)
   - Loads from localStorage: `tr4de_discipline_*` configs
   - Loads: `tr4de_checked_rules_${date}`
   - Auto-detects journal completion from `tr4de_daily_notes`

### On Data Changes
1. **useTrades()** - Mutation updates Supabase
2. **useStrategies()** - Mutation updates Supabase & localStorage
3. **All localStorage** - Manual `localStorage.setItem()` calls throughout components

---

## KEY RECOMMENDATIONS FOR CONSISTENCY

### Immediate (High Priority)

1. **Remove StrategyPage.jsx localStorage loading** → Use `useStrategies()` hook instead
   - Currently fetches from localStorage, missing Supabase strategies
   - Should use DashboardNew pattern

2. **Sync trade notes to Supabase** → Use `trade_details` table
   - Currently: `tr4de_trade_notes` in localStorage only
   - Create: `useTradeDetails()` hook (already exists but not used)
   - Implement: Auto-save on blur, store in `trade_details.notes` field

3. **Audit TradesManager.jsx** → Either remove or migrate to Supabase
   - Currently points to localhost Express API
   - Not used in main UI (legacy code)
   - Recommendation: Delete file

### Short-term (Medium Priority)

4. **Create unified data layer** → Single source of truth pattern
   - All components should use hooks, not direct localStorage
   - localStorage = cache layer only
   - Supabase = persistent layer

5. **Add emotion/error tag tables to Supabase**
   - `trade_emotion_tags` table
   - `trade_error_tags` table
   - Migrate from localStorage

6. **Add trade-strategy link table**
   - `trade_strategy_links` table
   - Currently: `tr4de_trade_strategies` in localStorage only
   - Create: `useTradeStrategyLinks()` hook

### Long-term (Low Priority)

7. **Move all discipline rules to Supabase**
   - Create `user_discipline_config` table
   - Migrate hardcoded rules + localStorage rules
   - Sync daily completion to `daily_discipline_completion` table

8. **Implement proper caching strategy**
   - Use React Query or SWR for caching
   - Automatic sync between localStorage and Supabase
   - Handle offline mode gracefully

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────┐
│      User Interface Layer            │
│  (DashboardNew, StrategyPage, etc)   │
└──────────────────┬──────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼────┐          ┌─────▼─────┐
   │  Hooks  │          │ Direct LS  │
   │(useTrades           │ Acccess    │
   │ useStrat            │(DEPRECATED)│
   │ useJournal)         │            │
   └────┬────┘          └─────┬─────┘
        │                     │
        │    ┌────────────────┘
        │    │
   ┌────▼────▼──────────────────┐
   │  localStorage Layer         │
   │  (Client Cache)             │
   │                             │
   │  - apex_strategies          │
   │  - tr4de_trade_notes        │
   │  - tr4de_daily_notes        │
   │  - tr4de_emotion_tags       │
   │  - tr4de_checked_rules_*    │
   └────┬──────────────────────┘
        │
   ┌────▼──────────────────┐
   │  Supabase Layer       │
   │  (Persistent DB)      │
   │                       │
   │  - apex_trades        │
   │  - strategies         │
   │  - trading_accounts   │
   │  - trading_journal    │
   │  - trading_rules      │
   │  - trade_details      │
   └───────────────────────┘
```

---

## CONCLUSION

**Current State:** Mixed, with significant technical debt
- Core trades/strategies work via Supabase hooks ✓
- Many metadata (notes, tags, rules) stuck in localStorage ✗
- Multiple data sources create synchronization issues
- No automated caching or conflict resolution
- High risk of data loss if browser cache cleared

**Recommended:** Gradual migration to hook-based architecture with Supabase as single source of truth
