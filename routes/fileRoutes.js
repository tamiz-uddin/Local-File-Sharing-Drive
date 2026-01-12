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
        // Preserve original filename
        // To avoid overwriting, we could append timestamp, but requirement implies simple overwrite or existing check logic 
        // For now, keeping original name as per original request
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 1024 * 2 } // 2GB limit (increased)
});

// Routes
router.get('/files', fileController.getFiles);
router.post('/files/upload', upload.array('files'), fileController.uploadFiles);
router.get('/files/download/:filename', fileController.downloadFile);
router.delete('/files/:filename', fileController.deleteFile);
router.put('/files/:filename', fileController.renameFile);
router.post('/folders', fileController.createFolder);
// Storage Info
router.get('/storage', fileController.getStorageInfo);

// Dashboard Info (New)
router.get('/dashboard', fileController.getDashboardStats);

module.exports = router;
