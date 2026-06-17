export const CHURCH_ROLES = {
  church_admin: 'Church Admin',
  pastor: 'Pastor',
  treasurer: 'Treasurer',
  department_leader: 'Department Leader',
  auditor: 'Auditor',
};

export const ROLE_PERMISSIONS = {
  church_admin: {
    pages: {
      dashboard: true, income: true, expenses: true, approvals: true,
      myRequests: false, requestMoney: false, reports: true, memberSummary: true,
      churchProfile: true, branches: true, departments: true, funds: true,
      categories: true, budgets: true, users: true, approvalRules: true,
      auditLogs: true, settings: true,
    },
    actions: {
      can_create_income: true, can_create_expense: true,
      can_create_money_request: false, can_approve_transaction: true,
      can_approve_money_request: true, can_void_transaction: true,
      can_manage_funds: true, can_manage_budgets: true,
      can_manage_users: true, can_manage_settings: true,
      can_view_audit_logs: true, read_only: false,
    }
  },
  pastor: {
    pages: {
      dashboard: true, income: false, expenses: false, approvals: true,
      myRequests: false, requestMoney: false, reports: true, memberSummary: true,
      churchProfile: false, branches: false, departments: false, funds: true,
      categories: false, budgets: false, users: false, approvalRules: false,
      auditLogs: false, settings: false,
    },
    actions: {
      can_create_income: false, can_create_expense: false,
      can_create_money_request: false, can_approve_transaction: true,
      can_approve_money_request: true, can_void_transaction: false,
      can_manage_funds: false, can_manage_budgets: false,
      can_manage_users: false, can_manage_settings: false,
      can_view_audit_logs: false, read_only: false,
    }
  },
  treasurer: {
    pages: {
      dashboard: true, income: true, expenses: true, approvals: true,
      myRequests: false, requestMoney: false, reports: true, memberSummary: false,
      churchProfile: false, branches: false, departments: false, funds: true,
      categories: true, budgets: true, users: false, approvalRules: false,
      auditLogs: false, settings: false,
    },
    actions: {
      can_create_income: true, can_create_expense: true,
      can_create_money_request: false, can_approve_transaction: true,
      can_approve_money_request: true, can_void_transaction: true,
      can_manage_funds: true, can_manage_budgets: true,
      can_manage_users: false, can_manage_settings: false,
      can_view_audit_logs: false, read_only: false,
    }
  },
  department_leader: {
    pages: {
      dashboard: true, income: false, expenses: false, approvals: false,
      myRequests: true, requestMoney: true, reports: false, memberSummary: true,
      churchProfile: false, branches: false, departments: false, funds: false,
      categories: false, budgets: false, users: false, approvalRules: false,
      auditLogs: false, settings: false,
    },
    actions: {
      can_create_income: false, can_create_expense: false,
      can_create_money_request: true, can_approve_transaction: false,
      can_approve_money_request: false, can_void_transaction: false,
      can_manage_funds: false, can_manage_budgets: false,
      can_manage_users: false, can_manage_settings: false,
      can_view_audit_logs: false, read_only: false,
    }
  },
  auditor: {
    pages: {
      dashboard: true, income: false, expenses: false, approvals: false,
      myRequests: false, requestMoney: false, reports: true, memberSummary: true,
      churchProfile: false, branches: false, departments: false, funds: true,
      categories: false, budgets: false, users: false, approvalRules: false,
      auditLogs: true, settings: false,
    },
    actions: {
      can_create_income: false, can_create_expense: false,
      can_create_money_request: false, can_approve_transaction: false,
      can_approve_money_request: false, can_void_transaction: false,
      can_manage_funds: false, can_manage_budgets: false,
      can_manage_users: false, can_manage_settings: false,
      can_view_audit_logs: true, read_only: true,
    }
  },
};

export const PAGE_ROUTES = {
  '/': 'dashboard', '/income': 'income', '/expenses': 'expenses',
  '/approvals': 'approvals', '/my-requests': 'myRequests', '/request-money': 'requestMoney',
  '/reports': 'reports', '/member-summary': 'memberSummary',
  '/church-profile': 'churchProfile', '/branches': 'branches',
  '/departments': 'departments', '/funds': 'funds',
  '/categories': 'categories', '/budgets': 'budgets',
  '/users': 'users', '/approval-rules': 'approvalRules',
  '/audit-logs': 'auditLogs', '/settings': 'settings',
  '/change-password': null,
};

export function canAccessPage(churchRole, path) {
  if (!churchRole) return false;
  const pageKey = PAGE_ROUTES[path];
  if (pageKey === null) return true; // change-password always accessible
  if (!pageKey) return false; // unknown route - reject
  const perms = ROLE_PERMISSIONS[churchRole];
  if (!perms) return false;
  return !!perms.pages[pageKey];
}

export function canPerformAction(churchRole, action) {
  if (!churchRole) return false;
  const perms = ROLE_PERMISSIONS[churchRole];
  if (!perms) return false;
  return !!perms.actions[action];
}