const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory and db file exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ files: [] }, null, 2));
}

const readDB = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { files: [] };
    }
};

const writeDB = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

const db = {
    getAllFiles: () => {
        const data = readDB();
        return Array.isArray(data.files) ? data.files : [];
    },

    addFile: (fileMetadata) => {
        const data = readDB();
        data.files.push({
            ...fileMetadata,
            id: Date.now().toString(), // Simple ID generation
            uploadedAt: new Date().toISOString()
        });
        writeDB(data);
    },

    removeFile: (filename, folderPath = '') => {
        const data = readDB();
        // Path logic needs to match how we store it.
        // We'll store 'path' as 'folder/subfolder'
        data.files = data.files.filter(f =>
            !(f.name === filename && f.path === folderPath)
        );
        writeDB(data);
    },

    // When a folder is deleted, we should remove all files in it recursively?
    // For simplicity, we might just track individual files. 
    // If a physical folder delete happens, we can clean up DB or leave potential orphans if strict sync isn't critical for MVP.
    // Let's try to remove by prefix for folder deletion.
    removeFolder: (folderPath) => {
        const data = readDB();
        // Remove valid files that are temporally exactly the folder path or start with it? 
        // Actually, files inside 'folder' have path 'folder' or 'folder/sub'.
        const prefix = folderPath ? folderPath + '/' : '';

        data.files = data.files.filter(f => {
            const isExact = f.path === folderPath;
            const isChild = f.path.startsWith(prefix); // e.g., 'folder/sub' starts with 'folder/'
            return !isExact && !isChild;
        });
        writeDB(data);
    },

    renameFile: (oldName, newName, folderPath = '') => {
        const data = readDB();
        const file = data.files.find(f => f.name === oldName && f.path === folderPath);
        if (file) {
            file.name = newName;
            writeDB(data);
        }
    },

    getStats: () => {
        const data = readDB();
        const files = Array.isArray(data.files) ? data.files : [];
        const totalFiles = files.length;
        const totalSize = files.reduce((acc, curr) => acc + (Number(curr.size) || 0), 0);

        // Distribution by type
        const typeDist = files.reduce((acc, curr) => {
            const type = curr.type || 'unknown'; // Extension or mimetype
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        // Recent uploads (last 5) - Safety check for dates
        const recent = [...files]
            .sort((a, b) => {
                const dateA = new Date(a.uploadedAt || 0);
                const dateB = new Date(b.uploadedAt || 0);
                return dateB - dateA;
            })
            .slice(0, 5);

        return {
            totalFiles,
            totalSize,
            typeDist,
            recent
        };
    }
};

module.exports = db;
