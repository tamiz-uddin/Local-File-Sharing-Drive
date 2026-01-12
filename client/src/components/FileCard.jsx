import React, { useState } from 'react';
import {
    File,
    FileText,
    FileImage,
    FileVideo,
    FileAudio,
    FileArchive,
    MoreVertical,
    Download,
    Trash2,
    Edit2,
    Folder,
    FileCode,
    FileSpreadsheet,
    Play
} from 'lucide-react';
import { fileAPI } from '../services/api';

// --- Icon & Color Helpers ---
const getFileDesign = (fileType) => {
    const type = fileType.toLowerCase();

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(type)) {
        return { icon: FileImage, color: 'text-purple-600', bg: 'bg-purple-100', label: 'IMG' };
    }
    // Video
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(type)) {
        return { icon: FileVideo, color: 'text-red-600', bg: 'bg-red-100', label: 'VID' };
    }
    // Audio
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(type)) {
        return { icon: FileAudio, color: 'text-pink-600', bg: 'bg-pink-100', label: 'AUD' };
    }
    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(type)) {
        return { icon: FileArchive, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'ZIP' };
    }
    // Documents
    if (['pdf'].includes(type)) {
        return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50', label: 'PDF' };
    }
    if (['doc', 'docx', 'odt'].includes(type)) {
        return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100', label: 'DOC' };
    }
    if (['xls', 'xlsx', 'csv'].includes(type)) {
        return { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-100', label: 'XLS' };
    }
    // Code
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp'].includes(type)) {
        return { icon: FileCode, color: 'text-slate-700', bg: 'bg-slate-100', label: 'CODE' };
    }

    return { icon: File, color: 'text-gray-500', bg: 'bg-gray-100', label: 'FILE' };
};

