# 🤖 ApexAgent - Multi-Agent System Integration Guide

## Overview

ApexAgent is a sophisticated multi-agent system that automatically analyzes your trades and sends proactive alerts. It comprises:

1. **PatternAnalyst** - Detects trading patterns and optimal setups
2. **PsychologyMonitor** - Flags psychological trading errors (revenge trading, overtrading)
3. **RiskGuardian** - Monitors account risk and position sizing
4. **MarketContextEnricher** - Adds macro context to trades
5. **Orchestrator (APEX AI)** - Synthesizes all reports and sends notifications

## Architecture

```
Trade Import (CSV)
       ↓
  /api/agents/analyze
       ↓
   [4 Agents Run in Parallel]
       ├→ PatternAnalyst.analyze()
       ├→ PsychologyMonitor.analyze()
       ├→ RiskGuardian.analyze()
       └→ MarketContextEnricher.analyze()
       ↓
   Orchestrator.orchestrate()
       ↓
  Notification Created
       ↓
   AgentNotifications Component (UI)
       ↓
  User sees alert + recommendations
```

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local`:

```bash
# Required
GOOGLE_API_KEY=AIza... (from makersuite.google.com/app/apikey)
ALPHA_VANTAGE_API_KEY=... (free from alphavantage.co)

# Optional (for Supabase integration)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Trigger Agent Analysis After CSV Import

In your `TradeImportModal.jsx`, after successfully importing trades, call:

```javascript
// After importing trades via CSV
const response = await fetch("/api/agents/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    trades: importedTrades,
    strategies: userStrategies,
    userId: currentUserId,
  }),
});

const data = await response.json();
console.log("Agent Notification:", data.notification);
// The notification will automatically appear in the UI
```

### 3. Trigger Session Report at End of Day

Call this route when the user ends their trading session:

```javascript
const response = await fetch("/api/agents/session-report", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    trades: todaysTrades,
    strategies,
    userId,
  }),
});

const data = await response.json();
console.log("Session Analysis:", data.session);
// Contains: patterns, psychological flags, recommendations
```

### 4. Add Chat Interface (Optional)

To add the APEX AI Chat interface to your dashboard:

```jsx
import { AgentChat } from "@/components/AgentChat";

export function YourComponent() {
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      <button onClick={() => setShowChat(true)}>
        💬 Ask APEX
      </button>
      
      {showChat && (
        <div style={{ position: "fixed", bottom: "20px", right: "20px", width: "400px", height: "600px" }}>
          <AgentChat 
            trades={yourTrades} 
            onClose={() => setShowChat(false)} 
          />
        </div>
      )}
    </>
  );
}
```

## File Structure

```
lib/agents/
├── types.ts                    # All TypeScript interfaces
├── patternAnalyst.ts          # Pattern detection engine
├── psychologyMonitor.ts       # Psychological behavior detection
├── riskGuardian.ts            # Risk monitoring
├── marketContext.ts           # Market context enrichment
└── orchestrator.ts            # Main AI agent (GPT-4o powered)

app/api/agents/
├── analyze/route.ts           # POST /api/agents/analyze
├── session-report/route.ts    # POST /api/agents/session-report
└── chat/route.ts              # POST /api/agents/chat

components/
├── AgentNotifications.tsx      # Notification UI component
└── AgentChat.tsx              # Chat interface component
```

## Example Notification Response

```json
{
  "notification": {
    "user_id": "user123",
    "agent_name": "Orchestrator",
    "type": "warning",
    "priority": 7,
    "title": "⚠️ Revenge Trading Detected",
    "message": "You entered 3 trades within 5 minutes after losses. This is classic revenge trading behavior. Psychology Monitor recommends taking a 10-minute break after each loss.",
    "action_required": false,
    "details": {
      "fullOutput": {
        "type": "warning",
        "recommended_actions": [
          "Take a 10-minute break after each loss",
          "Review your loss trades for setup quality",
          "Use fixed position sizing only"
        ],
        "shouldStopTrading": false
      },
      "individualReports": {
        "patternAnalyst": {...},
        "psychologyMonitor": {...},
        "riskGuardian": {...},
        "marketContext": {...}
      }
    }
  }
}
```

## Agent Behavior Summary

### PatternAnalyst

**Detects:**
- Consecutive losing trades (2+ in a row)
- Best performing setups
- Optimal trading hours
- Symbol-specific performance dips
- Excessive scalping (short holds, low PnL)
- Low Risk:Reward ratios

**Recommends:**
- Focus on high-win-rate setups
- Trade during optimal hours
- Increase profit targets for better RR
- Reduce overtrading on underperforming symbols

