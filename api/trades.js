import express from 'express';
import { authMiddleware } from './auth.js';
import { getOne, runQuery, getAll } from '../lib/database.js';

const router = express.Router();

// All trades routes require authentication
router.use(authMiddleware);

// ====== GET ALL TRADES FOR USER ======
router.get('/', async (req, res) => {
  try {
    const { status, symbol, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM trades WHERE user_id = ?';
    const params = [req.userId];

    // Filters
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (symbol) {
      sql += ' AND symbol LIKE ?';
      params.push(`%${symbol}%`);
    }

    // Count total
    const countResult = await getOne(
      `SELECT COUNT(*) as count FROM trades WHERE user_id = ?${status ? ' AND status = ?' : ''}${symbol ? ' AND symbol LIKE ?' : ''}`,
      status && symbol ? [req.userId, status, `%${symbol}%`] :
      status ? [req.userId, status] :
      symbol ? [req.userId, `%${symbol}%`] :
      [req.userId]
    );

    // Get trades
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const trades = await getAll(sql, params);

    res.json({
      trades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.count,
        pages: Math.ceil(countResult.count / limit),
      },
    });
  } catch (error) {
    console.error('❌ Get trades error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// ====== GET SINGLE TRADE ======
router.get('/:id', async (req, res) => {
  try {
    const trade = await getOne(
      'SELECT * FROM trades WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    res.json(trade);
  } catch (error) {
    console.error('❌ Get trade error:', error);
    res.status(500).json({ error: 'Failed to fetch trade' });
  }
});

// ====== CREATE TRADE ======
router.post('/', async (req, res) => {
  try {
    const {
      symbol,
      entry_price,
      exit_price,
      quantity,
      entry_date,
      exit_date,
      trade_type,
      status = 'open',
      profit_loss,
      notes,
    } = req.body;

    if (!symbol || !entry_date) {
      return res.status(400).json({ error: 'Symbol and entry_date are required' });
    }

    const result = await runQuery(
      `INSERT INTO trades (
        user_id, symbol, entry_price, exit_price, quantity,
        entry_date, exit_date, trade_type, status, profit_loss, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        symbol,
        entry_price,
        exit_price,
        quantity,
        entry_date,
        exit_date,
        trade_type,
        status,
        profit_loss,
        notes,
      ]
    );

    const newTrade = await getOne(
      'SELECT * FROM trades WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      success: true,
      message: 'Trade created',
      trade: newTrade,
    });
  } catch (error) {
    console.error('❌ Create trade error:', error);
    res.status(500).json({ error: 'Failed to create trade' });
  }
});

// ====== UPDATE TRADE ======
router.put('/:id', async (req, res) => {
  try {
    const trade = await getOne(
      'SELECT id FROM trades WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const {
      symbol,
      entry_price,
      exit_price,
      quantity,
      entry_date,
      exit_date,
      trade_type,
      status,
      profit_loss,
      notes,
    } = req.body;

    let sql = 'UPDATE trades SET updated_at = CURRENT_TIMESTAMP';
    const params = [];

    if (symbol !== undefined) {
      sql += ', symbol = ?';
      params.push(symbol);
    }
    if (entry_price !== undefined) {
      sql += ', entry_price = ?';
      params.push(entry_price);
    }
    if (exit_price !== undefined) {
      sql += ', exit_price = ?';
      params.push(exit_price);
    }
    if (quantity !== undefined) {
      sql += ', quantity = ?';
      params.push(quantity);
    }
    if (entry_date !== undefined) {
      sql += ', entry_date = ?';
      params.push(entry_date);
    }
    if (exit_date !== undefined) {
      sql += ', exit_date = ?';
      params.push(exit_date);
    }
    if (trade_type !== undefined) {
      sql += ', trade_type = ?';
      params.push(trade_type);
    }
    if (status !== undefined) {
      sql += ', status = ?';
      params.push(status);
    }
    if (profit_loss !== undefined) {
      sql += ', profit_loss = ?';
      params.push(profit_loss);
    }
    if (notes !== undefined) {
      sql += ', notes = ?';
      params.push(notes);
    }

    sql += ' WHERE id = ? AND user_id = ?';
    params.push(req.params.id, req.userId);

    await runQuery(sql, params);

    const updatedTrade = await getOne(
      'SELECT * FROM trades WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Trade updated',
      trade: updatedTrade,
    });
  } catch (error) {
    console.error('❌ Update trade error:', error);
    res.status(500).json({ error: 'Failed to update trade' });
  }
});

// ====== DELETE TRADE ======
router.delete('/:id', async (req, res) => {
  try {
    const trade = await getOne(
      'SELECT id FROM trades WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    await runQuery(
      'DELETE FROM trades WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    res.json({ success: true, message: 'Trade deleted' });
  } catch (error) {
    console.error('❌ Delete trade error:', error);
    res.status(500).json({ error: 'Failed to delete trade' });
  }
});

// ====== GET TRADE STATISTICS ======
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await getOne(
      `SELECT
        COUNT(*) as total_trades,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_trades,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_trades,
        round(AVG(profit_loss), 2) as avg_profit_loss,
        round(SUM(profit_loss), 2) as total_profit_loss,
        round(MAX(profit_loss), 2) as max_profit,
        round(MIN(profit_loss), 2) as max_loss
      FROM trades WHERE user_id = ?`,
      [req.userId]
    );

    res.json(stats);
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ====== IMPORT TRADES FROM CSV ======
router.post('/import', async (req, res) => {
  try {
    const { trades } = req.body;

    if (!Array.isArray(trades) || trades.length === 0) {
      return res.status(400).json({ error: 'Trades array is required' });
    }

    const imported = [];

    for (const trade of trades) {
      const result = await runQuery(
        `INSERT INTO trades (
          user_id, symbol, entry_price, exit_price, quantity,
          entry_date, exit_date, trade_type, status, profit_loss, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.userId,
          trade.symbol,
          trade.entry_price,
          trade.exit_price,
          trade.quantity,
          trade.entry_date,
          trade.exit_date,
          trade.trade_type,
          trade.status || 'open',
          trade.profit_loss,
          trade.notes,
        ]
      );

      imported.push(result.lastID);
    }

    res.status(201).json({
      success: true,
      message: `${imported.length} trades imported`,
      imported_count: imported.length,
    });
  } catch (error) {
    console.error('❌ Import trades error:', error);
    res.status(500).json({ error: 'Failed to import trades' });
  }
});

export default router;
