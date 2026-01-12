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
        const id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
        data.files.push({
            ...fileMetadata,
            id: id,
            uploadedAt: new Date().toISOString()
        });
        writeDB(data);
    },

    removeFile: (id) => {
        const data = readDB();
        const fileToRemove = data.files.find(f => f.id === id);
        data.files = data.files.filter(f => f.id !== id);
        writeDB(data);
        return fileToRemove;
    },

    removeFolder: (folderPath) => {
        const data = readDB();
        const prefix = folderPath ? folderPath + '/' : '';

        data.files = data.files.filter(f => {
            const isExact = f.path === folderPath;
            const isChild = f.path.startsWith(prefix);
            return !isExact && !isChild;
        });
        writeDB(data);
    },

    renameFile: (id, newName) => {
        const data = readDB();
        const file = data.files.find(f => f.id === id);
        if (file) {
            const oldName = file.name;
            const isFolder = file.isDirectory;
            const parentPath = file.path;

            // Update the record itself
            file.name = newName;

            if (isFolder) {
                // If it's a folder, we need to update the path of all contents
                // The logical path of this folder was: parentPath ? `${parentPath}/${oldName}` : oldName
                const oldFolderPath = parentPath ? `${parentPath}/${oldName}` : oldName;
                const newFolderPath = parentPath ? `${parentPath}/${newName}` : newName;

                data.files.forEach(f => {
                    if (f.path === oldFolderPath) {
                        f.path = newFolderPath;
                    } else if (f.path.startsWith(oldFolderPath + '/')) {
                        f.path = f.path.replace(oldFolderPath + '/', newFolderPath + '/');
                    }
                });
            }

            writeDB(data);
            return true;
        }
        return false;
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
