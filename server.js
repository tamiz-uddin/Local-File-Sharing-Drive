const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const http = require('http');
const { Server } = require('socket.io');
const fileRoutes = require('./routes/fileRoutes');
const { extractClientIp, getClientIp } = require('./middleware/auth');

const fs = require('fs');

const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/authRoutes');
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

const app = express();
const server = http.createServer(app);

// Chat history setup
const CHAT_HISTORY_FILE = path.join(__dirname, 'data', 'chats.json');
let chatHistory = [];

try {
  if (fs.existsSync(CHAT_HISTORY_FILE)) {
    const data = fs.readFileSync(CHAT_HISTORY_FILE, 'utf8');
    chatHistory = JSON.parse(data);
  } else {
    // Ensure data directory exists
    const dataDir = path.dirname(CHAT_HISTORY_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify([], null, 2));
  }
} catch (error) {
  console.error('Error loading chat history:', error);
}

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

  // Socket Authentication via Token
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.data.user = decoded;
      socket.data.username = decoded.username;
    } catch (err) {
      console.error('Socket authentication error:', err.message);
      socket.data.user = null;
      socket.data.username = 'Anonymous';
    }
  } else {
    socket.data.user = null;
    socket.data.username = 'Anonymous';
  }

  // Store in socket data
  socket.data.ip = clientIp;

  // Join room
  socket.join(clientIp);

  console.log(`New client connected: ${socket.id} (IP: ${clientIp}, User: ${socket.data.username})`);

  // Send chat history to the new client
  socket.emit('chat-history', chatHistory);

  // Manual history request (for instant loading when navigating)
  socket.on('get-chat-history', () => {
    socket.emit('chat-history', chatHistory);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id} (IP: ${clientIp})`);
  });

  // Chat message listener
  socket.on('chat-message', (data) => {
    const chatMessage = {
      id: Date.now(),
      sender: clientIp,
      senderId: socket.data.user ? socket.data.user.id : null,
      senderName: socket.data.user?.name || socket.data.username || data.senderName || 'Anonymous',
      senderRole: socket.data.user ? socket.data.user.role : 'user',
      text: data.text,
      timestamp: new Date().toISOString(),
      deleted: false
    };

    // Save to history
    chatHistory.push(chatMessage);
    try {
      fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
    } catch (saveError) {
      console.error('Error saving chat message:', saveError);
    }

    // Broadcast to all connected clients
    io.emit('chat-message', chatMessage);
  });

  // Delete message listener (soft delete)
  socket.on('delete-message', (messageId) => {
    const messageIndex = chatHistory.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      // Security check: only allow sender or admin to delete
      // For now, focusing on user requirement: "just update as deleted true"
      chatHistory[messageIndex].deleted = true;

      try {
        fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
        // Broadcast the update to all clients
        io.emit('chat-history', chatHistory);
      } catch (saveError) {
        console.error('Error updating chat history for deletion:', saveError);
      }
    }
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

// Auth Routes
app.use('/api/auth', authRoutes);

// API Routes
app.use('/api', (req, res, next) => {
  req.app.set('io', io); // Share io instance with controller
  next();
}, require('./routes/fileRoutes'));

// Identity Endpoint
app.get('/api/me', (req, res) => {
  res.json({
    ip: req.clientIp,
    isAdmin: req.isAdmin,
    user: req.user
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
