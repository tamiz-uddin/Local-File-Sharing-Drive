import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageCircle, Clock, Hash, Trash2, Lock as LockIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, message, Input } from 'antd';
import { socket } from '../services/socket';
import { fileAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChatLock from '../components/ChatLock';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [communities, setCommunities] = useState([]);
    const [activeCommunity, setActiveCommunity] = useState('general');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
    const [newCommName, setNewCommName] = useState('');
    const [isLocked, setIsLocked] = useState(true);
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);
    const [lockPin, setLockPin] = useState('');

    const [modal, contextHolder] = Modal.useModal();

    const { user } = useAuth();
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Initial join and fetch
        socket.emit('join-community', activeCommunity);
        socket.emit('get-communities');

        // Socket listeners
        socket.on('community-list', (list) => {
            setCommunities(list);
        });

        socket.on('chat-history', (history) => {
            setMessages(history);
        });

        socket.on('chat-message', (msg) => {
            // Only add if it's for the current community
            if (msg.communityId === activeCommunity || (!msg.communityId && activeCommunity === 'general')) {
                setMessages((prev) => [...prev, msg]);
            }

            // Browser notification
            if (document.visibilityState !== 'visible' && msg.sender !== user?.ip && !msg.deleted) {
                if ('Notification' in window && Notification.permission === 'granted') {
                    const notification = new Notification(`[${activeCommunity}] ${msg.senderName || msg.sender}`, {
                        body: msg.text,
                        icon: '/favicon.ico',
                        tag: 'chat-message',
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
            socket.off('community-list');
            socket.off('chat-history');
            socket.off('chat-message');
        };
    }, [activeCommunity, user?.ip]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        socket.emit('chat-message', {
            text: newMessage,
            communityId: activeCommunity,
            senderName: user?.name || user?.username || 'Anonymous'
        });
        setNewMessage('');
    };

    const handleCreateCommunity = () => {
        if (!newCommName.trim()) return;
        socket.emit('create-community', { name: newCommName });
        setNewCommName('');
        setIsCreateModalOpen(false);
        message.success('Community created!');
    };

    const handleJoinRequest = (communityId) => {
        socket.emit('request-join', communityId);
        message.loading('Sending join request...', 1);
    };

    const handleReviewRequest = (communityId, userId, action) => {
        socket.emit('review-join-request', { communityId, userId, action });
        message.success(`Request ${action === 'approve' ? 'approved' : 'rejected'}`);
    };

    const handleDeleteCommunity = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('handleDeleteCommunity called for:', id);
        modal.confirm({
            title: 'Delete Community',
            content: 'This will delete all messages in this community. Are you sure?',
            okText: 'Delete',
            okType: 'danger',
            onOk() {
                console.log('Confirming deletion for:', id);
                socket.emit('delete-community', id);
                if (activeCommunity === id) setActiveCommunity('general');
                message.success('Community deleted');
            }
        });
    };

    const handleDeleteMessage = (id) => {
        modal.confirm({
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

    const handleSetLock = async () => {
        try {
            await fileAPI.setChatLock(lockPin);
            message.success(lockPin ? 'Chat lock enabled' : 'Chat lock disabled');
            setIsLockModalOpen(false);
            setLockPin('');
            // Optional: Refresh user data to update hasChatLock
            window.location.reload();
        } catch (err) {
            message.error('Failed to update chat lock');
        }
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!user) return (
        <div className="flex-1 flex items-center justify-center bg-[#F8F9FA]">
            <div className="spinner-lg"></div>
        </div>
    );

    if (user.hasChatLock && isLocked) {
        return <ChatLock onUnlock={() => setIsLocked(false)} />;
    }

    const currentComm = communities.find(c => c.id === activeCommunity) || communities[0];
    const isMember = currentComm?.members?.includes(user?.id) || (activeCommunity === 'general' && user?.role === 'guest') || (activeCommunity === 'general' && user?.id);
    const isPending = currentComm?.pendingRequests?.some(r => r.id === user?.id);
    const isAdminOfComm = user?.role === 'admin' || user?.id === currentComm?.creatorId;
    const pendingCount = currentComm?.pendingRequests?.length || 0;
    return null;
    return (
        <div className="flex h-full bg-[#F8F9FA] overflow-hidden">
            {contextHolder}
            {/* Sidebar */}
            <aside className="w-64 md:w-80 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Hash size={18} className="text-blue-500" />
                        Communities
                    </h3>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                        title="New Community"
                    >
                        +
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {communities.map(comm => (
                        <div
                            key={comm.id}
                            onClick={() => setActiveCommunity(comm.id)}
                            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeCommunity === comm.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                : 'hover:bg-gray-50 text-gray-600'
                                }`}
                        >
                            <div className="flex items-center gap-3 truncate">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeCommunity === comm.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                                    <Hash size={16} />
                                </div>
                                <span className="font-semibold truncate">{comm.name}</span>
                            </div>
                            {(user?.role === 'admin' || user?.id === comm.creatorId) && comm.id !== 'general' && (
                                <button
                                    onClick={(e) => handleDeleteCommunity(e, comm.id)}
                                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${activeCommunity === comm.id ? 'hover:bg-white/20' : 'hover:bg-red-50 hover:text-red-500'
                                        }`}
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-gray-800 truncate">{user?.name || user?.username}</span>
                            <span className="text-[10px] text-gray-500 truncate">{user?.ip}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsLockModalOpen(true)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-colors"
                    >
                        <LockIcon size={14} />
                        {user.hasChatLock ? 'Change Lock' : 'Enable Lock'}
                    </button>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Chat Header */}
                <header className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                            <Hash size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 truncate">{currentComm?.name || 'Loading...'}</h2>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                <span className={`w-1.5 h-1.5 rounded-full ${isMember ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                {isMember ? 'Joined Member' : isPending ? 'Request Pending' : 'Restricted Community'}
                            </div>
                        </div>
                    </div>
                    {isAdminOfComm && pendingCount > 0 && (
                        <button
                            onClick={() => setIsRequestsModalOpen(true)}
                            className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-100 transition-colors"
                        >
                            <User size={14} />
                            {pendingCount} Join Requests
                        </button>
                    )}
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <AnimatePresence initial={false}>
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-60">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                    <MessageCircle size={24} />
                                </div>
                                <p className="text-sm font-medium italic">No messages in this community yet.</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderId ? msg.senderId === user?.id : msg.sender === user?.ip;
                                return (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isMe ? 'text-blue-500' : 'text-gray-400'}`}>
                                                        {msg.senderName || 'Anonymous'} {isMe && '(You)'}
                                                    </span>
                                                    {msg.senderRole === 'admin' && (
                                                        <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase border border-red-200">Admin</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {formatTime(msg.timestamp)}
                                                </span>
                                            </div>
                                            <div className="relative group">
                                                <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm ${msg.deleted
                                                    ? 'bg-gray-100 text-gray-400 italic border border-gray-200'
                                                    : isMe
                                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                                        : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                                                    }`}>
                                                    {msg.deleted ? (
                                                        <span className="flex items-center gap-2">
                                                            <Trash2 size={12} />
                                                            Message deleted
                                                        </span>
                                                    ) : msg.text}
                                                </div>
                                                {(isMe || user?.role === 'admin') && !msg.deleted && (
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all p-2 text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 size={14} />
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

                <div className="p-4 md:p-6 bg-white border-t border-gray-100">
                    {isMember ? (
                        <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto flex gap-3">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={`Message #${currentComm?.name || 'community'}...`}
                                className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-200"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    ) : (
                        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-4 px-6 bg-blue-50/50 rounded-2xl border border-blue-100 border-dashed">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm">
                                    <Hash size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-gray-800">Membership Required</p>
                                    <p className="text-[10px] text-gray-500">You must be a member to chat in this community.</p>
                                </div>
                            </div>
                            {isPending ? (
                                <button
                                    disabled
                                    className="w-full py-3 bg-gray-100 text-gray-400 rounded-xl text-sm font-bold border border-gray-200"
                                >
                                    Join Request Pending Approval
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleJoinRequest(activeCommunity)}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
                                >
                                    Request to Join Community
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Community Modal */}
            <Modal
                title="Create New Community"
                open={isCreateModalOpen}
                onOk={handleCreateCommunity}
                onCancel={() => setIsCreateModalOpen(false)}
                okText="Create"
                centered
            >
                <div className="py-4">
                    <p className="text-sm text-gray-500 mb-2">Community Name</p>
                    <Input
                        placeholder="e.g. Developers, General, Movies"
                        value={newCommName}
                        onChange={e => setNewCommName(e.target.value)}
                        onPressEnter={handleCreateCommunity}
                        autoFocus
                    />
                </div>
            </Modal>

            {/* Join Requests Modal */}
            <Modal
                title={`Join Requests - ${currentComm?.name}`}
                open={isRequestsModalOpen}
                onCancel={() => setIsRequestsModalOpen(false)}
                footer={null}
                centered
            >
                <div className="py-2 space-y-4">
                    {currentComm?.pendingRequests?.length === 0 ? (
                        <p className="text-center text-gray-400 py-4 italic">No pending requests</p>
                    ) : (
                        currentComm?.pendingRequests?.map(req => (
                            <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                        {req.name?.charAt(0) || req.username?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{req.name || req.username}</p>
                                        <p className="text-[10px] text-gray-500">Requested {new Date(req.requestedAt).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleReviewRequest(activeCommunity, req.id, 'reject')}
                                        className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-red-500"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleReviewRequest(activeCommunity, req.id, 'approve')}
                                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-100"
                                    >
                                        Approve
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            {/* Chat Lock Settings Modal */}
            <Modal
                title={user.hasChatLock ? "Update Chat Lock" : "Enable Chat Lock"}
                open={isLockModalOpen}
                onOk={handleSetLock}
                onCancel={() => setIsLockModalOpen(false)}
                okText="Save"
                centered
            >
                <div className="py-4 space-y-4">
                    <p className="text-sm text-gray-500">
                        {user.hasChatLock
                            ? "Enter a new 4-digit PIN to update your lock, or leave it empty to disable the lock."
                            : "Set a 4-digit PIN to protect your chat messages. This PIN will be required every time you open the chat."}
                    </p>
                    <Input
                        type="password"
                        placeholder="Enter 4-digit PIN"
                        value={lockPin}
                        onChange={e => setLockPin(e.target.value)}
                        maxLength={4}
                        className="text-center text-2xl tracking-[0.5em] py-3 rounded-xl"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default Chat;
