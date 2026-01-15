import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { updateSocketAuth } from '../services/socket';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));

    const logout = () => {
        setToken(null);
        setRefreshToken(null);
        setUser(null);
    };

    useEffect(() => {
        // If we have a regular token but no refresh token, it's an old session.
        // Force logout to ensure they get both tokens on next login.
        if (token && !refreshToken) {
            console.log('Old session detected (missing refresh token). Logging out...');
            logout();
        }
    }, []);

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
            if (!refreshToken) setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
        } else {
            localStorage.removeItem('refreshToken');
        }
    }, [refreshToken]);

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

    const login = (newToken, userData, newRefreshToken) => {
        setToken(newToken);
        if (newRefreshToken) setRefreshToken(newRefreshToken);
        setUser(userData);
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
