/**
 * Auth Store
 * Manages authentication state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../api';

interface User {
  id: number;
  username: string;
  role: string;
  company_id?: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/login', { username, password });
          if (response.data.token) {
            const token = response.data.token;
            localStorage.setItem('token', token);
            set({
              token,
              user: response.data.user || { id: 0, username, role: 'user' },
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }
          set({ isLoading: false, error: 'Login failed' });
          return false;
        } catch (error: any) {
          const message = error.response?.data?.message || 'Login failed';
          set({ isLoading: false, error: message });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setToken: (token: string) => {
        localStorage.setItem('token', token);
        set({ token, isAuthenticated: true });
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false });
          return false;
        }

        try {
          const response = await api.get('/me');
          if (response.data.user) {
            set({
              token,
              user: response.data.user,
              isAuthenticated: true,
            });
            return true;
          }
          set({ isAuthenticated: false });
          return false;
        } catch {
          set({ isAuthenticated: false, token: null });
          localStorage.removeItem('token');
          return false;
        }
      },
    }),
    {
      name: 'syntex-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
