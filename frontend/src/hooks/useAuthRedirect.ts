import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook to handle authentication redirects
 * Redirects authenticated users away from auth pages
 * Redirects unauthenticated users to auth page when accessing protected routes
 */
export const useAuthRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    // If user is authenticated and on auth page, redirect to intended page or home
    if (user && location.pathname === '/auth') {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, loading, location, navigate]);

  return { user, loading };
};

/**
 * Custom hook for protected routes that require authentication
 */
export const useRequireAuth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth', { 
        state: { from: location },
        replace: true 
      });
    }
  }, [user, loading, location, navigate]);

  return { user, loading, isAuthenticated: !!user };
};