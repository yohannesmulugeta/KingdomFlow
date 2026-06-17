import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import useCurrentUser, { ROUTE_PERMISSION_MAP } from '@/hooks/useCurrentUser';
import AccessDenied from '@/components/AccessDenied';
import NoRoleConfigured from '@/components/NoRoleConfigured';

export default function RoleProtectedRoute({ children }) {
  const location = useLocation();
  const { loading, error, churchRole, canAccessRoute, userStatus, permissions } = useCurrentUser();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error === 'no_role') {
    return <NoRoleConfigured />;
  }

  if (userStatus === 'suspended') {
    return (
      <AccessDenied
        title="Account Suspended"
        description="Your account has been suspended. Please contact the Church Admin."
      />
    );
  }

  if (!churchRole) {
    return <NoRoleConfigured />;
  }

  if (!canAccessRoute(location.pathname)) {
    return <AccessDenied />;
  }

  return children || <Outlet />;
}