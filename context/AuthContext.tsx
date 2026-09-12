'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, WatchHistoryItem } from '@/lib/types';
import { api } from '@/lib/api';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoaded: boolean;
  login: (email: string, password?: string, role?: Role) => Promise<User | null>;
  register: (name: string, email: string, password: string, avatar?: string) => Promise<boolean>;
  updateProfile: (data: { name?: string; email?: string; avatar?: string }) => Promise<boolean>;
  logout: () => void;
  toggleFavorite: (contentId: string) => void;
  isFavorite: (contentId: string) => boolean;
  recordHistory: (item: Omit<WatchHistoryItem, 'id' | 'watchedAt'>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_SESSION_KEY = 'movie_app_fastapi_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUserStr = localStorage.getItem(USER_SESSION_KEY);
        if (savedUserStr) {
          const savedUser = JSON.parse(savedUserStr);
          if (savedUser) {
            // Restore user session immediately so user stays logged in
            setCurrentUser(savedUser);
            if (typeof window !== 'undefined' && savedUser.token) {
              document.cookie = `access_token=${savedUser.token}; path=/; max-age=86400; SameSite=Lax`;
            }

            if (savedUser.token) {
              const verified = await api.verifyToken(savedUser.token);
              if (verified && verified.valid === false) {
                // Token is explicitly revoked, expired, or account is banned
                localStorage.removeItem(USER_SESSION_KEY);
                if (typeof window !== 'undefined') {
                  document.cookie = `access_token=; path=/; max-age=0; SameSite=Lax`;
                }
                setCurrentUser(null);
              } else if (verified && verified.valid && verified.id) {
                // Refresh user details from backend safely
                const updatedUser = { ...savedUser, ...verified };
                setCurrentUser(updatedUser);
                localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
              }
            }
          }
        }
      } catch (err) {
        console.error('Session initialization warning:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    initAuth();
  }, []);

  const saveUserSession = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      if (typeof window !== 'undefined' && user.token) {
        document.cookie = `access_token=${user.token}; path=/; max-age=86400; SameSite=Lax`;
      }
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
      if (typeof window !== 'undefined') {
        document.cookie = `access_token=; path=/; max-age=0; SameSite=Lax`;
      }
    }
  };

  const login = async (email: string, password?: string, rolePreference?: Role): Promise<User | null> => {
    try {
      const user = await api.login(email, password, rolePreference);
      saveUserSession(user);
      return user;
    } catch (e: any) {
      console.error('Login error:', e);
      throw e;
    }
  };

  const register = async (name: string, email: string, password: string, avatar?: string): Promise<boolean> => {
    try {
      const user = await api.register(name, email, password, avatar);
      saveUserSession(user);
      return true;
    } catch (e: any) {
      console.error('Registration error', e);
      throw e;
    }
  };

  const updateProfile = async (data: { name?: string; email?: string; avatar?: string }): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const updated = await api.updateProfile(currentUser.id, data);
      const newUser = { ...currentUser, ...updated };
      saveUserSession(newUser);
      return true;
    } catch (e) {
      console.error('Update profile failed', e);
      return false;
    }
  };

  const logout = () => {
    saveUserSession(null);
  };

  const toggleFavorite = async (contentId: string) => {
    if (!currentUser) return;
    const exists = currentUser.favorites.includes(contentId);
    const updatedFavorites = exists
      ? currentUser.favorites.filter((id) => id !== contentId)
      : [...currentUser.favorites, contentId];

    const updatedUser = { ...currentUser, favorites: updatedFavorites };
    saveUserSession(updatedUser);

    try {
      const res = await api.toggleFavorite(contentId);
      if (res && res.favorites) {
        saveUserSession({ ...currentUser, favorites: res.favorites });
      }
    } catch (e) {
      console.error('Failed to sync favorite with FastAPI', e);
    }
  };

  const isFavorite = (contentId: string) => {
    return currentUser?.favorites.includes(contentId) || false;
  };

  const recordHistory = async (item: Omit<WatchHistoryItem, 'id' | 'watchedAt'>) => {
    if (!currentUser) return;

    const existingIndex = currentUser.history.findIndex(
      (h) => h.contentId === item.contentId && h.episodeId === item.episodeId
    );

    const newItem: WatchHistoryItem = {
      ...item,
      id: 'h-' + Date.now(),
      watchedAt: new Date().toISOString(),
    };

    let newHistory = [...currentUser.history];
    if (existingIndex >= 0) {
      newHistory[existingIndex] = newItem;
    } else {
      newHistory.unshift(newItem);
    }

    const updatedUser = { ...currentUser, history: newHistory };
    saveUserSession(updatedUser);

    try {
      await api.saveWatchProgress(
        item.contentId,
        item.currentTime || 0,
        item.duration || 0,
        item.contentType || 'movie',
        item.episodeId
      );
    } catch (e) {
      console.error('Failed to sync history with FastAPI', e);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN' && currentUser.status === 'active';
  const isAuthenticated = currentUser !== null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        isAuthenticated,
        isLoaded,
        login,
        register,
        updateProfile,
        logout,
        toggleFavorite,
        isFavorite,
        recordHistory,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
