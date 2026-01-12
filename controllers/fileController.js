const fs = require('fs');
const path = require('path');
const checkDiskSpace = require('check-disk-space').default;
const db = require('../utils/db');

const STORAGE_PATH = path.join(__dirname, '../shared-storage');

// Helper to ensure directory exists
const ensureDirectoryExistence = (filePath) => {
    if (fs.existsSync(filePath)) {
        return true;
    }
    fs.mkdirSync(filePath, { recursive: true });
    return true;
};

// Start ID for dummy storage (legacy) - redundant with check-disk-space but kept for safety
let fileIdCounter = 1;

// Helper to emit events
const emitUpdates = async (req, pathStr) => {
    const io = req.app.get('io');
    if (!io) return;

    // Emit file change for the specific folder
    io.emit('file_change', { path: pathStr, action: 'update' });

    // Emit dashboard update
    try {
        const stats = db.getStats();
        const diskSpace = await checkDiskSpace(STORAGE_PATH);
        const dashboardData = {
            success: true,
            ...stats,
            storage: {
                free: diskSpace.free,
                total: diskSpace.size,
                used: diskSpace.size - diskSpace.free
            }
        };
        io.emit('dashboard_update', dashboardData);

        // Also simple storage update
        io.emit('storage_update', {
            used: dashboardData.storage.used,
            total: dashboardData.storage.total,
            free: dashboardData.storage.free
        });

    } catch (e) {
        console.error("Error emitting updates:", e);
    }
};

