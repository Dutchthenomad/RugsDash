import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../../../shared/schema';

/**
 * Authentication credentials for login
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Registration data for new users
 */
export interface RegisterData {
  username: string;
  email?: string;
  password: string;
  role?: 'user' | 'admin' | 'premium';
}

/**
 * Authentication context type definition
 */
export interface AuthContextType {
  // State
  user: Omit<User, 'password'> | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  
  // Utilities
  getAuthHeaders: () => Record<string, string>;
  hasRole: (role: string | string[]) => boolean;
}

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * API base URL - adjust based on environment
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Authentication Provider Component
 * Manages authentication state and provides auth methods to the app
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize authentication on app load
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Set up token refresh timer
   */
  useEffect(() => {
    if (accessToken) {
      // Refresh token every 10 minutes (tokens expire in 15 minutes)
      const refreshInterval = setInterval(() => {
        refreshToken();
      }, 10 * 60 * 1000);

      return () => clearInterval(refreshInterval);
    }
  }, [accessToken]);

  /**
   * Initialize authentication state from existing session
   */
  const initializeAuth = async (): Promise<void> => {
    try {
      // Try to refresh token to get current user
      const refreshSuccess = await refreshToken();
      if (!refreshSuccess) {
        // Try to get current user if refresh failed but we might have a session
        await getCurrentUser();
      }
    } catch (error) {
      console.log('No existing authentication session');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Make authenticated API request
   */
  const apiRequest = async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
      credentials: 'include', // Include cookies for refresh token
    };

    const response = await fetch(url, config);
    
    // Handle token expiration
    if (response.status === 401) {
      const refreshSuccess = await refreshToken();
      if (refreshSuccess) {
        // Retry the request with new token
        config.headers = {
          ...config.headers,
          ...getAuthHeaders(),
        };
        return fetch(url, config);
      } else {
        // Refresh failed, logout user
        await logout();
        throw new Error('Authentication expired');
      }
    }

    return response;
  };

  /**
   * Get current user information
   */
  const getCurrentUser = async (): Promise<void> => {
    try {
      const response = await apiRequest('/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
  };

  /**
   * Login user with credentials
   */
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * Register new user
   */
  const register = async (userData: RegisterData): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  /**
   * Refresh access token
   */
  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken);
        
        // Get updated user info
        await getCurrentUser();
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    // Clear auth state if refresh failed
    setAccessToken(null);
    setUser(null);
    return false;
  };

  /**
   * Logout user
   */
  const logout = async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth state regardless of API call success
      setAccessToken(null);
      setUser(null);
    }
  };

  /**
   * Logout from all devices
   */
  const logoutAllDevices = async (): Promise<void> => {
    try {
      await apiRequest('/auth/logout-all', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout all devices error:', error);
    } finally {
      // Clear auth state
      setAccessToken(null);
      setUser(null);
    }
  };

  /**
   * Get authorization headers for API requests
   */
  const getAuthHeaders = (): Record<string, string> => {
    if (accessToken) {
      return {
        Authorization: `Bearer ${accessToken}`,
      };
    }
    return {};
  };

  /**
   * Check if user has specific role(s)
   */
  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    return requiredRoles.includes(user.role);
  };

  /**
   * Context value
   */
  const value: AuthContextType = {
    // State
    user,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    accessToken,
    
    // Actions
    login,
    register,
    logout,
    logoutAllDevices,
    refreshToken,
    
    // Utilities
    getAuthHeaders,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to require authentication (throws if not authenticated)
 */
export function useRequireAuth(): AuthContextType {
  const auth = useAuth();
  
  if (!auth.isAuthenticated) {
    throw new Error('Authentication required');
  }
  
  return auth;
}

/**
 * Higher-order component to require authentication
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const auth = useAuth();
    
    if (auth.isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!auth.isAuthenticated) {
      return <div>Please log in to access this page.</div>;
    }
    
    return <Component {...props} />;
  };
}