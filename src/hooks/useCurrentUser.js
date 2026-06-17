import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export const ROLE_LABELS = {
  church_admin: 'Church Admin',
  pastor: 'Pastor',
  treasurer: 'Treasurer',
  department_leader: 'Department Leader',
  auditor: 'Auditor',
};

export const ROLE_PERMISSIONS = {
  church_admin: {
    dashboard: true, income: true, expenses: true, approvals: true,
    myRequests: false, reports: true, memberSummary: true,
    churchProfile: true, branches: true, departments: true, funds: true,
    categories: true, budgets: true, users: true, approvalRules: true,
    auditLogs: true, settings: true,
    canRecordDirect: true, canApprove: true, canManageUsers: true,
    canViewAllBranches: true, canDelete: false,
    readOnly: false,
  },
  pastor: {
    dashboard: true, income: false, expenses: false, approvals: true,
    myRequests: false, reports: true, memberSummary: true,
    churchProfile: false, branches: false, departments: false, funds: true,
    categories: false, budgets: false, users: false, approvalRules: false,
    auditLogs: false, settings: false,
    canRecordDirect: false, canApprove: true, canManageUsers: false,
    canViewAllBranches: true, canDelete: false,
    readOnly: false,
  },
  treasurer: {
    dashboard: true, income: true, expenses: true, approvals: true,
    myRequests: false, reports: true, memberSummary: true,
    churchProfile: false, branches: false, departments: false, funds: true,
    categories: true, budgets: true, users: false, approvalRules: false,
    auditLogs: false, settings: false,
    canRecordDirect: true, canApprove: true, canManageUsers: false,
    canViewAllBranches: true, canDelete: false,
    readOnly: false,
  },
  department_leader: {
    dashboard: true, income: false, expenses: false, approvals: false,
    myRequests: true, reports: false, memberSummary: true,
    churchProfile: false, branches: false, departments: false, funds: false,
    categories: false, budgets: false, users: false, approvalRules: false,
    auditLogs: false, settings: false,
    canRecordDirect: false, canApprove: true, canManageUsers: false,
    canViewAllBranches: false, canDelete: false,
    readOnly: false,
  },
  auditor: {
    dashboard: true, income: false, expenses: false, approvals: false,
    myRequests: false, reports: true, memberSummary: true,
    churchProfile: false, branches: false, departments: false, funds: false,
    categories: false, budgets: false, users: false, approvalRules: false,
    auditLogs: true, settings: false,
    canRecordDirect: false, canApprove: false, canManageUsers: false,
    canViewAllBranches: true, canDelete: false,
    readOnly: true,
  },
};

export const ALLOWED_ROUTES = Object.keys(ROLE_PERMISSIONS.church_admin).filter(
  k => !['canRecordDirect', 'canApprove', 'canManageUsers', 'canViewAllBranches', 'canDelete', 'readOnly'].includes(k)
);

export const ROUTE_PERMISSION_MAP = {
  '/': 'dashboard',
  '/income': 'income',
  '/expenses': 'expenses',
  '/approvals': 'approvals',
  '/my-requests': 'myRequests',
  '/reports': 'reports',
  '/member-summary': 'memberSummary',
  '/church-profile': 'churchProfile',
  '/branches': 'branches',
  '/departments': 'departments',
  '/funds': 'funds',
  '/categories': 'categories',
  '/budgets': 'budgets',
  '/users': 'users',
  '/approval-rules': 'approvalRules',
  '/audit-logs': 'auditLogs',
  '/settings': 'settings',
};

export default function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.auth.me()
      .then(user => {
        setCurrentUser(user);
        if (!user.church_role) {
          setError('no_role');
        } else if (user.status === 'suspended') {
          setError('suspended');
        } else if (user.access_scope === 'assigned_branch' && !user.branch_id) {
          setError('missing_branch');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('auth_failed');
        setLoading(false);
      });
  }, []);

  const churchRole = currentUser?.church_role || null;
  const permissions = churchRole ? (ROLE_PERMISSIONS[churchRole] || ROLE_PERMISSIONS.department_leader) : {};
  const roleLabel = ROLE_LABELS[churchRole] || 'Not configured';
  const accessScope = currentUser?.access_scope || 'assigned_branch';
  const isBranchSpecific = accessScope === 'assigned_branch';
  const userBranchId = currentUser?.branch_id || null;
  const userDepartmentId = currentUser?.department_id || null;
  const userId = currentUser?.id;
  const userStatus = currentUser?.status || 'active';

  const can = (action) => !!permissions[action];

  const canAccessRoute = (path) => {
    if (!churchRole) return false;
    if (churchRole === 'church_admin') return true;
    const permKey = ROUTE_PERMISSION_MAP[path];
    if (!permKey) return true;
    return !!permissions[permKey];
  };

  return {
    currentUser, loading, error, churchRole, roleLabel, permissions, userId,
    accessScope, isBranchSpecific, userBranchId, userDepartmentId, userStatus,
    can, canAccessRoute,
  };
}