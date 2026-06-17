import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { CHURCH_ROLES, ROLE_PERMISSIONS, PAGE_ROUTES } from '@/lib/permissions';

const CurrentUserContext = createContext(null);

export function CurrentUserProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    loading: true,
    status: 'loading',
    churchRole: null,
    roleLabel: null,
    permissions: {},
    accessScope: null,
    userBranchId: null,
    userDepartmentId: null,
    userId: null,
    userStatus: null,
    mustChangePassword: false,
  });

  const loadUser = useCallback(async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        setState(prev => ({ ...prev, loading: false, status: 'unauthorized' }));
        return;
      }
      const user = await base44.auth.me();
      if (!user) {
        setState(prev => ({ ...prev, loading: false, status: 'unauthorized' }));
        return;
      }

      const churchRole = user.church_role || null;
      const userStatus = user.status || 'active';
      const mustChange = user.must_change_password === true;

      if (!churchRole) {
        setState({
          user, loading: false, status: 'missing_role',
          churchRole: null, roleLabel: null, permissions: {},
          accessScope: null, userBranchId: user.branch_id || null,
          userDepartmentId: user.department_id || null,
          userId: user.id, userStatus, mustChangePassword: mustChange,
        });
        return;
      }

      if (userStatus === 'suspended') {
        setState({
          user, loading: false, status: 'suspended',
          churchRole, roleLabel: CHURCH_ROLES[churchRole] || churchRole,
          permissions: ROLE_PERMISSIONS[churchRole]?.actions || {},
          accessScope: user.access_scope || 'assigned_branch',
          userBranchId: user.branch_id || null,
          userDepartmentId: user.department_id || null,
          userId: user.id, userStatus, mustChangePassword: mustChange,
        });
        return;
      }

      const accessScope = user.access_scope || 'assigned_branch';
      if (accessScope === 'assigned_branch' && !user.branch_id) {
        setState({
          user, loading: false, status: 'missing_branch',
          churchRole, roleLabel: CHURCH_ROLES[churchRole] || churchRole,
          permissions: ROLE_PERMISSIONS[churchRole]?.actions || {},
          accessScope, userBranchId: null,
          userDepartmentId: user.department_id || null,
          userId: user.id, userStatus, mustChangePassword: mustChange,
        });
        return;
      }

      if (mustChange) {
        setState({
          user, loading: false, status: 'password_change_required',
          churchRole, roleLabel: CHURCH_ROLES[churchRole] || churchRole,
          permissions: ROLE_PERMISSIONS[churchRole]?.actions || {},
          accessScope, userBranchId: user.branch_id || null,
          userDepartmentId: user.department_id || null,
          userId: user.id, userStatus, mustChangePassword: true,
        });
        return;
      }

      setState({
        user, loading: false, status: 'authenticated',
        churchRole, roleLabel: CHURCH_ROLES[churchRole] || churchRole,
        permissions: ROLE_PERMISSIONS[churchRole]?.actions || {},
        accessScope, userBranchId: user.branch_id || null,
        userDepartmentId: user.department_id || null,
        userId: user.id, userStatus, mustChangePassword: false,
      });
    } catch {
      setState(prev => ({ ...prev, loading: false, status: 'unauthorized' }));
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const refresh = useCallback(() => { setState(prev => ({ ...prev, loading: true })); loadUser(); }, [loadUser]);

  const can = useCallback((action) => !!state.permissions[action], [state.permissions]);
  const canAccessPage = useCallback((path) => {
    if (!state.churchRole) return false;
    const perms = ROLE_PERMISSIONS[state.churchRole];
    if (!perms) return false;
    const pageKey = PAGE_ROUTES[path];
    if (pageKey === null) return true;
    if (!pageKey) return false;
    return !!perms.pages[pageKey];
  }, [state.churchRole]);

  const value = { ...state, refresh, can, canAccessPage };

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser must be used within CurrentUserProvider');
  return ctx;
}

export { CHURCH_ROLES, ROLE_PERMISSIONS };