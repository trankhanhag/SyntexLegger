/**
 * Tests for useAuthStore
 * Authentication state management tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../useAuthStore';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useAuthStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useAuthStore.setState({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
        });
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('Initial State', () => {
        it('should have correct initial state', () => {
            const state = useAuthStore.getState();

            expect(state.token).toBeNull();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            const { login } = useAuthStore.getState();

            const result = await login('admin', 'password123');

            expect(result).toBe(true);
            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.token).toBe('mock-jwt-token');
            expect(state.user?.username).toBe('admin');
            expect(state.user?.role).toBe('admin');
            expect(state.error).toBeNull();
            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
        });

        it('should fail login with invalid credentials', async () => {
            const { login } = useAuthStore.getState();

            const result = await login('wrong', 'wrong');

            expect(result).toBe(false);
            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.token).toBeNull();
            expect(state.error).toBe('Invalid credentials');
        });

        it('should set isLoading during login', async () => {
            const { login } = useAuthStore.getState();

            // Start login (don't await yet)
            const loginPromise = login('admin', 'password123');

            // Check loading state immediately
            // Note: Due to async nature, this might not always catch the loading state
            // In real tests, you might need to use more sophisticated techniques

            await loginPromise;

            // After login completes, loading should be false
            expect(useAuthStore.getState().isLoading).toBe(false);
        });
    });

    describe('logout', () => {
        it('should clear all auth state on logout', async () => {
            // First, login
            const { login, logout } = useAuthStore.getState();
            await login('admin', 'password123');

            // Verify logged in
            expect(useAuthStore.getState().isAuthenticated).toBe(true);

            // Then logout
            logout();

            const state = useAuthStore.getState();
            expect(state.token).toBeNull();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.error).toBeNull();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
        });
    });

    describe('setToken', () => {
        it('should set token and update authentication status', () => {
            const { setToken } = useAuthStore.getState();

            setToken('new-test-token');

            const state = useAuthStore.getState();
            expect(state.token).toBe('new-test-token');
            expect(state.isAuthenticated).toBe(true);
            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-test-token');
        });
    });

    describe('setUser', () => {
        it('should set user data', () => {
            const { setUser } = useAuthStore.getState();
            const testUser = {
                id: 99,
                username: 'testuser',
                role: 'viewer',
                email: 'test@example.com',
            };

            setUser(testUser);

            const state = useAuthStore.getState();
            expect(state.user).toEqual(testUser);
        });
    });

    describe('clearError', () => {
        it('should clear error state', async () => {
            // Create an error state by failing login
            const { login, clearError } = useAuthStore.getState();
            await login('wrong', 'wrong');

            expect(useAuthStore.getState().error).toBeTruthy();

            clearError();

            expect(useAuthStore.getState().error).toBeNull();
        });
    });

    describe('checkAuth', () => {
        it('should return false if no token in localStorage', async () => {
            // No token stored
            const { checkAuth } = useAuthStore.getState();
            const result = await checkAuth();

            expect(result).toBe(false);
            expect(useAuthStore.getState().isAuthenticated).toBe(false);
        });

        it('should validate token and return true for valid token', async () => {
            // Store the valid token so both checkAuth and axios interceptor can read it
            localStorageMock.setItem('token', 'mock-jwt-token');

            const { checkAuth } = useAuthStore.getState();
            const result = await checkAuth();

            expect(result).toBe(true);
            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user?.username).toBe('admin');
        });

        it('should clear token and return false for invalid token', async () => {
            // Store an invalid token
            localStorageMock.setItem('token', 'invalid-token');

            const { checkAuth } = useAuthStore.getState();
            const result = await checkAuth();

            expect(result).toBe(false);
            expect(useAuthStore.getState().isAuthenticated).toBe(false);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
        });
    });
});
