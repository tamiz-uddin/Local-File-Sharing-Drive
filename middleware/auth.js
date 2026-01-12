const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

const getClientIp = (req) => {
    // Standard headers for proxies
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        // The first IP in the list is the original client IP
        return xForwardedFor.split(',')[0].trim();
    }

    // Direct connection or fallback
    return req.socket.remoteAddress || req.ip || 'unknown';
};

const extractClientIp = (req, res, next) => {
    let checkIp = getClientIp(req);

    // Normalize IPv6 localhost and mapped IPv4
    if (checkIp === '::1') {
        checkIp = '127.0.0.1';
    } else if (checkIp.startsWith('::ffff:')) {
        checkIp = checkIp.replace('::ffff:', '');
    }

    req.clientIp = checkIp;

    // Check for JWT token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (!err) {
                req.user = decoded;
                req.isAdmin = decoded.role === 'admin';
            } else {
                // Token invalid but we don't block here, just mark as unauthenticated
                req.user = null;
                req.isAdmin = false;
            }
        });
    } else {
        // Fallback to the old admin check for transition period
        const adminAuth = req.headers['x-admin-auth'];
        req.isAdmin = adminAuth === 'admin';
        req.user = null;
    }

    next();
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. Token missing.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
        }
        req.user = decoded;
        req.isAdmin = decoded.role === 'admin';
        next();
    });
};

module.exports = {
    extractClientIp,
    getClientIp,
    authenticateToken
};
