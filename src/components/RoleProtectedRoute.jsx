import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import AccessDenied from '@/components/AccessDenied';
import NoRoleConfigured from '@/components/NoRoleConfigured';

export default function RoleProtectedRoute() {
  const location = useLocation();
  const { loading, status, churchRole, userStatus, canAccessPage, mustChangePassword } = useCurrentUser();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unauthorized') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'missing_role') {
    return <NoRoleConfigured />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (status === 'suspended') {
    return <AccessDenied title="Account Suspended" description="Your account has been suspended. Contact the Church Admin." />;
  }

  if (status === 'missing_branch') {
    return <AccessDenied title="No Branch Assigned" description="Your account needs a branch assignment. Contact the Church Admin." />;
  }

  if (!canAccessPage(location.pathname)) {
    return <AccessDenied />;
  }

  return <Outlet />;
}