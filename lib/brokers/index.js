const express = require('express');
const router = express.Router();

const tradovateRouter = require('./tradovate');
const vantageRouter = require('./vantage');

router.use(tradovateRouter);
router.use('/vantage', vantageRouter);

// List available brokers
router.get('/', (req, res) => {
  res.json({
    available: [
      {
        name: 'Tradovate',
        type: 'futures',
        endpoints: ['/api/brokers/tradovate/accounts', '/api/brokers/tradovate/trades'],
        connected: !!req.session?.tradovateConnected,
      },
      {
        name: 'Vantage (MT5)',
        type: 'forex/cfd',
        endpoints: ['/api/brokers/vantage/account', '/api/brokers/vantage/trades'],
        connected: !!req.session?.vantageConnected,
      },
    ],
  });
});

module.exports = router;
