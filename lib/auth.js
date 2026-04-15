const express = require('express');
const router = express.Router();

// Connect broker
router.post('/connect', (req, res) => {
  const { broker, credentials } = req.body;

  if (!req.session) req.session = {};
  
  // Validate broker type and save session
  if (broker === 'tradovate') {
    req.session.broker = 'tradovate';
    req.session.tradovateConnected = true;
    return res.json({ success: true, broker, message: 'Connected to Tradovate' });
  }

  res.status(400).json({ error: 'Unknown broker' });
});

// Disconnect broker
router.post('/disconnect', (req, res) => {
  if (req.session) {
    req.session.broker = null;
    req.session.tradovateConnected = false;
  }
  res.json({ success: true, message: 'Disconnected' });
});

// Get current connection status
router.get('/status', (req, res) => {
  res.json({
    authenticated: !!req.session?.tradovateConnected,
    broker: req.session?.broker || null,
    accountId: req.session?.tradovateAccountId || null,
  });
});

module.exports = router;
