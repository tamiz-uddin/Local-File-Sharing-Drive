import axios from 'axios';

const API_URL = import.meta.env.PROD
    ? 'http://10.10.10.2'
    : `http://${window.location.hostname}:5000`;

const api = axios.create({
    baseURL: API_URL,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

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

    // Download file (by ID)
    downloadFile: (id) => {
        window.open(`${API_URL}/api/files/download?id=${encodeURIComponent(id)}`, '_blank');
    },

    // Delete file or folder (by ID)
    deleteFile: async (id) => {
        const response = await api.delete('/api/files', {
            params: { id }
        });
        return response.data;
    },

    // Rename file or folder (by ID)
    renameFile: async (id, newName) => {
        const response = await api.put('/api/files', {
            newName
        }, {
            params: { id }
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
    getPreviewUrl: (systemName, currentPath = '') => {
        const pathPart = currentPath ? `${currentPath}/` : '';
        return `${API_URL}/uploads/${pathPart}${systemName}`;
    }
};
