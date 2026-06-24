import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, clearAuthTokens, setAuthTokens, API_BASE_URL } from '../services/apiConfig';

const BASE_URL = API_BASE_URL;

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!localStorage.getItem('authToken')) {
          try {
            const refreshResponse = await fetch(`${BASE_URL}/users/refresh`, {
              method: 'POST',
              credentials: 'include',
            });
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.accessToken) {
                setAuthTokens(refreshData.accessToken);
              }
            }
          } catch {
            // No valid refresh session
          }
        }

        if (localStorage.getItem('authToken')) {
          const response = await apiRequest('/users/profile');
          setUser(response.user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        clearAuthTokens();
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);

      const response = await fetch(`${BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();

      if (data.accessToken) {
        setAuthTokens(data.accessToken);
      }

      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true, user: data.user };
    } catch (error) {
      clearAuthTokens();
      setIsAuthenticated(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${BASE_URL}/users/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthTokens();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch(`${BASE_URL}/users/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          setAuthTokens(data.accessToken);
          return data.accessToken;
        }
      }
      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuthTokens();
      setIsAuthenticated(false);
      throw error;
    }
  };

  const value = {
    user,
    setUser,
    isAuthenticated,
    loading,
    login,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
