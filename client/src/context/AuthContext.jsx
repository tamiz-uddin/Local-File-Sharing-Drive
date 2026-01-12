import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { updateSocketAuth } from '../services/socket';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            updateSocketAuth(token);
            fetchUser();
        } else {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            updateSocketAuth(null);
            setUser(null);
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const response = await axios.get('/api/me');
            setUser({ ...response.data.user, ip: response.data.ip });
        } catch (error) {
            console.error('Failed to fetch user', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    };

    const value = {
        user,
        loading,
        token,
        login,
        logout,
        isAuthenticated: !!user
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
