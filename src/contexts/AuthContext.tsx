import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserModel } from '../types';
import { apiService, setupAuthInterceptor } from '../services/api';

interface AuthContextType {
  user: UserModel | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserModel | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const logout = () => {
    localStorage.removeItem('styli_access_token');
    localStorage.removeItem('styli_admin_user');
    setAccessToken(null);
    setUser(null);
    setError(null);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.login(email, password);

      localStorage.setItem('styli_access_token', response.accessToken);
      localStorage.setItem('styli_admin_user', JSON.stringify(response.user));
      setAccessToken(response.accessToken);
      setUser(response.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Restore session from localStorage on mount
  useEffect(() => {
    const cachedToken = localStorage.getItem('styli_access_token');
    const cachedUser = localStorage.getItem('styli_admin_user');

    if (cachedToken && cachedUser) {
      setAccessToken(cachedToken);
      try {
        setUser(JSON.parse(cachedUser));
      } catch {
        // Corrupted cache
        logout();
      }
    }
    setIsLoading(false);

    // Set up interceptor for 401 logouts
    setupAuthInterceptor(() => {
      logout();
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        logout,
        isLoading,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