const fileController = {
    // Get all files (supports nested paths)
    getFiles: (req, res) => {
        try {
            const requestedPath = req.query.path || '';
            // Sanitize path to prevent directory traversal
            const safePath = requestedPath.replace(/\.\./g, '');
            const currentDir = path.join(STORAGE_PATH, safePath);

            if (!fs.existsSync(currentDir)) {
                return res.status(404).json({ success: false, message: 'Directory not found' });
            }

            const items = fs.readdirSync(currentDir);

            // Get DB metadata to merge
            const dbFiles = db.getAllFiles();

            const fileList = items.map(item => {
                const fullPath = path.join(currentDir, item);
                const stats = fs.statSync(fullPath);

                // Find metadata for this file
                // db stores path as relative logical path (e.g., 'folder/subfolder')
                // requestedPath is also the logical path
                const metadata = dbFiles.find(f => f.name === item && f.path === safePath);

                return {
                    id: metadata?.id || fileIdCounter++, // Use persistent ID if available
                    name: item,
                    size: stats.size,
                    type: stats.isDirectory() ? 'folder' : path.extname(item).slice(1) || 'unknown',
                    createdDate: metadata?.uploadedAt || stats.birthtime, // Prefer upload date
                    isDirectory: stats.isDirectory(),
                    ownerIp: metadata?.ownerIp, // CRITICAL: Send owner IP to frontend
                    ...metadata // Merge other potential metadata
                };
            });

            res.json({ success: true, files: fileList });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    },

    // Create a new folder
    createFolder: async (req, res) => {
        try {
            const { name, currentPath = '' } = req.body;
            if (!name) return res.status(400).json({ success: false, message: 'Folder name required' });

            const safePath = currentPath.replace(/\.\./g, '');
            const newFolderPath = path.join(STORAGE_PATH, safePath, name);

            if (fs.existsSync(newFolderPath)) {
                return res.status(400).json({ success: false, message: 'Folder already exists' });
            }

            fs.mkdirSync(newFolderPath);

            // Emit Update
            await emitUpdates(req, safePath);

            // Record folder metadata with Owner IP
            db.addFile({
                name: name,
                size: 0,
                type: 'folder',
                path: safePath,
                ownerIp: req.clientIp, // SAVE OWNER IP
                isDirectory: true
            });

            res.json({ success: true, message: 'Folder created' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    },

    // Upload Files
    uploadFiles: async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, message: 'No files uploaded' });
            }

            const currentPath = req.body.path || '';

            // Record metadata in JSON DB
            req.files.forEach(file => {
                db.addFile({
                    name: file.originalname,
                    size: file.size,
                    type: path.extname(file.originalname).slice(1),
                    path: currentPath, // Store the logical folder path
                    ownerIp: req.clientIp // SAVE OWNER IP
                });
            });

            // Emit Update
            await emitUpdates(req, currentPath);

            res.json({ success: true, message: 'Files uploaded successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    },

    // Download File
    downloadFile: (req, res) => {
        try {
            const filename = req.params.filename;
            const requestedPath = req.query.path || '';
            const safePath = requestedPath.replace(/\.\./g, '');
            const filePath = path.join(STORAGE_PATH, safePath, filename);

            if (fs.existsSync(filePath)) {
                res.download(filePath);
            } else {
                res.status(404).json({ success: false, message: 'File not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    },

    // Delete File or Folder
    deleteFile: async (req, res) => {
        try {
            const filename = req.params.filename;
            const requestedPath = req.query.path || '';
            const safePath = requestedPath.replace(/\.\./g, '');
            const filePath = path.join(STORAGE_PATH, safePath, filename);

            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);

                // PERMISSION CHECK
                // 1. Find file metadata
                const logicalFolderPath = safePath; // For file
                const dbData = db.getAllFiles();
                const fileRecord = dbData.find(f => f.name === filename && f.path === logicalFolderPath);

                console.log(`[DELETE] Request from IP: ${req.clientIp}, Admin: ${req.isAdmin}`);
                console.log(`[DELETE] File: ${filename}, Path: ${logicalFolderPath}, Owner: ${fileRecord?.ownerIp}`);

                // 2. Check Ownership
                // If record exists, check IP. (Legacy files without IP might need policy: allow or deny? Plan says allow for now, or maybe only Admin can delete legacy? Let's allow legacy for now.)
                if (fileRecord && fileRecord.ownerIp) {
                    if (fileRecord.ownerIp !== req.clientIp && !req.isAdmin) {
                        console.log(`[DELETE] Permission DENIED`);
                        return res.status(403).json({ success: false, message: 'Permission denied: You do not own this file.' });
                    }
                } else if (!fileRecord) {
                    console.log(`[DELETE] Warning: File record not found in DB`);
                }

                if (stats.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true, force: true });
                    // Remove related entries from DB
                    const logicalFolderPath = safePath ? `${safePath}/${filename}` : filename;
                    db.removeFolder(logicalFolderPath);
                    // Also remove the folder entry itself
                    db.removeFile(filename, safePath);
                } else {
                    fs.unlinkSync(filePath);
                    db.removeFile(filename, safePath);
                }

                // Emit Update
                await emitUpdates(req, safePath);

                res.json({ success: true, message: 'Deleted successfully' });
            } else {
                res.status(404).json({ success: false, message: 'File not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    },

    // Rename File
    renameFile: async (req, res) => {
        try {
            const oldFilename = req.params.filename;
            const { newName, currentPath = '' } = req.body;

            const safePath = currentPath.replace(/\.\./g, '');
            const oldPath = path.join(STORAGE_PATH, safePath, oldFilename);
            const newPath = path.join(STORAGE_PATH, safePath, newName);

            if (fs.existsSync(oldPath)) {

                // PERMISSION CHECK
                const dbData = db.getAllFiles();
                const fileRecord = dbData.find(f => f.name === oldFilename && f.path === safePath);

                console.log(`[RENAME] Request from IP: ${req.clientIp}, Admin: ${req.isAdmin}`);
                console.log(`[RENAME] File: ${oldFilename}, Path: ${safePath}, Owner: ${fileRecord?.ownerIp}`);

                if (fileRecord && fileRecord.ownerIp) {
                    if (fileRecord.ownerIp !== req.clientIp && !req.isAdmin) {
                        console.log(`[RENAME] Permission DENIED`);
                        return res.status(403).json({ success: false, message: 'Permission denied: You do not own this file.' });
                    }
                } else if (!fileRecord) {
                    console.log(`[RENAME] Warning: File record not found in DB`);
                }

                fs.renameSync(oldPath, newPath);
                db.renameFile(oldFilename, newName, safePath);

                // Emit Update
                await emitUpdates(req, safePath);

                res.json({ success: true, message: 'Renamed successfully' });
            } else {
                res.status(404).json({ success: false, message: 'File not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    },

    // Get real disk storage info
    getStorageInfo: async (req, res) => {
        try {
            // Check the disk where STORAGE_PATH resides
            const diskSpace = await checkDiskSpace(STORAGE_PATH);
            const used = diskSpace.size - diskSpace.free;

            res.json({
                success: true,
                free: diskSpace.free,
                size: diskSpace.size,
                used: used,
                diskPath: diskSpace.diskPath
            });
        } catch (error) {
            console.error('Disk Check Error:', error);
            // Fallback
            res.json({
                success: true,
                free: 0,
                size: 0,
                used: 0
            });
        }
    },

    // Get Dashboard Statistics
    getDashboardStats: async (req, res) => {
        try {
            // Get DB stats (logical)
            const dbStats = db.getStats();

            // Get physical disk stats (fallback to 0 if fails)
            let diskSpace = { free: 0, size: 0 };
            try {
                diskSpace = await checkDiskSpace(STORAGE_PATH);
            } catch (e) {
                console.warn("Disk check failed inside dashboard stats", e);
            }

            res.json({
                success: true,
                ...dbStats,
                storage: {
                    free: diskSpace.free,
                    total: diskSpace.size,
                    used: diskSpace.size - diskSpace.free
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
};

module.exports = fileController;