const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const FileCard = ({ file, currentPath = '', viewMode, user, onDownload, onDelete, onRename, onNavigate, onPreview }) => {

    const [showMenu, setShowMenu] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(file.name);

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClick = () => setShowMenu(false);
        if (showMenu) document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [showMenu]);

    const handleMenuClick = (e) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    const handleRenameSubmit = async (e) => {
        if (e.key === 'Enter') {
            if (newName && newName !== file.name) {
                await onRename(file.name, newName);
            }
            setIsRenaming(false);
        }
    };

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(file.type.toLowerCase());
    const isFolder = file.isDirectory;
    const { icon: FileIcon, color, bg } = getFileDesign(file.type);

    // Permission Check
    const canEdit = user?.isAdmin || file.ownerIp === user?.ip;
    // console.log(`[FileCard] File: ${file.name}, UserIP: ${user?.ip}, OwnerIP: ${file.ownerIp}, CanEdit: ${canEdit}`);
    const canDownload = file?.isDirectory ? false : true;
    const handleDoubleClick = () => {
        if (isFolder) {
            onNavigate(file.name);
        } else if (isImage) {
            onPreview(file);
        }
    };

    // --- Dropdown Menu Component ---
    const ActionMenu = () => {

        return <div className="absolute right-2 top-8 z-30 w-48 bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl py-2 border border-white/40 animate-scale-in origin-top-right">
            {isImage && (
                <button onClick={() => onPreview(file)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-black/5 flex items-center gap-3 transition-colors">
                    <FileImage className="w-4 h-4 text-purple-600" /> Preview
                </button>
            )}
            {
                canDownload && (
                    <button onClick={() => onDownload(file.name)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-black/5 flex items-center gap-3 transition-colors">
                        <Download className="w-4 h-4 text-blue-600" /> Download
                    </button>
                )
            }

            {canEdit && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-black/5 flex items-center gap-3 transition-colors">
                        <Edit2 className="w-4 h-4 text-orange-600" /> Rename
                    </button>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button onClick={() => onDelete(file.name)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </>
            )}
        </div>
    };

    // --- List View ---
    if (viewMode === 'list') {
        return (
            <div
                className="group relative flex items-center gap-4 px-4 py-3 bg-white rounded-xl hover:shadow-sm border border-transparent hover:border-gray-100 transition-all duration-200 cursor-pointer select-none mb-2"
                onDoubleClick={handleDoubleClick}
            >
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isFolder ? 'bg-blue-50 text-blue-600' : bg + ' ' + color}`}>
                    {isFolder ? <Folder size={20} fill="currentColor" className="opacity-80" /> : <FileIcon size={20} />}
                </div>

                <div className="flex-1 min-w-0 pr-4">
                    {isRenaming ? (
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleRenameSubmit}
                            onBlur={() => setIsRenaming(false)}
                            className="w-full bg-white border-2 border-blue-500 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-800 truncate">{file.name}</span>
                            <span className="text-[11px] text-gray-400 capitalize">{isFolder ? 'Folder' : file.type + ' file'}</span>
                        </div>
                    )}
                </div>

                <div className="w-32 text-xs text-gray-500 hidden sm:block font-medium">
                    {formatDate(file.createdDate)}
                </div>

                <div className="w-24 text-xs text-gray-500 text-right hidden sm:block font-mono bg-gray-50 px-2 py-1 rounded-md">
                    {isFolder ? '--' : formatSize(file.size)}
                </div>

                <div className="relative"
                    style={{
                        display: canEdit || canDownload ? 'block' : 'none'
                    }}
                >
                    <button onClick={handleMenuClick} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                    {showMenu && <ActionMenu />}
                </div>
            </div>
        );
    }

    // --- Grid View ---
    return (
        <div
            className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex flex-col select-none h-[220px]"
            onDoubleClick={handleDoubleClick}
        >
            {/* Preview Section */}
            <div className={`h-36 relative flex items-center justify-center w-full rounded-t-2xl ${isFolder ? 'bg-blue-50/50' : 'bg-gray-50/50'}`}>
                {/* Image Preview */}
                {isImage ? (
                    <img
                        src={fileAPI.getPreviewUrl(file.name, currentPath)}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100 rounded-t-2xl"
                        onError={(e) => { e.target.style.display = 'none' }}
                    />
                ) : null}

                {/* Centered Icon (Visible if not image or image failed) */}
                <div className={`absolute inset-0 flex items-center justify-center ${isImage ? 'hidden' : ''}`}>
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm ${isFolder ? 'bg-blue-100 text-blue-600' : bg + ' ' + color}`}>
                        {isFolder ? (
                            <Folder size={40} fill="currentColor" className="opacity-90" />
                        ) : (
                            <FileIcon size={40} strokeWidth={1.5} />
                        )}
                    </div>
                </div>

                {/* Hover Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl"></div>
            </div>

            {/* Footer / Info */}
            <div className="p-4 flex items-center gap-3 bg-white flex-1 relative rounded-b-2xl">
                <div className={`p-2 rounded-lg ${isFolder ? 'bg-blue-50 text-blue-600' : bg + ' ' + color}`}>
                    {isFolder ? <Folder size={18} fill="currentColor" /> : <FileIcon size={18} />}
                </div>

                <div className="flex-1 min-w-0">
                    {isRenaming ? (
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleRenameSubmit}
                            onBlur={() => setIsRenaming(false)}
                            className="w-full bg-white border border-blue-500 rounded px-1 py-0.5 text-sm focus:outline-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div className="flex flex-col">
                            <p className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors" title={file.name}>
                                {file.name}
                            </p>
                            <span className="text-[10px] text-gray-400 font-medium">
                                {isFolder ? formatDate(file.createdDate) : formatSize(file.size)}
                            </span>
                        </div>
                    )}
                </div>

                {/* More Button */}
                <button
                    onClick={handleMenuClick}
                    className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                >
                    <MoreVertical size={18} />
                </button>
                {showMenu && <ActionMenu />}
            </div>
        </div>
    );
};

export default FileCard;
