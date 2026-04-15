# 🚀 ApexAgent Quick Reference

## What is ApexAgent?

ApexAgent is an **autonomous AI coaching system** that:
- 🔍 Analyzes your trades automatically after import
- ⚠️ Sends real-time alerts for psychological/risk issues
- 💬 Answers questions about your trading performance
- 📊 Generates session reports at end of day
- 🎯 Provides actionable recommendations in French

## Key Features

### 1️⃣ Automatic Trade Analysis

When you import trades via CSV:
```
CSV Import → ApexAgent analyzes → Notification appears (top-right)
```

**Agent reports include:**
- Pattern Analysis: Your best setups, trading hours, win rates
- Psychology Monitor: Revenge trading, overtrading, FOMO detection
- Risk Guardian: Position sizing, daily loss limits, drawdown
- Market Context: Economic events, optimal trading hours

### 2️⃣ Alert Types

| Type | Color | Severity | Action |
|------|-------|----------|--------|
| 🛑 STOP | Red | Critical | CLOSE TRADES NOW |
| ⚠️ WARNING | Amber | High | Reduce position size, review |
| ℹ️ INFO | Green | Low | FYI, maintain discipline |
| 📊 REPORT | Blue | Log | Session summary |

### 3️⃣ Chat Interface

Click 💬 **Ask APEX** to chat:
```
You: "Quel a été mon meilleur setup?"
APEX: "Votre setup EMA Cross a 65% win rate avec +$2,450 total"
     📊 Basé sur: PatternAnalyst, RiskGuardian
```

### 4️⃣ Session Reports

At end of day, call:
```javascript
POST /api/agents/session-report
→ Complete daily analysis
→ Best/worst setups
→ Psychological flags
→ Key recommendations
```

## Agents Explained

### 🔍 PatternAnalyst
**Finds profitable patterns**
- Best setups (by win rate)
- Optimal trading hours
- Consecutive losses
- Symbol performance
- RR ratio analysis

### 🧠 PsychologyMonitor
**Detects emotional trading**
- **Revenge trading**: Trading < 5 min after loss = DANGER
- **Overtrading**: > 3 trades/hour = SLOW DOWN
- **Revenge sizing**: 2x position after loss = STOP
- **FOMO trades**: Impulsive entries = LOG IT
- **Quick exits**: Taking profit too fast = HOLD LONGER

### 🛡️ RiskGuardian
**Protects your account**
- Daily loss limit (80%+ → ALERT)
- Position size consistency
- Risk:Reward ratios (min 1.5:1)
- Drawdown monitoring
- Prop firm compliance

### 📈 MarketContext
**Macro information**
- Economic calendar events (CPI, NFP, FOMC)
- Best trading hours
- VIX levels
- Market volatility context

### 🤖 Orchestrator (APEX AI)
**Master synthesizer**
- Reads all 4 agent reports
- Prioritizes by severity
- Generates French message
- Recommends actions
- Responds to your questions

## Critical Alerts (STOP TRADING)

These trigger **immediate 🛑 STOP notification**:

1. **Daily Loss Limit Exceeded**
   - You've lost ≥80% of daily loss limit
   - Action: Close all trades, stop for the day

2. **Revenge Sizing Detected**
   - You increased position size after a loss
   - Action: Return to fixed position sizing

3. **Account Drawdown > 20%**
   - Prop firm compliance issue
   - Action: Contact broker immediately

4. **Multiple Revenge Trades**
   - > 3 trades within 5 min of losses
   - Action: Take 10-minute break between trades

## Common Use Cases

### "I'm losing money - why?"

**APEX will tell you:**
- If you're good at certain setups (keep doing those)
- If you're trading at bad times (trade only best hours)
- If you're making psychological errors (revenge trading, FOMO)
- If your position sizes are too big (reduce size)
- If your RR is bad (move targets further out)

### "Is my strategy working?"

**APEX analyzes:**
- Win rate by setup
- P&L by setup
- Drawdown history
- Consecutive losses
- Best/worst trades
- Time-based patterns

### "When should I stop trading?"

**APEX recommends stopping if:**
- Daily loss limit is near
- Revenge trading pattern detected
- Drawdown exceeds limits
- Overtrading (> 3/hour)
- Psychological flags rising

### "What are my best trades?"

**APEX identifies:**
- Highest win-rate setup
- Most profitable setup
- Best trading hour
- Best time of day
- Best vs worst symbol

## Integration Checklist

- [x] Types defined (lib/agents/types.ts)
- [x] All 4 agents built
- [x] Orchestrator created
- [x] API endpoints working
- [x] React components built
- [x] TradeImportModal triggers analysis
- [x] AgentNotifications in layout
- [x] AgentChat interface ready
- [ ] Supabase notifications table created (optional)
- [ ] Environment variables configured
- [ ] Test with real trades

## Environment Setup

```bash
# .env.local
GOOGLE_API_KEY=AIza...  # Get from makersuite.google.com
ALPHA_VANTAGE_API_KEY=... # Free from alphavantage.co

# Optional
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Testing Without Trades

You can test agent analysis without importing:

```bash
curl -X POST http://localhost:3000/api/agents/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "trades": [
      {
        "symbol": "NQ",
        "direction": "SHORT",
        "entry_price": 23684.75,
        "exit_price": 23683.50,
        "quantity": 3,
        "pnl": 75,
        "rr": 0.3,
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

Expected response: Notification with analysis + recommendations

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No notification appearing | Check browser console, verify GOOGLE_API_KEY |
| Agent analysis is slow | First request takes 2-3s (GPT-4o). Normal. |
| Chat not responding | Ensure trades array is passed to /api/agents/chat |
| STOP alert not dismissing | Click ✕ button or wait 5 seconds |
| Duplicate notifications | Clear browser cache |

## Next Steps

1. ✅ Import your first trades
2. ✅ See ApexAgent notification appear
3. ✅ Click 💬 Ask APEX about your trade
4. ✅ Get personalized coaching
5. ✅ Review session report at day end
6. ✅ Improve your discipline

## Support

- 🔧 Check APEXAGENT_SETUP.md for detailed integration
- 📚 Agent code well-commented for customization
- 🐛 React components use inline styles (easy to tweak)
- 🔑 All API routes serverless (no maintenance)

---

**Remember:** ApexAgent is your AI coach. It sees patterns you miss and alerts you to psychological traps. Trust the system, stay disciplined! 🎯
