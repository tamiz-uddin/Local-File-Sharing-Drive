import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Check, File } from 'lucide-react';
import MainLayout from './layouts/MainLayout';
import Drive from './pages/Drive';
import Dashboard from './pages/Dashboard';
import { fileAPI } from './services/api';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [triggerUpload, setTriggerUpload] = useState(null); // To trigger upload from sidebar
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0, free: 0 });
  const [user, setUser] = useState({ ip: '', isAdmin: false });

  // Load storage info and identity globally
  useEffect(() => {
    loadStorageInfo();
    loadIdentity();
  }, []);

  const loadIdentity = async () => {
    try {
      const data = await fileAPI.getIdentity();
      setUser(data);
    } catch (error) {
      console.error("Failed to load identity", error);
    }
  };

  const toggleAdmin = () => {
    if (user.isAdmin) {
      localStorage.removeItem('adminAuth');
      loadIdentity();
    } else {
      const password = prompt("Enter Admin Password:");
      if (password === 'admin') {
        localStorage.setItem('adminAuth', 'admin');
        loadIdentity();
      } else if (password) {
        alert("Incorrect Password");
      }
    }
  };

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
      await refreshCallback(); // Refresh the file list in the active view
      loadStorageInfo(); // Update storage
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <MainLayout
            storageInfo={storageInfo}
            handleUpload={handleSidebarUpload}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            user={user}
            toggleAdmin={toggleAdmin}
          />
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="my-drive/*" element={
            <Drive
              searchQuery={searchQuery}
              triggerUpload={triggerUpload}
              setTriggerUpload={setTriggerUpload}
              onUploadComplete={onUploadComplete}
              user={user}
            />
          } />
        </Route>
      </Routes>

      {/* Global Upload Progress Toast */}
      {isUploading && (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-floating w-80 overflow-hidden z-50 border border-gray-100">
          <div className="bg-[#323232] px-4 py-3 flex items-center justify-between text-white">
            <span className="text-sm font-medium">Uploading {uploadProgress < 100 ? '...' : 'Complete'}</span>
            {uploadProgress === 100 ? <Check size={18} /> : <div className="spinner-sm"></div>}
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <File size={20} className="text-blue-500" />
              <div className="flex-1">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
