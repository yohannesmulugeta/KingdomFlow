import { describe, it, expect } from 'vitest';
import { CHURCH_ROLES, ROLE_PERMISSIONS, canAccessPage, canPerformAction } from '@/lib/permissions';

describe('Permissions', () => {
  describe('CHURCH_ROLES', () => {
    it('has all five roles', () => {
      expect(CHURCH_ROLES).toHaveProperty('church_admin');
      expect(CHURCH_ROLES).toHaveProperty('pastor');
      expect(CHURCH_ROLES).toHaveProperty('treasurer');
      expect(CHURCH_ROLES).toHaveProperty('department_leader');
      expect(CHURCH_ROLES).toHaveProperty('auditor');
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('church_admin has all pages', () => {
      const pages = ROLE_PERMISSIONS.church_admin.pages;
      expect(pages.dashboard).toBe(true);
      expect(pages.users).toBe(true);
      expect(pages.settings).toBe(true);
    });

    it('pastor can view reports and funds but not create transactions', () => {
      const actions = ROLE_PERMISSIONS.pastor.actions;
      expect(actions.can_create_income).toBe(false);
      expect(actions.can_create_expense).toBe(false);
      expect(actions.can_approve_transaction).toBe(true);
    });

    it('treasurer can create and manage transactions', () => {
      const actions = ROLE_PERMISSIONS.treasurer.actions;
      expect(actions.can_create_income).toBe(true);
      expect(actions.can_create_expense).toBe(true);
    });

    it('department_leader cannot create direct transactions', () => {
      const actions = ROLE_PERMISSIONS.department_leader.actions;
      expect(actions.can_create_income).toBe(false);
      expect(actions.can_create_expense).toBe(false);
      expect(actions.can_create_money_request).toBe(true);
    });

    it('auditor is read-only', () => {
      const actions = ROLE_PERMISSIONS.auditor.actions;
      expect(actions.read_only).toBe(true);
      expect(actions.can_create_income).toBe(false);
      expect(actions.can_approve_transaction).toBe(false);
      expect(actions.can_view_audit_logs).toBe(true);
    });
  });

  describe('canAccessPage', () => {
    it('returns false for null role', () => {
      expect(canAccessPage(null, '/')).toBe(false);
    });

    it('returns true for change-password regardless of role', () => {
      expect(canAccessPage('church_admin', '/change-password')).toBe(true);
      expect(canAccessPage('department_leader', '/change-password')).toBe(true);
    });

    it('department leader can access my-requests but not income', () => {
      expect(canAccessPage('department_leader', '/my-requests')).toBe(true);
      expect(canAccessPage('department_leader', '/income')).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    it('returns false for null role', () => {
      expect(canPerformAction(null, 'can_create_income')).toBe(false);
    });

    it('auditor cannot perform write actions', () => {
      expect(canPerformAction('auditor', 'can_create_income')).toBe(false);
      expect(canPerformAction('auditor', 'can_approve_transaction')).toBe(false);
    });
  });
});