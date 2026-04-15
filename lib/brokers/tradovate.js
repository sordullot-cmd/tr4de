const express = require('express');
const axios = require('axios');
const router = express.Router();

// Tradovate API Client
class TradovateClient {
  constructor(apiKey, apiSecret, accountId) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.accountId = accountId;
    this.baseURL = process.env.TRADOVATE_API_URL || 'https://api.tradovate.com';
    this.accessToken = null;
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.baseURL}/v1/auth/login`, {
        user: this.apiKey,
        password: this.apiSecret,
      });
      this.accessToken = response.data.accessToken;
      return true;
    } catch (error) {
      console.error('Tradovate Auth Error:', error.message);
      throw new Error('Failed to authenticate with Tradovate');
    }
  }

  async getAccounts() {
    if (!this.accessToken) await this.authenticate();
    try {
      const response = await axios.get(`${this.baseURL}/v1/account/accounts`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching accounts:', error.message);
      throw error;
    }
  }

  async getTrades() {
    if (!this.accessToken) await this.authenticate();
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/account/${this.accountId}/trades`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching trades:', error.message);
      throw error;
    }
  }

  async getPositions() {
    if (!this.accessToken) await this.authenticate();
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/account/${this.accountId}/positions`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching positions:', error.message);
      throw error;
    }
  }
}

// Initialize Tradovate Client
const tradovateClient = new TradovateClient(
  process.env.TRADOVATE_API_KEY,
  process.env.TRADOVATE_API_SECRET,
  process.env.TRADOVATE_ACCOUNT_ID
);

// Routes
router.get('/tradovate/accounts', async (req, res) => {
  try {
    const accounts = await tradovateClient.getAccounts();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tradovate/trades', async (req, res) => {
  try {
    const trades = await tradovateClient.getTrades();
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tradovate/positions', async (req, res) => {
  try {
    const positions = await tradovateClient.getPositions();
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tradovate/connect', async (req, res) => {
  try {
    const { apiKey, apiSecret, accountId } = req.body;
    
    // Test connection
    const testClient = new TradovateClient(apiKey, apiSecret, accountId);
    await testClient.authenticate();
    
    // Save to session if successful
    req.session = req.session || {};
    req.session.tradovateConnected = true;
    req.session.tradovateAccountId = accountId;
    
    res.json({ success: true, message: 'Connected to Tradovate' });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

module.exports = router;
