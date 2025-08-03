import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Lock } from 'lucide-react';

/**
 * Props for ProtectedRoute component
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string | string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * ProtectedRoute component
 * Protects routes requiring authentication and optional role-based access
 */
export function ProtectedRoute({
  children,
  roles,
  fallback,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  // Check role-based access if roles are specified
  if (roles && !hasRole(roles)) {
    // Show fallback content or access denied message
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center space-y-4 p-8">
          <div className="flex justify-center">
            <div className="p-4 bg-red-900/20 rounded-full">
              <Lock className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-slate-400 max-w-md">
            You don't have the required permissions to access this page.
          </p>
          <p className="text-sm text-slate-500">
            Your role: <span className="font-medium text-slate-300">{user?.role}</span>
            <br />
            Required: <span className="font-medium text-slate-300">
              {Array.isArray(roles) ? roles.join(', ') : roles}
            </span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}

/**
 * RequireAuth component - simpler version that just requires authentication
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

/**
 * RequireAdmin component - requires admin role
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute roles="admin">{children}</ProtectedRoute>;
}

/**
 * RequireRole component - requires specific role(s)
 */
export function RequireRole({
  children,
  roles
}: {
  children: React.ReactNode;
  roles: string | string[];
}) {
  return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;
}

/**
 * AuthGuard HOC - Higher-order component version
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  roles?: string | string[]
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <ProtectedRoute roles={roles}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Optional Auth wrapper - renders content if authenticated, fallback if not
 */
export function OptionalAuth({
  children,
  fallback
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}