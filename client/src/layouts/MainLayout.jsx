import React, { useState } from 'react';
import { HardDrive, Plus, HelpCircle, Search, Settings, LayoutDashboard, Menu, X, MessageCircle, CloudCog, LogOut, LogIn, Shield, Lock } from 'lucide-react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, Input, message } from 'antd';
import { useAuth } from '../context/AuthContext';
import { fileAPI } from '../services/api';

const MainLayout = ({
    storageInfo,
    handleUpload,
    searchQuery,
    setSearchQuery
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { user, logout, login, setIsLocalAdmin } = useAuth();
    // Check if we are in Drive view
    const isDriveActive = location.pathname.startsWith('/my-drive');

    const handleAdminLogin = async () => {
        const ADMIN_ACCESS_PASS = 'admin123'; // Constant password as requested

        if (adminPassword === ADMIN_ACCESS_PASS) {
            setIsLocalAdmin(true);
            message.success('Admin access granted');
            setIsAdminModalOpen(false);
            setAdminPassword('');
            navigate('/dashboard');
        } else {
            message.error('Invalid admin password');
        }
    };

    const sidebarVariants = {
        hidden: { x: -300, opacity: 0 },
        visible: { x: 0, opacity: 1 },
    };

    return (
        <div className="flex h-screen bg-[#F0F2F5] font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Admin Password Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <Shield className="text-blue-600" size={20} />
                        <span>Admin Access</span>
                    </div>
                }
                open={isAdminModalOpen}
                onOk={handleAdminLogin}
                onCancel={() => setIsAdminModalOpen(false)}
                okText="Unlock Admin"
                confirmLoading={loading}
                centered
            >
                <div className="py-4">
                    <p className="text-sm text-gray-500 mb-4">Enter the administrative password to gain full control.</p>
                    <Input.Password
                        placeholder="Enter admin password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        onPressEnter={handleAdminLogin}
                        prefix={<Lock size={16} className="text-gray-400" />}
                        autoFocus
                    />
                </div>
            </Modal>

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
                        <img src="/kodevio.png" alt="logo" width={50} />
                    </div>
                    <div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">K-Drive</span>
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
                    {/* 
                    <NavLink
                        to="/chat"
                        className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                    >
                        <MessageCircle size={20} />
                        <span className="font-medium">Chat</span>
                    </NavLink> */}
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
                            <div className="text-xs text-gray-500 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="font-semibold text-gray-700 truncate">
                                        {user?.role === 'guest' ? 'Guest Access' : `User: ${user?.username || 'Loading...'}`}
                                    </p>
                                    {user?.role !== 'admin' && (
                                        <button
                                            onClick={() => setIsAdminModalOpen(true)}
                                            className="text-gray-300 hover:text-blue-500 transition-colors flex-shrink-0"
                                            title="Login as Admin"
                                        >
                                            <Shield size={12} />
                                        </button>
                                    )}
                                </div>
                                {user?.role === 'admin' ? (
                                    <span className="text-green-600 font-bold text-[10px]">Admin Mode</span>
                                ) : user?.role === 'guest' ? (
                                    <span className="text-gray-400 font-medium text-[10px] truncate">{user?.ip}</span>
                                ) : (
                                    <span className="text-blue-600 font-medium capitalize text-[10px]">{user?.role || 'User'}</span>
                                )}
                            </div>
                            {user?.role === 'guest' ? (
                                <NavLink
                                    to="/login"
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Login"
                                >
                                    <LogIn size={18} />
                                </NavLink>
                            ) : (
                                <button
                                    onClick={logout}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Logout"
                                >
                                    <LogOut size={18} />
                                </button>
                            )}
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
