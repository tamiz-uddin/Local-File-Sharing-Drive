# 🚀 Local Network File Sharing Application

A modern, beautiful file sharing application accessible to anyone on your local network (LAN/Wi-Fi). Built with the MERN stack (minus MongoDB - using filesystem storage).

## ✨ Features

- 📤 **Drag & Drop Upload** - Intuitive file upload with visual feedback
- 📁 **File Management** - Full CRUD operations (Create, Read, Update, Delete)
- 🔄 **Auto-Refresh** - File list updates automatically after operations
- 🔍 **Search** - Quickly find files by name
- 📊 **Multiple Views** - Toggle between grid and list layouts
- 🎨 **Premium UI** - Glassmorphism design with smooth animations
- 🌐 **Network Access** - Share files with any device on your LAN
- 📈 **Upload Progress** - Real-time upload progress tracking
- 📂 **File Icons** - Automatic file type detection with appropriate icons

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)
- Axios

**Backend:**
- Node.js
- Express
- Multer (file uploads)
- CORS

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## 🚀 Installation

1. **Clone or download this project**

2. **Install backend dependencies:**
```bash
npm install
```

3. **Install frontend dependencies:**
```bash
cd client
npm install
cd ..
```

## 🎯 Running the Application

### Development Mode (Recommended)

Run both backend and frontend concurrently:

```bash
npm run dev
```

This will start:
- Backend API server on `http://localhost:5000`
- Frontend dev server on `http://localhost:3000`

### Production Mode

1. Build the frontend:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:5000`

## 🌐 Network Access

When you start the server, it will display the local IP address in the console:

```
╔════════════════════════════════════════════════════════════╗
║      🚀 Local Network File Sharing Server Started!        ║
╚════════════════════════════════════════════════════════════╝

📂 Storage Directory: C:\Users\USER\Desktop\file-shareing\shared-storage

🌐 Access URLs:
   Local:   http://localhost:5000
   Network: http://192.168.1.XXX:5000

💡 Share the Network URL with devices on your LAN
```

**To access from other devices:**
1. Make sure all devices are on the same Wi-Fi network
2. Share the Network URL (e.g., `http://192.168.1.XXX:5000`) with other devices
3. Open that URL in any web browser on those devices

## 📁 File Storage

All uploaded files are stored in the `shared-storage/` directory in the project root.

## 🎨 Features Overview

### Upload Files
- Drag and drop files onto the upload zone
- Or click "Choose Files" to select files
- Upload progress bar shows real-time progress
- Supports multiple file uploads

### Manage Files
- **Download**: Click the download button on any file
- **Rename**: Click the edit icon to rename files inline
- **Delete**: Click the delete icon to remove files
- **Search**: Use the search bar to filter files by name

### View Options
- **Grid View**: See files in a card grid layout
- **List View**: See files in a compact list
- **Refresh**: Manually refresh the file list

## ⚙️ Configuration

### Change Port

Edit `server.js` and `client/vite.config.js`:

**server.js:**
```javascript
const PORT = process.env.PORT || 5000; // Change 5000 to your desired port
```

**client/vite.config.js:**
```javascript
server: {
  port: 3000, // Change frontend port
  proxy: {
    '/api': {
      target: 'http://localhost:5000', // Match backend port
    },
  },
}
```

### Change Upload Limit

Edit `server.js`:

```javascript
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 100 } // 100MB (change as needed)
});
```

## 🔒 Security Considerations

⚠️ **Important**: This application has NO authentication or access control. Anyone on your network can:
- Upload files
- Download files
- Delete files
- Rename files

**Recommendations:**
- Only use on trusted networks
- Consider adding password protection for production use
- Don't expose to the public internet
- Regularly backup important files

## 🐛 Troubleshooting

### "Cannot connect to server"
- Make sure the backend is running (`npm run server` or `npm run dev`)
- Check firewall settings - ensure port 5000 is open
- Verify you're using the correct IP address

### "Upload failed"
- Check file size doesn't exceed the limit (100MB by default)
- Ensure the `shared-storage/` directory exists and is writable

### "Module not found" errors
- Run `npm install` in the root directory
- Run `npm install` in the `client/` directory

## 📝 Project Structure

```
file-shareing/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   ├── App.jsx        # Main app component
│   │   └── index.css      # Tailwind styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── shared-storage/        # File storage directory
├── server.js             # Express backend
├── package.json          # Backend dependencies
└── README.md            # This file
```

## 📄 License

This project is free to use and modify.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

Made with ❤️ using React, Node.js, and Tailwind CSS
