import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import { socketManager } from '../utils/socket';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        socketManager.connect(token);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (name, role, sessionCode) => {
    try {
      // Validate inputs
      if (!name?.trim()) {
        return { success: false, error: 'Name is required' };
      }
      
      if (!sessionCode?.trim()) {
        return { success: false, error: 'Session code is required' };
      }

      if (sessionCode.trim().length !== 6) {
        return { success: false, error: 'Session code must be 6 characters' };
      }

      const response = await authAPI.join({
        name: name.trim(),
        role,
        sessionCode: sessionCode.toUpperCase()
      });

      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      socketManager.connect(token);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to join session';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 404) {
        errorMessage = 'Session not found. Please check the session code.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid session details';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You may be temporarily banned.';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your connection.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please try again.';
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.leave();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setSession(null);
      socketManager.disconnect();
    }
  };

  const value = {
    user,
    session,
    setSession,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};