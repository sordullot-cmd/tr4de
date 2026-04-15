import express from 'express';
import { hashPassword, comparePassword, generateToken, extractUserId, verifyToken } from '../lib/authUtils.js';
import { getOne, runQuery, getAll } from '../lib/database.js';

const router = express.Router();

// ====== AUTH MIDDLEWARE ======
export async function authMiddleware(req, res, next) {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = userId;
  next();
}

// ====== REGISTER ======
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, confirmPassword } = req.body;

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await getOne(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const result = await runQuery(
      'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
      [email, username, hashedPassword]
    );

    // Create account settings
    await runQuery(
      'INSERT INTO account_settings (user_id) VALUES (?)',
      [result.lastID]
    );

    // Generate token
    const token = generateToken(result.lastID);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: result.lastID,
        email,
        username,
      },
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ====== LOGIN ======
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await getOne(
      'SELECT id, username, email, password FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ====== GET CURRENT USER ======
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getOne(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.userId]
    );

    const settings = await getOne(
      'SELECT broker, account_number, timezone, notifications_enabled FROM account_settings WHERE user_id = ?',
      [req.userId]
    );

    res.json({
      user,
      settings,
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// ====== UPDATE PROFILE ======
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, broker, timezone } = req.body;

    if (username) {
      await runQuery(
        'UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [username, req.userId]
      );
    }

    if (broker || timezone !== undefined) {
      const existing = await getOne(
        'SELECT id FROM account_settings WHERE user_id = ?',
        [req.userId]
      );

      if (existing) {
        let sql = 'UPDATE account_settings SET updated_at = CURRENT_TIMESTAMP';
        const params = [];

        if (broker) {
          sql += ', broker = ?';
          params.push(broker);
        }
        if (timezone) {
          sql += ', timezone = ?';
          params.push(timezone);
        }

        sql += ' WHERE user_id = ?';
        params.push(req.userId);

        await runQuery(sql, params);
      }
    }

    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ====== LOGOUT ======
router.post('/logout', (req, res) => {
  // JWT tokens are stateless, but we can notify client to clear token
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
