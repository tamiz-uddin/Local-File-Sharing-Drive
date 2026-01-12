import axios from 'axios';

const API_URL = import.meta.env.PROD
    ? ''
    : `http://${window.location.hostname}:5000`;

const api = axios.create({
    baseURL: API_URL,
});

// Add interceptor to inject Admin Auth header
api.interceptors.request.use((config) => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
        config.headers['x-admin-auth'] = adminAuth;
    }
    return config;
});

export const fileAPI = {
    // Get Identity
    getIdentity: async () => {
        const response = await api.get('/api/me');
        return response.data;
    },
    // Get all files (with path support)
    getFiles: async (path = '') => {
        const response = await api.get('/api/files', {
            params: { path }
        });
        return response.data;
    },

    // Create a new folder
    createFolder: async (name, currentPath = '') => {
        const response = await api.post('/api/folders', {
            name,
            currentPath
        });
        return response.data;
    },

    // Upload files (to specific path)
    uploadFiles: async (files, currentPath = '', onProgress) => {
        const formData = new FormData();
        // Vital: Path must be appended BEFORE files for Multer to read it first
        formData.append('path', currentPath);

        Array.from(files).forEach((file) => {
            formData.append('files', file);
        });

        const response = await api.post('/api/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress) {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    onProgress(percentCompleted);
                }
            },
        });

        return response.data;
    },

    // Download file (from specific path)
    downloadFile: (filename, currentPath = '') => {
        const pathParam = currentPath ? `?path=${encodeURIComponent(currentPath)}` : '';
        window.open(`${API_URL}/api/files/download/${encodeURIComponent(filename)}${pathParam}`, '_blank');
    },

    // Delete file or folder
    deleteFile: async (filename, currentPath = '') => {
        const response = await api.delete(`/api/files/${encodeURIComponent(filename)}`, {
            params: { path: currentPath }
        });
        return response.data;
    },

    // Rename file or folder
    renameFile: async (oldFilename, newName, currentPath = '') => {
        const response = await api.put(`/api/files/${encodeURIComponent(oldFilename)}`, {
            newName,
            currentPath
        });
        return response.data;
    },

    // Get storage info
    getStorageInfo: async () => {
        const response = await api.get('/api/storage');
        return response.data;
    },

    // Get Dashboard Stats
    getDashboardStats: async () => {
        const response = await api.get('/api/dashboard');
        return response.data;
    },

    // Helper to get preview URL
    getPreviewUrl: (filename, currentPath = '') => {
        const pathPart = currentPath ? `${currentPath}/` : '';
        // Note: verify if backend serves static files correctly with nested paths or if we need a proxy route
        // For static serve 'app.use('/uploads', ...)', URL is /uploads/path/to/file.ext
        return `${API_URL}/uploads/${pathPart}${filename}`;
    }
};
