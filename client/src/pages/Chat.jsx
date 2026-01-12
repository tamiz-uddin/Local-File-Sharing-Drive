import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageCircle, Clock, Hash, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, message, Input } from 'antd';
import { socket } from '../services/socket';
import { fileAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const { user } = useAuth();
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Request history instantly on mount
        socket.emit('get-chat-history');

        // Socket listeners
        socket.on('chat-history', (history) => {
            setMessages(history);
        });

        socket.on('chat-message', (msg) => {
            setMessages((prev) => [...prev, msg]);

            // Browser notification
            if (document.visibilityState !== 'visible' && msg.sender !== user?.ip && !msg.deleted) {
                if ('Notification' in window && Notification.permission === 'granted') {
                    const notification = new Notification(`Message from ${msg.senderName || msg.sender}`, {
                        body: msg.text,
                        icon: '/favicon.ico',
                        tag: 'chat-message', // Prevent duplicate notifications
                        renotify: true
                    });

                    notification.onclick = () => {
                        window.focus();
                        notification.close();
                    };
                }
            }
        });

        // Cleanup
        return () => {
            socket.off('chat-history');
            socket.off('chat-message');
        };
    }, [user?.ip]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        socket.emit('chat-message', {
            text: newMessage,
            senderName: user?.name || user?.username || 'Anonymous'
        });
        setNewMessage('');
        message.success('Message sent');
    };

    const handleDeleteMessage = (id) => {
        Modal.confirm({
            title: 'Delete Message',
            content: 'Are you sure you want to delete this message?',
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            centered: true,
            onOk() {
                socket.emit('delete-message', id);
                message.success('Message deleted');
            },
        });
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!user) return null;

    return (
        <div className="flex flex-col h-full bg-[#F8F9FA]">
            {/* Chat Header */}
            <header className="px-8 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                        <MessageCircle size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Community Chat</h2>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span>Live Discussion</span>
                        </div>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex flex-col items-end">
                        <span className="font-semibold text-gray-700">Your Identity</span>
                        <span>{user?.name || user?.username} ({user?.ip || 'Identifying...'})</span>
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
                <AnimatePresence initial={false}>
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                                <MessageCircle size={32} />
                            </div>
                            <p className="text-lg font-medium">No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderId ? msg.senderId === user?.id : msg.sender === user?.ip;
                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isMe ? 'text-blue-500' : 'text-gray-400'}`}>
                                                    {msg.senderName || 'Anonymous'} {msg.sender && `(${msg.sender})`} {isMe && '(You)'}
                                                </span>
                                                {msg.senderRole === 'admin' && (
                                                    <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-red-200">Admin</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                {formatTime(msg.timestamp)}
                                            </span>
                                        </div>
                                        <div className="relative group">
                                            <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm md:text-base ${msg.deleted
                                                ? 'bg-gray-100 text-gray-400 italic border border-gray-200'
                                                : isMe
                                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                                    : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                                                }`}>
                                                {msg.deleted ? (
                                                    <span className="flex items-center gap-2">
                                                        <Trash2 size={14} />
                                                        This message was deleted
                                                    </span>
                                                ) : msg.text}
                                            </div>
                                            {isMe && !msg.deleted && (
                                                <button
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-red-500"
                                                    title="Delete message"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 md:p-8 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto group">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message here..."
                        className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-gray-400 font-medium"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="absolute right-2 top-2 bottom-2 w-12 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                    >
                        <Send size={18} />
                    </button>
                </form>
                <p className="text-center mt-3 text-[10px] text-gray-400 font-medium tracking-wide uppercase">
                    Messages are broadcasted to all users on the network
                </p>
            </div>
        </div>
    );
};

export default Chat;
