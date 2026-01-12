import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, HardDrive, File, TrendingUp } from 'lucide-react';
import { fileAPI } from '../services/api';
import { socket } from '../services/socket';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const data = await fileAPI.getDashboardStats();
            if (data.success) {
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to load dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();

        // Real-time listener
        const handleDashboardUpdate = (data) => {
            console.log("Dashboard update received", data);
            setStats(data);
        };

        socket.on('dashboard_update', handleDashboardUpdate);

        return () => {
            socket.off('dashboard_update', handleDashboardUpdate);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!stats) return null;

    // Prepare chart data
    const pieData = [
        { name: 'Used', value: stats.storage.used },
        { name: 'Free', value: stats.storage.free },
    ];

    const barData = Object.entries(stats.typeDist).map(([name, value]) => ({
        name: name.toUpperCase(),
        count: value
    })).slice(0, 7); // Top 7 types

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const types = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + types[i];
    };

    return (
        <div className="p-4 md:p-8 overflow-y-auto h-full space-y-8 bg-gray-50/50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
                <p className="text-gray-500">Overview of your storage and activity</p>
            </motion.div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-orange-50/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <HardDrive size={24} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-700">Storage Used</h3>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{formatBytes(stats.storage.used)}</p>
                        <p className="text-sm text-gray-500 mt-1">of {formatBytes(stats.storage.total)} Total</p>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-purple-50/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <File size={24} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-700">Total Files</h3>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalFiles}</p>
                        <p className="text-sm text-gray-500 mt-1">Files tracked</p>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-green-50/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                <TrendingUp size={24} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-700">Total Size</h3>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{formatBytes(stats.totalSize)}</p>
                        <p className="text-sm text-gray-500 mt-1">Tracked data</p>
                    </div>
                </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Storage Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Storage Distribution</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell key="cell-used" fill="#3B82F6" />
                                    <Cell key="cell-free" fill="#E5E7EB" />
                                </Pie>
                                <Tooltip formatter={(value) => formatBytes(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-sm text-gray-600">Used</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                                <span className="text-sm text-gray-600">Free</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* File Types */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">File Types</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Recent Uploads */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            >
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Uploads</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 text-sm text-gray-500">
                                <th className="pb-3 font-medium">Name</th>
                                <th className="pb-3 font-medium">Type</th>
                                <th className="pb-3 font-medium">Size</th>
                                <th className="pb-3 font-medium">Date</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {stats.recent.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-gray-400">No recent activity</td>
                                </tr>
                            ) : (
                                stats.recent.map((file, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3 pr-4 font-medium text-gray-700 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                                                <File size={16} />
                                            </div>
                                            {file.name}
                                        </td>
                                        <td className="py-3 text-gray-500 uppercase">{file.type}</td>
                                        <td className="py-3 text-gray-500">{formatBytes(file.size)}</td>
                                        <td className="py-3 text-gray-500 flex items-center gap-1">
                                            <Clock size={14} />
                                            {new Date(file.uploadedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default Dashboard;
