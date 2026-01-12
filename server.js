const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const http = require('http');
const { Server } = require('socket.io');
const fileRoutes = require('./routes/fileRoutes');
const { extractClientIp, getClientIp } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  // Get IP address
  let clientIp = getClientIp(socket.request);

  // Normalize
  if (clientIp === '::1') {
    clientIp = '127.0.0.1';
  } else if (clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.replace('::ffff:', '');
  }

  // Store in socket data
  socket.data.ip = clientIp;

  // Join room
  socket.join(clientIp);

  console.log(`New client connected: ${socket.id} (IP: ${clientIp})`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id} (IP: ${clientIp})`);
  });
});

app.set('io', io);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(extractClientIp); // Apply extractClientIp middleware globally or to specific routes

// Serve uploaded files statically for preview
// This allows <img src="http://localhost:5000/uploads/filename.jpg" />
app.use('/uploads', express.static(path.join(__dirname, 'shared-storage')));

// API Routes
app.use('/api', (req, res, next) => {
  req.app.set('io', io); // Share io instance with controller
  next();
}, require('./routes/fileRoutes'));

// Identity Endpoint
app.get('/api/me', (req, res) => {
  res.json({
    ip: req.clientIp,
    isAdmin: req.isAdmin
  });
});

// Serve React app for all other routes
app.use(express.static(path.join(__dirname, 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// Helper function to get local IP address
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

// Start server
server.listen(PORT, '0.0.0.0', () => { // Use server.listen instead of app.listen
  const localIP = getLocalIP();
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      🚀 Local Network File Sharing Server Started!        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`📂 Storage Directory: ${path.join(__dirname, 'shared-storage')}`);
  console.log(`\n🌐 Access URLs:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIP}:${PORT}`);
  console.log(`\n💡 Share the Network URL with devices on your LAN\n`);
});
