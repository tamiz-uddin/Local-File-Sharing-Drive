const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { findUserByUsername, createUser, setChatLock, verifyChatLock } = require('../utils/userUtils');
const { authenticateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_fallback_secret_key';

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, username, password } = req.body;

        if (!name || !email || !username || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const existingUser = findUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }

        const user = await createUser(name, email, username, password);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        const user = findUserByUsername(username);
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const payload = { id: user.id, username: user.username, role: user.role, name: user.name };

        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token: accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// Quick Admin Login (with constant password)
router.post('/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        const ADMIN_ACCESS_PASS = process.env.ADMIN_ACCESS_PASSWORD || 'admin123';

        if (password !== ADMIN_ACCESS_PASS) {
            return res.status(400).json({ success: false, message: 'Invalid admin access password' });
        }

        // Find the first admin user
        const { getAllUsers } = require('../utils/userUtils');
        const adminUser = getAllUsers().find(u => u.role === 'admin');

        if (!adminUser) {
            return res.status(404).json({ success: false, message: 'No admin user found in system' });
        }

        const payload = { id: adminUser.id, username: adminUser.username, role: adminUser.role, name: adminUser.name };

        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token: accessToken,
            refreshToken,
            user: {
                id: adminUser.id,
                username: adminUser.username,
                role: adminUser.role,
                name: adminUser.name
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error during admin login' });
    }
});

// Refresh Token
router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        const payload = { id: decoded.id, username: decoded.username, role: decoded.role, name: decoded.name };

        const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

        res.json({
            success: true,
            token: newAccessToken
        });
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }
});

router.post('/chat-lock/set', authenticateToken, async (req, res) => {
    try {
        const { pin } = req.body; // pin can be null to clear
        await setChatLock(req.user.id, pin);
        res.json({ success: true, message: pin ? 'Chat lock set' : 'Chat lock cleared' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/chat-lock/verify', authenticateToken, async (req, res) => {
    try {
        const { pin } = req.body;
        const isValid = await verifyChatLock(req.user.id, pin);
        if (isValid) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Invalid PIN' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
