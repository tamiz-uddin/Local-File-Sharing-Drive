
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Grid, List, ChevronRight, Upload, X, ArrowLeft, FolderPlus, Cloud } from 'lucide-react';
import { fileAPI } from '../services/api';
import FileCard from '../components/FileCard';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

// Simple icon component for the overlay
const CloudArrowUp = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12v9" /><path d="m16 16-4-4-4 4" /></svg>
);

const Drive = ({ searchQuery, triggerUpload, setTriggerUpload, onUploadComplete }) => {
    const { '*': pathParam } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    // Parse current path from URL wildcard
    const currentPath = pathParam ? pathParam.split('/') : [];

    // State
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [dragActive, setDragActive] = useState(false);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [previewFile, setPreviewFile] = useState(null);

    // Load files when path changes
    useEffect(() => {
        loadFiles();
    }, [pathParam]);

    // Socket Listener for Real-time Updates
    useEffect(() => {
        const handleFileChange = (data) => {
            const currentPathStr = currentPath.join('/');
            // If the change happened in the folder we are currently viewing
            if (data.path === currentPathStr) {
                console.log('Real-time update detected:', data);
                loadFiles();
            }
        };

        socket.on('file_change', handleFileChange);

        return () => {
            socket.off('file_change', handleFileChange);
        };
    }, [pathParam, currentPath]); // Re-bind if path changes but pathParam covers it

    // Handle external upload trigger (from Sidebar)
    useEffect(() => {
        if (triggerUpload) {
            const filesToUpload = triggerUpload;
            setTriggerUpload(null); // Clear first to prevent re-triggering during upload
            handleUpload(filesToUpload);
        }
    }, [triggerUpload]);

    const loadFiles = async () => {
        setIsLoading(true);
        try {
            const pathStr = currentPath.join('/');
            const response = await fileAPI.getFiles(pathStr);
            if (response.success) setFiles(response.files);
        } catch (error) {
            console.error('Failed to load files', error);
            // Optionally redirect to root if 404
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (fileList) => {
        try {
            const pathStr = currentPath.join('/');
            // Notify parent to show progress (we'll implement this via callback prop)
            await onUploadComplete(fileList, pathStr, async () => {
                await loadFiles();
            });
        } catch (error) {
            console.error('Upload failed', error);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleUpload(e.dataTransfer.files);
        }
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            const pathStr = currentPath.join('/');
            await fileAPI.createFolder(newFolderName, pathStr);
            setNewFolderName('');
            setShowNewFolderInput(false);
            loadFiles();
        } catch (error) {
            console.error('Failed to create folder', error);
            alert('Failed to create folder');
        }
    };

    // Navigation Logic
    const handleNavigate = (folderName) => {
        const newPath = [...currentPath, folderName].join('/');
        navigate(`/my-drive/${newPath}`);
    };

    const navigateToBreadcrumb = (index) => {
        // If index is -1, it means Root (My Drive)
        if (index === -1) {
            navigate('/my-drive');
            return;
        }
        const newPath = currentPath.slice(0, index + 1).join('/');
        navigate(`/my-drive/${newPath}`);
    };

    const handleFileAction = {
        download: (id) => {
            fileAPI.downloadFile(id);
        },
        delete: async (id) => {
            const file = files.find(f => f.id === id);
            if (confirm(`Are you sure you want to delete "${file?.name || 'this file'}"?`)) {
                await fileAPI.deleteFile(id);
                loadFiles();
            }
        },
        rename: async (id, newName) => {
            await fileAPI.renameFile(id, newName);
            loadFiles();
        },
        preview: (file) => {
            setPreviewFile(file);
        }
    };

    const filteredFiles = files.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col" onDragEnter={handleDrag}>
            {/* Toolbar & Breadcrumbs */}
            <div className="flex flex-col gap-4 mb-6 p-5">
                {/* Top Bar: Title & Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {currentPath.length > 0 ? (
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                                <ArrowLeft size={20} />
                            </button>
                        ) : (
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Cloud size={20} />
                            </div>
                        )}
                        <h1 className="text-2xl font-bold text-gray-800">
                            {currentPath.length > 0 ? decodeURIComponent(currentPath[currentPath.length - 1]) : 'My Drive'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowNewFolderInput(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                        >
                            <FolderPlus size={18} />
                            <span>New Folder</span>
                        </button>

                        <div className="bg-gray-100 p-1 rounded-lg flex items-center border border-gray-200">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Grid size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Breadcrumbs Path */}
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                    <button
                        onClick={() => navigateToBreadcrumb(-1)}
                        className={`hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors ${currentPath.length === 0 ? 'font-semibold text-blue-600' : ''}`}
                    >
                        Home
                    </button>
                    {currentPath.map((folder, index) => (
                        <React.Fragment key={index}>
                            <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                            <button
                                onClick={() => navigateToBreadcrumb(index)}
                                className={`hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors whitespace-nowrap ${index === currentPath.length - 1 ? 'font-semibold text-blue-600' : ''}`}
                            >
                                {decodeURIComponent(folder)}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* New Folder Input Modal */}
            {showNewFolderInput && (
                <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
                    <form onSubmit={handleCreateFolder} className="bg-white p-6 rounded-xl shadow-xl w-80 animate-scale-in">
                        <h3 className="text-lg font-medium mb-4">New Folder</h3>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Folder name"
                            autoFocus
                            className="w-full border border-blue-500 rounded px-3 py-2 mb-4 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowNewFolderInput(false)} className="px-4 py-2 text-sm hover:bg-gray-100 rounded text-gray-600">Cancel</button>
                            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-auto relative rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 p-5 md:p-4 min-h-[500px]" onDragOver={handleDrag}>
                {isLoading && (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {!isLoading && filteredFiles.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-2/3 text-secondaryText">
                        <div className="w-48 h-48 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Upload size={64} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl text-onSurface mb-2">Drag files here to upload</h3>
                        <p>Or use the "New" button in the sidebar</p>
                    </div>
                )}

                {!isLoading && filteredFiles.length > 0 && (
                    <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-10" : "flex flex-col pb-10"}>
                        {filteredFiles.map((file, idx) => (
                            <FileCard
                                key={idx}
                                file={file}
                                currentPath={currentPath.join('/')}
                                viewMode={viewMode}
                                user={user}
                                onDownload={handleFileAction.download}
                                onDelete={handleFileAction.delete}
                                onRename={handleFileAction.rename}
                                onNavigate={handleNavigate}
                                onPreview={handleFileAction.preview}
                            />
                        ))}
                    </div>
                )}

                {/* Upload Drag Overlay */}
                {dragActive && (
                    <div
                        className="absolute inset-0 bg-blue-50/90 z-40 flex items-center justify-center rounded-lg border-2 border-blue-400 border-dashed"
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <div className="text-center pointer-events-none animate-scale-in">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CloudArrowUp size={40} className="text-blue-600" />
                            </div>
                            <h2 className="text-xl font-medium text-blue-900">Drop to upload to <br /> {currentPath.length ? currentPath[currentPath.length - 1] : 'My Drive'}</h2>
                        </div>
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewFile(null)}>
                    <button className="absolute top-4 right-4 text-white hover:text-gray-300">
                        <X size={32} />
                    </button>
                    <img
                        src={fileAPI.getPreviewUrl(previewFile.systemName || previewFile.name, currentPath.join('/'))}
                        alt={previewFile.name}
                        className="max-w-full max-h-[85vh] object-contain rounded-md"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="mt-4 text-white font-medium text-lg">{previewFile.name}</div>
                </div>
            )}
        </div>
    );
};

export default Drive;