### PsychologyMonitor

**Detects:**
- Revenge trading (entering < 5 min after loss)
- Overtrading (> 3 trades/hour)
- Revenge sizing (2x position size after loss)
- Emotional tags (FOMO, REVENGE in notes)
- Quick profit-taking (exiting winners too fast)

**Critical Triggers:**
- Revenge sizing → STOP TRADING
- Multiple revenge trades → WARNING
- FOMO tags → WARNING

### RiskGuardian

**Detects:**
- Daily loss limit approaching (80%+)
- Inconsistent position sizing
- Low Risk:Reward trades (< 1:1)
- Drawdown exceeding limits
- Prop firm compliance issues

**Critical Triggers:**
- Daily loss limit exceeded → STOP TRADING
- Drawdown > 20% → CRITICAL ALERT

### Market Context

**Provides:**
- Economic calendar events near trade time
- Optimal market hours analysis
- News sentiment impact
- Volatility context

### Orchestrator (APEX AI)

**Synthesizes:**
- All 4 agent reports
- Generates priority ranking (STOP > WARNING > INFO)
- Creates actionable French language message
- Identifies which agents contributed most
- Recommends concrete next steps

## Integration with DashboardNew.jsx

Add this to your trades page to trigger analysis:

```jsx
const handleImportSuccess = async (importedTrades) => {
  setTrades([...trades, ...importedTrades]);
  
  // Trigger agent analysis
  const response = await fetch("/api/agents/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trades: importedTrades,
      strategies: strategies,
      userId: currentUserId,
    }),
  });

  const data = await response.json();
  
  // Notification will appear automatically in top-right
  console.log("Agent notification received:", data.notification);
};
```

## Testing the System

### Test 1: Query Pattern Analysis

```bash
curl -X POST http://localhost:3000/api/agents/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "trades": [
      {
        "symbol": "NQ",
        "direction": "LONG",
        "entry_price": 23511,
        "exit_price": 23520,
        "quantity": 1,
        "pnl": 180,
        "rr": 2.5,
        "entry_time": "2026-04-02T14:09:20",
        "exit_time": "2026-04-02T14:09:59",
        "hold_time_seconds": 39,
        "setup": "Scalp",
        "exit_type": "Manual",
        "broker": "Tradovate"
      }
    ],
    "userId": "test-user"
  }'
```

### Test 2: Chat with APEX

```bash
curl -X POST http://localhost:3000/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quel a été mon meilleur setup?",
    "trades": [...],
    "conversationHistory": []
  }'
```

## Monitoring & Debugging

### Check Agent Execution Times

Each agent report includes `executionTimeMs`:
- PatternAnalyst: typically 50-100ms
- PsychologyMonitor: typically 30-80ms
- RiskGuardian: typically 40-100ms
- MarketContext: typically 200-500ms (depends on API calls)
- Orchestrator: typically 1000-2000ms (GPT-4o call)

Total typical response time: 1500-3000ms

### Enable Detailed Logging

Set `DEBUG=apex:*` environment variable to see detailed agent logs.

### Notification Polling

AgentNotifications component polls for new notifications every 30 seconds.
To fetch notifications manually:

```javascript
const notifs = await supabase
  .from('agent_notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);
```

## Production Checklist

- [ ] OpenAI API key configured
- [ ] Rate limits set for API calls
- [ ] Notification persistence (Supabase) configured
- [ ] Error handling and fallbacks tested
- [ ] Agent timeout values set (max 30s per request)
- [ ] Logging and monitoring configured
- [ ] User feedback mechanism in place
- [ ] Chat history retention policy set
- [ ] Trade data privacy/encryption verified
- [ ] Load testing with 100+ trades completed

## Troubleshooting

**Issue: Notificaton not appearing**
- Check browser console for errors
- Verify GOOGLE_API_KEY is set
- Check that /api/agents/analyze is being called
- Ensure userId is passed correctly

**Issue: Agent analysis is slow**
- Normal first request can take 3-5 seconds (GPT-4o)
- Subsequent requests are cached
- Check network tab for API delays

**Issue: Chat responses are generic**
- Ensure trades array is passed to chat endpoint
- Check that conversation history is being sent
- Verify prompt is detailed enough

## Future Enhancements

- [ ] Integration with MetaTrader 5 for real-time trade updates
- [ ] Webhook notifications (Telegram, Discord, Email)
- [ ] Advanced RAG (vector embeddings for trade history)
- [ ] Multi-language support beyond French
- [ ] Custom alert thresholds per user
- [ ] Team-based performance analysis
- [ ] Backtesting integration
- [ ] Walk-forward analysis suggestions
