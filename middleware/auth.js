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

    // Allow overriding from a special header if needed for testing (optional/dev only)
    // if (process.env.NODE_ENV === 'development' && req.headers['x-mock-ip']) {
    //     checkIp = req.headers['x-mock-ip'];
    // }

    req.clientIp = checkIp;

    // Check for Admin header (simple password check for now)
    const adminAuth = req.headers['x-admin-auth'];
    req.isAdmin = adminAuth === 'admin'; // VERY SIMPLE password for MVP as requested

    next();
};

module.exports = {
    extractClientIp,
    getClientIp
};
