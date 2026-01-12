import { io } from 'socket.io-client';

const API_URL = import.meta.env.PROD
    ? 'http://10.10.10.2'
    : `http://${window.location.hostname}:5000`;

export const socket = io(API_URL, {
    autoConnect: true,
    reconnection: true,
    auth: {
        token: localStorage.getItem('token')
    }
});

// Helper to update socket auth when logging in/out
export const updateSocketAuth = (token) => {
    socket.auth.token = token;
    if (socket.connected) {
        socket.disconnect().connect();
    }
};

export const connectSocket = () => {
    if (!socket.connected) {
        socket.connect();
    }
};

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};
