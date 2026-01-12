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
            const safePath = requestedPath.replace(/\.\./g, '');
            const currentDir = path.join(STORAGE_PATH, safePath);

            if (!fs.existsSync(currentDir)) {
                return res.status(404).json({ success: false, message: 'Directory not found' });
            }

            // Primary source is DB for regular files, but folders still need readdir for sub-items?
            // Actually, let's stick to the DB-first approach for metadata accuracy
            const allDbFiles = db.getAllFiles();
            const currentPathFiles = allDbFiles.filter(f => f.path === safePath);

            // Also check disk to ensure files still exist (optional but good for sync)
            const diskItems = fs.readdirSync(currentDir);

            const fileList = currentPathFiles.map(metadata => {
                const systemName = metadata.systemName || metadata.name;
                const fullPath = path.join(currentDir, systemName);
                let stats = { size: 0, isDirectory: () => false, birthtime: new Date() };

                if (fs.existsSync(fullPath)) {
                    stats = fs.statSync(fullPath);
                }

                return {
                    id: metadata.id,
                    name: metadata.name,
                    size: metadata.size || stats.size,
                    type: metadata.type || (stats.isDirectory() ? 'folder' : path.extname(metadata.name).slice(1) || 'unknown'),
                    createdDate: metadata.uploadedAt || stats.birthtime,
                    isDirectory: metadata.isDirectory || stats.isDirectory(),
                    ownerIp: metadata.ownerIp,
                    ownerUsername: metadata.ownerUsername,
                    ownerId: metadata.ownerId,
                    ...metadata
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

            // Record folder metadata with Owner info
            db.addFile({
                name: name,
                size: 0,
                type: 'folder',
                path: safePath,
                ownerId: req.user?.id,
                ownerName: req.user?.name || req.user?.username,
                ownerUsername: req.user?.username, // SAVE OWNER USERNAME
                ownerIp: req.clientIp,
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
            console.log(`[UPLOAD] Processing ${req.files.length} files for user:`, req.user?.username);

            req.files.forEach(file => {
                const metadata = {
                    name: file.originalname,
                    systemName: file.filename,
                    size: file.size,
                    type: path.extname(file.originalname).slice(1),
                    path: currentPath,
                    ownerId: req.user?.id,
                    ownerName: req.user?.name || req.user?.username,
                    ownerUsername: req.user?.username,
                    ownerIp: req.clientIp
                };
                console.log(`[UPLOAD] Adding file to DB: ${metadata.name}, Owner: ${metadata.ownerUsername}`);
                db.addFile(metadata);
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
            const id = req.query.id;
            const allFiles = db.getAllFiles();
            const fileRecord = allFiles.find(f => f.id === id);

            if (!fileRecord) {
                return res.status(404).json({ success: false, message: 'File not found' });
            }

            const safePath = fileRecord.path.replace(/\.\./g, '');
            const systemName = fileRecord.systemName || fileRecord.name;
            const filePath = path.join(STORAGE_PATH, safePath, systemName);

            if (fs.existsSync(filePath)) {
                res.download(filePath, fileRecord.name); // Download with display name
            } else {
                res.status(404).json({ success: false, message: 'File not found on disk' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    },

    // Delete File or Folder
    deleteFile: async (req, res) => {
        try {
            const id = req.query.id; // Switch to ID-based deletion
            const allFiles = db.getAllFiles();
            const fileRecord = allFiles.find(f => f.id === id);

            if (!fileRecord) {
                return res.status(404).json({ success: false, message: 'File record not found' });
            }

            const safePath = fileRecord.path.replace(/\.\./g, '');
            const systemName = fileRecord.systemName || fileRecord.name;
            const filePath = path.join(STORAGE_PATH, safePath, systemName);

            // PERMISSION CHECK
            console.log(`[DELETE] Request from User: ${req.user?.username} (${req.user?.id}), IP: ${req.clientIp}, Admin: ${req.isAdmin}`);
            console.log(`[DELETE] File ID: ${id}, Name: ${fileRecord.name}, Owner: ${fileRecord.ownerUsername || fileRecord.ownerIp}`);

            const isOwner = req.user && (fileRecord.ownerId === req.user.id || fileRecord.ownerUsername === req.user.username);
            const isIpMatch = fileRecord.ownerIp === req.clientIp;

            if (!isOwner && !isIpMatch && !req.isAdmin) {
                console.log(`[DELETE] Permission DENIED`);
                return res.status(403).json({ success: false, message: 'Permission denied: You do not own this file.' });
            }

            // Perform Deletion
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true, force: true });
                    const logicalFolderPath = safePath ? `${safePath}/${fileRecord.name}` : fileRecord.name;
                    db.removeFolder(logicalFolderPath);
                } else {
                    fs.unlinkSync(filePath);
                }
            }

            db.removeFile(id);

            // Emit Update
            await emitUpdates(req, safePath);

            res.json({ success: true, message: 'Deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    },

    // Rename File
    renameFile: async (req, res) => {
        try {
            const id = req.query.id;
            const { newName } = req.body;

            const allFiles = db.getAllFiles();
            const fileRecord = allFiles.find(f => f.id === id);

            if (!fileRecord) {
                return res.status(404).json({ success: false, message: 'File record not found' });
            }

            const safePath = fileRecord.path.replace(/\.\./g, '');
            const systemName = fileRecord.systemName || fileRecord.name;
            const oldPath = path.join(STORAGE_PATH, safePath, systemName);

            // For renaming, we only change the display name in DB unless it's a folder.
            // If it's a folder, we HAVE to rename the disk path too.
            const isFolder = fileRecord.isDirectory;

            // PERMISSION CHECK
            const isOwner = req.user && (fileRecord.ownerId === req.user.id || fileRecord.ownerUsername === req.user.username);
            const isIpMatch = fileRecord.ownerIp === req.clientIp;

            if (!isOwner && !isIpMatch && !req.isAdmin) {
                return res.status(403).json({ success: false, message: 'Permission denied' });
            }

            if (isFolder) {
                const newPath = path.join(STORAGE_PATH, safePath, newName);
                if (fs.existsSync(newPath)) {
                    return res.status(400).json({ success: false, message: 'Folder already exists on disk' });
                }
                fs.renameSync(oldPath, newPath);
            }

            db.renameFile(id, newName);

            // Emit Update
            await emitUpdates(req, safePath);

            res.json({ success: true, message: 'Renamed successfully' });
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
