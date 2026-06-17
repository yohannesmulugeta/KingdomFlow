import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const ROLE_LABELS = {
  church_admin: 'Church Admin',
  pastor: 'Pastor',
  treasurer: 'Treasurer',
  department_leader: 'Department Leader',
  auditor: 'Auditor',
};

const ROLE_PERMISSIONS = {
  church_admin: {
    dashboard: true, income: true, expenses: true, approvals: true,
    myRequests: false, reports: true, memberSummary: true,
    churchProfile: true, branches: true, departments: true, funds: true,
    categories: true, budgets: true, users: true, approvalRules: true,
    auditLogs: true, settings: true,
    canRecordDirect: true, canApprove: true, canManageUsers: true,
    canViewAllBranches: true, canDelete: true,
  },
  pastor: {
    dashboard: true, income: false, expenses: false, approvals: true,
    myRequests: false, reports: true, memberSummary: true,
    churchProfile: false, branches: false, departments: false, funds: false,
    categories: false, budgets: false, users: false, approvalRules: false,
    auditLogs: false, settings: false,
    canRecordDirect: false, canApprove: true, canManageUsers: false,
    canViewAllBranches: true, canDelete: false,
  },
  treasurer: {
    dashboard: true, income: true, expenses: true, approvals: true,
    myRequests: false, reports: true, memberSummary: true,
    churchProfile: false, branches: false, departments: false, funds: true,
    categories: true, budgets: true, users: false, approvalRules: false,
    auditLogs: false, settings: false,
    canRecordDirect: true, canApprove: true, canManageUsers: false,
    canViewAllBranches: true, canDelete: false,
  },
  department_leader: {
    dashboard: true, income: false, expenses: false, approvals: false,
    myRequests: true, reports: false, memberSummary: true,
    churchProfile: false, branches: false, departments: false, funds: false,
    categories: false, budgets: false, users: false, approvalRules: false,
    auditLogs: false, settings: false,
    canRecordDirect: false, canApprove: true, canManageUsers: false,
    canViewAllBranches: false, canDelete: false,
  },
  auditor: {
    dashboard: true, income: false, expenses: false, approvals: false,
    myRequests: false, reports: true, memberSummary: true,
    churchProfile: false, branches: false, departments: false, funds: false,
    categories: false, budgets: false, users: false, approvalRules: false,
    auditLogs: true, settings: false,
    canRecordDirect: false, canApprove: false, canManageUsers: false,
    canViewAllBranches: true, canDelete: false,
  },
};

export { ROLE_LABELS, ROLE_PERMISSIONS };

export default function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const role = currentUser?.role || 'department_leader';
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.department_leader;
  const roleLabel = ROLE_LABELS[role] || role;
  const isBranchSpecific = !!currentUser?.branch_id;
  const userBranchId = currentUser?.branch_id;
  const userId = currentUser?.id;

  const can = (action) => !!permissions[action];

  return {
    currentUser, loading, role, roleLabel, permissions, userId,
    isBranchSpecific, userBranchId, can,
  };
}