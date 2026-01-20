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

// Community Storage setup
const COMMUNITIES_FILE = path.join(__dirname, 'data', 'communities.json');
let communities = [];

try {
  if (fs.existsSync(COMMUNITIES_FILE)) {
    const data = fs.readFileSync(COMMUNITIES_FILE, 'utf8');
    communities = JSON.parse(data);

    // Ensure data integrity: every community must have members and pendingRequests arrays
    let changed = false;
    communities.forEach(comm => {
      if (!comm.members) {
        comm.members = [];
        changed = true;
      }
      if (!comm.pendingRequests) {
        comm.pendingRequests = [];
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(COMMUNITIES_FILE, JSON.stringify(communities, null, 2));
    }
  } else {
    // Default system community
    communities = [{
      id: 'general',
      name: 'General Chat',
      creatorId: 'system',
      createdAt: new Date().toISOString(),
      members: [],
      pendingRequests: []
    }];
    fs.writeFileSync(COMMUNITIES_FILE, JSON.stringify(communities, null, 2));
  }
} catch (error) {
  console.error('Error loading communities:', error);
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

  // Join default room (IP based) or community
  socket.join(clientIp);

  console.log(`New client connected: ${socket.id} (IP: ${clientIp}, User: ${socket.data.username})`);

  // Send communities to the new client
  socket.emit('community-list', communities);

  // Community Management
  socket.on('create-community', (data) => {
    const newCommunity = {
      id: `comm_${Date.now()}`,
      name: data.name,
      creatorId: socket.data.user ? socket.data.user.id : 'anonymous',
      createdAt: new Date().toISOString(),
      members: [socket.data.user ? socket.data.user.id : 'anonymous'],
      pendingRequests: []
    };
    communities.push(newCommunity);
    try {
      fs.writeFileSync(COMMUNITIES_FILE, JSON.stringify(communities, null, 2));
      io.emit('community-list', communities);
    } catch (err) {
      console.error('Error creating community:', err);
    }
  });

  socket.on('get-communities', () => {
    socket.emit('community-list', communities);
  });

  socket.on('delete-community', (communityId) => {
    console.log(`Delete request for ${communityId} from ${socket.data.user?.username} (${socket.data.user?.id})`);
    const commIndex = communities.findIndex(c => c.id === communityId);
    if (commIndex !== -1) {
      const community = communities[commIndex];
      const isCreator = socket.data.user && socket.data.user.id === community.creatorId;
      const isAdmin = socket.data.user && socket.data.user.role === 'admin';

      console.log(`Permission check: isCreator=${isCreator}, isAdmin=${isAdmin}`);

      if (isCreator || isAdmin) {
        communities.splice(commIndex, 1);
        chatHistory = chatHistory.filter(m => m.communityId !== communityId);

        try {
          fs.writeFileSync(COMMUNITIES_FILE, JSON.stringify(communities, null, 2));
          fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
          io.emit('community-list', communities);
          io.emit('chat-history', chatHistory);
          console.log(`Community ${communityId} deleted successfully`);
        } catch (err) {
          console.error('Error deleting community:', err);
        }
      } else {
        console.log(`Delete blocked: Forbidden for user ${socket.data.user?.id}`);
      }
    } else {
      console.log(`Delete failed: Community ${communityId} not found`);
    }
  });

  socket.on('join-community', (communityId) => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room.startsWith('comm_') || room === 'general') {
        socket.leave(room);
      }
    });

    socket.join(communityId);
    console.log(`Socket ${socket.id} joined room: ${communityId}`);

    // Security: Only allow members to see history (or general room)
    const userId = socket.data.user ? socket.data.user.id : (socket.data.ip ? 'guest_' + socket.data.ip.replace(/\./g, '_') : null);
    const community = communities.find(c => c.id === communityId);
    const isMember = community?.members?.includes(userId) || communityId === 'general';

    if (isMember) {
      const roomHistory = chatHistory.filter(m => m.communityId === communityId || (!m.communityId && communityId === 'general'));
      socket.emit('chat-history', roomHistory);
    } else {
      socket.emit('chat-history', []);
    }
  });

  socket.on('get-chat-history', (communityId) => {
    const community = communities.find(c => c.id === communityId);
    const userId = socket.data.user ? socket.data.user.id : (socket.data.ip ? 'guest_' + socket.data.ip.replace(/\./g, '_') : null);
    const isMember = community?.members?.includes(userId) || communityId === 'general';

    if (isMember) {
      const roomHistory = chatHistory.filter(m => m.communityId === communityId || (!m.communityId && communityId === 'general'));
      socket.emit('chat-history', roomHistory);
    } else {
      socket.emit('chat-history', []);
    }
  });

  socket.on('request-join', (communityId) => {
    const comm = communities.find(c => c.id === communityId);
    if (!comm) return;
    const userId = socket.data.user?.id;
    if (!userId) return;
    if (!comm.members) comm.members = [];
    if (!comm.pendingRequests) comm.pendingRequests = [];
    if (!comm.members.includes(userId) && !comm.pendingRequests.some(r => r.id === userId)) {
      comm.pendingRequests.push({
        id: userId,
        username: socket.data.username,
        name: socket.data.user.name,
        requestedAt: new Date().toISOString()
      });
      try {
        fs.writeFileSync(COMMUNITIES_FILE, JSON.stringify(communities, null, 2));
        io.emit('community-list', communities);
      } catch (err) {
        console.error('Error saving join request:', err);
      }
    }
  });

  socket.on('review-join-request', ({ communityId, userId, action }) => {
    const comm = communities.find(c => c.id === communityId);
    if (!comm) return;
    const isAdmin = socket.data.user?.role === 'admin';
    const isCreator = socket.data.user?.id === comm.creatorId;
    if (isAdmin || isCreator) {
      if (action === 'approve') {
        if (!comm.members) comm.members = [];
        if (!comm.members.includes(userId)) comm.members.push(userId);
      }
      comm.pendingRequests = comm.pendingRequests.filter(r => r.id !== userId);
      try {
        fs.writeFileSync(COMMUNITIES_FILE, JSON.stringify(communities, null, 2));
        io.emit('community-list', communities);
      } catch (err) {
        console.error('Error reviewing join request:', err);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id} (IP: ${clientIp})`);
  });

  // Chat message listener
  socket.on('chat-message', (data) => {
    const communityId = data.communityId || 'general';
    const community = communities.find(c => c.id === communityId);

    if (!community) return;

    // Security: Must be a member to chat (or general room guest)
    const userId = socket.data.user ? socket.data.user.id : (socket.data.ip ? 'guest_' + socket.data.ip.replace(/\./g, '_') : null);
    const isMember = community.members?.includes(userId) || communityId === 'general';

    if (!isMember) {
      return console.log(`Blocked message from ${userId} in ${communityId} (Not a member)`);
    }

    const chatMessage = {
      id: Date.now(),
      sender: clientIp,
      senderId: socket.data.user ? socket.data.user.id : null,
      senderName: socket.data.user?.name || socket.data.username || data.senderName || 'Anonymous',
      senderRole: socket.data.user ? socket.data.user.role : 'user',
      text: data.text,
      communityId: data.communityId || 'general',
      timestamp: new Date().toISOString(),
      deleted: false
    };

    chatHistory.push(chatMessage);
    try {
      fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
    } catch (saveError) {
      console.error('Error saving chat message:', saveError);
    }

    io.to(chatMessage.communityId).emit('chat-message', chatMessage);
  });

  // Delete message listener (soft delete)
  socket.on('delete-message', (messageId) => {
    const messageIndex = chatHistory.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      chatHistory[messageIndex].deleted = true;

      try {
        fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
        const communityId = chatHistory[messageIndex].communityId || 'general';
        io.to(communityId).emit('chat-history', chatHistory.filter(m => m.communityId === communityId || (!m.communityId && communityId === 'general')));
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
  const { findUserById } = require('./utils/userUtils');
  let userData = null;

  if (req.user) {
    userData = findUserById(req.user.id);
  }

  if (userData) {
    return res.json({
      ip: req.clientIp,
      isAdmin: req.isAdmin,
      user: {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        role: userData.role,
        hasChatLock: !!userData.chatLock
      }
    });
  }

  // Guest response
  res.json({
    ip: req.clientIp,
    isAdmin: false,
    user: {
      id: 'guest_' + req.clientIp.replace(/\./g, '_'),
      username: 'Guest_' + req.clientIp.split('.').pop(),
      name: 'Guest (' + req.clientIp + ')',
      role: 'guest',
      hasChatLock: false
    }
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
