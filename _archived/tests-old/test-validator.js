// Quick test of validator endpoint
async function testValidator() {
  const mockTrades = [
    {
      symbol: "MES",
      direction: "Long",
      entry: 4500.00,
      exit: 4505.00,
      pnl: 62.50,
      date: "2024-03-27T10:00:00Z",
      size: 1,
      stopLoss: 4498.00,
      takeProfit: 4508.00,
      entryTime: "10:30",
      exitTime: "10:45"
    },
    {
      symbol: "MES",
      direction: "Short",
      entry: 4505.00,
      exit: 4502.00,
      pnl: 75.00,
      date: "2024-03-27T11:00:00Z",
      size: 1,
      stopLoss: 4507.00,
      takeProfit: 4500.00,
      entryTime: "11:15",
      exitTime: "11:30"
    },
    {
      symbol: "MES",
      direction: "Long",
      entry: 4502.00,
      exit: 4500.00,
      pnl: -25.00,
      date: "2024-03-27T11:35:00Z",
      size: 1,
      stopLoss: 4499.00,
      takeProfit: 4505.00,
      entryTime: "11:35",
      exitTime: "11:45"
    }
  ];

  try {
    const response = await fetch("http://localhost:3000/api/trade-ai/validate-trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trades: mockTrades })
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error("Response:", text);
      return;
    }

    const result = await response.json();
    console.log("✅ Validator API Response:");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
}

testValidator();
