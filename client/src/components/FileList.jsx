import React, { useState, useEffect } from 'react';
import { Grid, List, RefreshCw, Search, Folder } from 'lucide-react';
import FileCard from './FileCard';

const FileList = ({ files, onDownload, onDelete, onRename, onRefresh, isLoading }) => {
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredFiles, setFilteredFiles] = useState(files);

    useEffect(() => {
        if (searchQuery) {
            setFilteredFiles(
                files.filter((file) =>
                    file.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredFiles(files);
        }
    }, [searchQuery, files]);

    return (
        <div className="space-y-4">
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-gray-300">
                    <Folder className="w-5 h-5" />
                    <span className="font-semibold">
                        {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
                    </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 glass pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>

                    {/* View mode toggle */}
                    <div className="glass rounded-lg p-1 flex gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-500/30 text-blue-400' : 'text-gray-400 hover:text-white'
                                }`}
                            title="Grid View"
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-500/30 text-blue-400' : 'text-gray-400 hover:text-white'
                                }`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Refresh button */}
                    <button
                        onClick={onRefresh}
                        className={`btn-secondary ${isLoading ? 'opacity-50' : ''}`}
                        disabled={isLoading}
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* File grid/list */}
            {filteredFiles.length === 0 ? (
                <div className="card text-center py-12">
                    <Folder className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold mb-2">
                        {searchQuery ? 'No files found' : 'No files yet'}
                    </h3>
                    <p className="text-gray-400">
                        {searchQuery
                            ? 'Try a different search term'
                            : 'Upload some files to get started'}
                    </p>
                </div>
            ) : (
                <div
                    className={
                        viewMode === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                            : 'space-y-3'
                    }
                >
                    {filteredFiles.map((file, index) => (
                        <FileCard
                            key={`${file.name}-${index}`}
                            file={file}
                            onDownload={onDownload}
                            onDelete={onDelete}
                            onRename={onRename}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileList;
