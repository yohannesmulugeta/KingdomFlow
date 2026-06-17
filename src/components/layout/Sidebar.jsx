import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, LayoutDashboard, PlusCircle, Shield, FileText, TrendingUp, BarChart3, Building2, Users, Settings, ChevronDown, DollarSign, Wallet, BookOpen, History, FileCheck, UserCheck, FileSpreadsheet, Building, Menu } from 'lucide-react';
import { useCurrentUser, CHURCH_ROLES } from '@/contexts/CurrentUserContext';
import { Button } from '@/components/ui/button';

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const { churchRole, permissions, roleLabel, accessScope, userBranchId, user } = useCurrentUser();

  const menuSections = [
    { label: 'Financial', items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard, page: 'dashboard' },
      { name: 'Income', path: '/income', icon: PlusCircle, page: 'income' },
      { name: 'Expenses', path: '/expenses', icon: DollarSign, page: 'expenses' },
      { name: 'Approvals', path: '/approvals', icon: Shield, page: 'approvals' },
      { name: 'My Requests', path: '/my-requests', icon: FileText, page: 'myRequests' },
      { name: 'Request Money', path: '/request-money', icon: FileCheck, page: 'requestMoney' },
    ]},
    { label: 'Planning', items: [
      { name: 'Funds', path: '/funds', icon: Wallet, page: 'funds' },
      { name: 'Budgets', path: '/budgets', icon: BookOpen, page: 'budgets' },
      { name: 'Reports', path: '/reports', icon: BarChart3, page: 'reports' },
      { name: 'Member Summary', path: '/member-summary', icon: UserCheck, page: 'memberSummary' },
    ]},
    { label: 'Administration', items: [
      { name: 'Categories', path: '/categories', icon: FileSpreadsheet, page: 'categories' },
      { name: 'Branches', path: '/branches', icon: Building2, page: 'branches' },
      { name: 'Departments', path: '/departments', icon: Users, page: 'departments' },
      { name: 'Users', path: '/users', icon: UserCheck, page: 'users' },
      { name: 'Approval Rules', path: '/approval-rules', icon: Shield, page: 'approvalRules' },
      { name: 'Audit Logs', path: '/audit-logs', icon: History, page: 'auditLogs' },
    ]},
    { label: 'Settings', items: [
      { name: 'Church Profile', path: '/church-profile', icon: Building, page: 'churchProfile' },
      { name: 'Settings', path: '/settings', icon: Settings, page: 'settings' },
    ]},
  ];

  const canView = (page) => {
    if (churchRole === 'church_admin') return true;
    return permissions.pages?.[page] === true;
  };

  const filtered = menuSections.map(s => ({
    ...s,
    items: s.items.filter(i => canView(i.page)),
  })).filter(s => s.items.length > 0);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-sm font-heading font-semibold">KingdomFlow</h2>
          <p className="text-[10px] text-muted-foreground">{CHURCH_ROLES[churchRole] || 'User'}</p>
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {filtered.map((section, i) => (
          <div key={i}>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 px-2">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const active = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} onClick={onClose}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                    <item.icon className="w-4 h-4" /> {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t text-xs text-muted-foreground">
        {accessScope === 'assigned_branch' ? `Branch: ${userBranchId || 'Not set'}` : 'All Branches'}
      </div>
    </div>
  );

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </div>
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64">
        {sidebarContent}
      </div>
    </>
  );
}