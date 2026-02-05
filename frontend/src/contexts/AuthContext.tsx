import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthToken } from '../types';
import api from '../services/api';
import { setToken, getToken, removeToken, isTokenValid } from '../utils/tokenManager';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app load
    const storedToken = getToken();
    if (storedToken && isTokenValid()) {
      setTokenState(storedToken);
      // Verify token and get user data
      api.get('/auth/me')
        .then(response => {
          setUser(response.data.data.user);
        })
        .catch((error) => {
          console.error('Token validation failed:', error);
          // Token is invalid, remove it
          removeToken();
          setTokenState(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Remove invalid token
      if (storedToken) {
        removeToken();
      }
      setLoading(false);
    }
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { usernameOrEmail, password });
      const authData: AuthToken = response.data.data;
      
      setToken(authData.token);
      setTokenState(authData.token);
      setUser(authData.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      const authData: AuthToken = response.data.data;
      
      setToken(authData.token);
      setTokenState(authData.token);
      setUser(authData.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setTokenState(null);
    removeToken();
    
    // Call logout endpoint to invalidate token on server
    api.post('/auth/logout').catch(() => {
      // Ignore errors on logout
    });
  };

  const deleteAccount = async () => {
    try {
      await api.delete('/auth/account');
      
      // Clear local state after successful deletion
      setUser(null);
      setTokenState(null);
      removeToken();
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    deleteAccount,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};