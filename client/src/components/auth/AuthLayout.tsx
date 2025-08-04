import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Props for AuthLayout component
 */
interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * AuthLayout component
 * Layout wrapper for authentication pages (login, register, etc.)
 * Redirects to dashboard if already authenticated
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    // Get the intended destination from location state, or default to dashboard
    const redirectTo = (location.state as any)?.redirectTo || '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  // Render auth page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {children}
      
      {/* Optional footer for auth pages */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-slate-500 text-sm">
        <div className="max-w-md mx-auto">
          <p>
            &copy; 2025 RugsDash. Built for educational purposes.
          </p>
        </div>
      </footer>
    </div>
  );
}