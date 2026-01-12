import { io } from 'socket.io-client';

const URL = `http://${window.location.hostname}:5000`; // Dynamically use the same host as the frontend

export const socket = io(URL, {
    autoConnect: true,
    reconnection: true
});

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
