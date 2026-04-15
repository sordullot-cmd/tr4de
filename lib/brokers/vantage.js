const express = require('express');
const axios = require('axios');
const router = express.Router();

// Vantage MT5 API Client - Communique avec le serveur Python MT5
class VantageClient {
  constructor() {
    this.baseURL = 'http://localhost:5001/api/mt5';
    this.connected = false;
  }

  async connect() {
    try {
      const response = await axios.post(`${this.baseURL}/connect`);
      this.connected = true;
      return response.data;
    } catch (error) {
      console.error('Vantage MT5 Connection Error:', error.message);
      throw new Error('Failed to connect to MetaTrader 5. Ensure MT5 is open and connected.');
    }
  }

  async disconnect() {
    try {
      await axios.post(`${this.baseURL}/disconnect`);
      this.connected = false;
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async getAccount() {
    if (!this.connected) throw new Error('Not connected');
    try {
      const response = await axios.get(`${this.baseURL}/account`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getTrades() {
    if (!this.connected) throw new Error('Not connected');
    try {
      const response = await axios.get(`${this.baseURL}/trades`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getPositions() {
    if (!this.connected) throw new Error('Not connected');
    try {
      const response = await axios.get(`${this.baseURL}/positions`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getSymbols() {
    if (!this.connected) throw new Error('Not connected');
    try {
      const response = await axios.get(`${this.baseURL}/symbols`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getStats() {
    if (!this.connected) throw new Error('Not connected');
    try {
      const response = await axios.get(`${this.baseURL}/stats`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

const vantageClient = new VantageClient();

// Routes
router.post('/connect', async (req, res) => {
  try {
    const result = await vantageClient.connect();
    
    // Sauvegarder dans la session
    req.session = req.session || {};
    req.session.vantageConnected = true;
    req.session.broker = 'vantage';
    req.session.accountInfo = result.account;
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await vantageClient.disconnect();
    
    if (req.session) {
      req.session.vantageConnected = false;
      req.session.broker = null;
    }
    
    res.json({ success: true, message: 'Disconnected from Vantage' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/account', async (req, res) => {
  try {
    const account = await vantageClient.getAccount();
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/trades', async (req, res) => {
  try {
    const trades = await vantageClient.getTrades();
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/positions', async (req, res) => {
  try {
    const positions = await vantageClient.getPositions();
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/symbols', async (req, res) => {
  try {
    const symbols = await vantageClient.getSymbols();
    res.json(symbols);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await vantageClient.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
