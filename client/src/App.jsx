import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Check, File } from 'lucide-react';
import MainLayout from './layouts/MainLayout';
import Drive from './pages/Drive';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Register from './pages/Register';
import { fileAPI } from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [triggerUpload, setTriggerUpload] = useState(null);
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0, free: 0 });
  const { user, isAuthenticated, loading, logout } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadStorageInfo();
    }
  }, [isAuthenticated]);

  const loadStorageInfo = async () => {
    try {
      const data = await fileAPI.getStorageInfo();
      if (data.success) {
        setStorageInfo({ used: data.used, total: data.size, free: data.free });
      }
    } catch (error) {
      console.error('Failed to load storage info', error);
    }
  };

  const onUploadComplete = async (fileList, pathStr, refreshCallback) => {
    setIsUploading(true);
    try {
      await fileAPI.uploadFiles(fileList, pathStr, (progress) => setUploadProgress(progress));
      await refreshCallback();
      loadStorageInfo();
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSidebarUpload = (fileList) => {
    setTriggerUpload(fileList);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="spinner-lg"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />

      <Route path="/" element={
        isAuthenticated ? (
          <MainLayout
            storageInfo={storageInfo}
            handleUpload={handleSidebarUpload}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            user={{ ...user, isAdmin: user?.role === 'admin' }}
            toggleAdmin={logout} // Use logout for now as placeholder for account management
          />
        ) : (
          <Navigate to="/login" />
        )
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="my-drive/*" element={
          <Drive
            searchQuery={searchQuery}
            triggerUpload={triggerUpload}
            setTriggerUpload={setTriggerUpload}
            onUploadComplete={onUploadComplete}
            user={{ ...user, isAdmin: user?.role === 'admin' }}
          />
        } />
        <Route path="chat" element={<Chat />} />
      </Route>

      {/* Global Elements moved inside so they have access to state if needed */}
    </Routes>
  );
}

function App() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />

        {/* Global Upload Progress Toast - kept outside if it needs its own state or can be passed down */}
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

