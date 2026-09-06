import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

export function Guard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user && !user.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
