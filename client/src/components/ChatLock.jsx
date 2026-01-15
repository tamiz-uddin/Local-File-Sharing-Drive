import React, { useState } from 'react';
import { Lock as LockIcon, Unlock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { fileAPI } from '../services/api';
import { message } from 'antd';

const ChatLock = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!pin) return;

        setLoading(true);
        setError('');
        try {
            const data = await fileAPI.verifyChatLock(pin);
            if (data.success) {
                onUnlock();
                message.success('Chat Unlocked');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#F8F9FA]">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-gray-100 flex flex-col items-center"
            >
                <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                    <LockIcon size={40} />
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-2">Chat is Locked</h2>
                <p className="text-gray-500 text-center mb-8">Enter your PIN to access the chat communities</p>

                <form onSubmit={handleSubmit} className="w-full space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600">
                            <AlertCircle size={18} />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    <div className="flex flex-col items-center">
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full text-center text-3xl tracking-[1em] py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-blue-400 transition-all font-mono"
                            placeholder="••••"
                            maxLength={4}
                            autoFocus
                        />
                        <p className="text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-widest">Enter 4-digit PIN</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || pin.length < 4}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:shadow-none"
                    >
                        {loading ? 'Verifying...' : (
                            <>
                                <Unlock size={20} />
                                Unlock Chat
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default ChatLock;
