const express = require('express');
const router = express.Router();

// Middleware to check authentication
const checkAuth = (req, res, next) => {
  if (!req.session?.tradovateConnected) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get all trades (from connected broker)
router.get('/', checkAuth, async (req, res) => {
  try {
    // This will be populated by broker-specific implementation
    res.json({ trades: [], message: 'Connect a broker to fetch real trades' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
