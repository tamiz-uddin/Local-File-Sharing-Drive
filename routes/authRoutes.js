const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { findUserByUsername, createUser } = require('../utils/userUtils');

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

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

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
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

module.exports = router;
