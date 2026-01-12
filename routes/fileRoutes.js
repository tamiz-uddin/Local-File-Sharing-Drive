const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fileController = require('../controllers/fileController');

const STORAGE_DIR = path.join(__dirname, '../shared-storage');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Support uploading to subfolders
        const currentPath = req.body.path || '';
        // Basic scrubbing to prevent traversing up
        const safePath = currentPath.replace(/\.\./g, '');
        const uploadPath = path.join(STORAGE_DIR, safePath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Appending timestamp to ensure uniqueness on disk
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 1024 * 2 } // 2GB limit (increased)
});

// Routes
router.get('/files', fileController.getFiles);
router.post('/files/upload', upload.array('files'), fileController.uploadFiles);
router.get('/files/download', fileController.downloadFile);
router.delete('/files', fileController.deleteFile);
router.put('/files', fileController.renameFile);
router.post('/folders', fileController.createFolder);
// Storage Info
router.get('/storage', fileController.getStorageInfo);

// Dashboard Info (New)
router.get('/dashboard', fileController.getDashboardStats);

module.exports = router;
