import React, { useState } from 'react';
import { HardDrive, Plus, HelpCircle, Search, Settings, LayoutDashboard, Menu, X } from 'lucide-react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const MainLayout = ({
    storageInfo,
    handleUpload,
    searchQuery,
    setSearchQuery,
    user,
    toggleAdmin
}) => {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Check if we are in Drive view
    const isDriveActive = location.pathname.startsWith('/my-drive');

    const sidebarVariants = {
        hidden: { x: -300, opacity: 0 },
        visible: { x: 0, opacity: 1 },
    };

    return (
        <div className="flex h-screen bg-[#F0F2F5] font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Mobile Menu Backdrop */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                className={`w-72 bg-white/80 backdrop-blur-xl border-r border-white/50 p-6 flex flex-col gap-8 fixed md:relative z-50 h-full shadow-2xl md:shadow-none transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
                initial={false}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-200">
                        <HardDrive size={22} />
                    </div>
                    <div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">L-Drive</span>
                        <span className="text-[10px] block text-blue-600 font-semibold tracking-wider">NEXTGEN</span>
                    </div>
                    <button className="md:hidden ml-auto text-gray-500" onClick={() => setIsMobileMenuOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                {/* New Button */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                    <label className="relative flex items-center justify-center gap-3 w-full bg-white hover:bg-blue-50/50 text-blue-700 font-semibold py-3.5 px-4 rounded-2xl shadow-sm border border-blue-100 cursor-pointer transition-all active:scale-[0.98]">
                        <Plus className="w-5 h-5 bg-blue-100 rounded-full p-0.5" />
                        <span>New File Upload</span>
                        <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                    </label>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2 flex-1">
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Menu</p>

                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                    >
                        <LayoutDashboard size={20} />
                        <span className="font-medium">Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/my-drive"
                        className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive || isDriveActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                    >
                        <HardDrive size={20} />
                        <span className="font-medium">My Drive</span>
                    </NavLink>
                </nav>

                {/* Storage Widget */}
                <div className="bg-white/60 p-5 rounded-2xl border border-white/60 shadow-sm relative overflow-hidden">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Storage Status</h3>
                    <div className="w-full bg-gray-100 h-2 rounded-full mb-3 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${storageInfo.total > 0 ? (storageInfo.used / storageInfo.total) * 100 : 0}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                        />
                    </div>
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-2xl font-bold text-gray-800 leading-none">{((storageInfo.used / 1024 / 1024 / 1024).toFixed(1))} <span className="text-xs text-gray-500 font-normal">GB</span></p>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">{((storageInfo.total / 1024 / 1024 / 1024).toFixed(0))} GB Total</p>
                    </div>

                    {/* User Identity Widget */}
                    <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                                <p>IP: {user?.ip || 'Loading...'}</p>
                                {user?.isAdmin ? <span className="text-green-600 font-bold">Admin Mode</span> : <span className="text-gray-400">Guest</span>}
                            </div>
                            <button
                                onClick={toggleAdmin}
                                className={`text-xs px-2 py-1 rounded transition-colors ${user?.isAdmin ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                            >
                                {user?.isAdmin ? 'Logout' : 'Admin'}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">

                {/* Header */}
                <header className="h-20 flex items-center justify-between px-6 md:px-10 z-10 sticky top-0 md:relative">
                    <button className="md:hidden text-gray-600 bg-white/50 p-2 rounded-lg" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu size={24} />
                    </button>

                    {/* Search Bar - hidden on mobile for simplicity in this artifact, but logic exists */}
                    <div className="search-bar hidden md:flex w-96 bg-white/70 backdrop-blur-md border border-white shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all rounded-2xl px-4 py-2.5">
                        <Search className="text-gray-400 w-5 h-5 mr-3" />
                        <input
                            type="text"
                            placeholder="Search files, folders..."
                            className="bg-transparent border-none outline-none flex-1 text-gray-700 placeholder:text-gray-400 font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className="hover:bg-gray-100 p-1 rounded-md transition-colors"><Settings className="w-4 h-4 text-gray-400" /></button>
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                        <button className="bg-white/70 p-2.5 rounded-full text-gray-500 hover:text-blue-600 hover:bg-white shadow-sm transition-all border border-transparent hover:border-blue-100">
                            <HelpCircle className="w-5 h-5" />
                        </button>
                        <div className="h-10 w-10 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white cursor-pointer hover:scale-105 transition-transform">
                            U
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden relative rounded-tl-3xl bg-white shadow-2xl shadow-blue-900/5">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
