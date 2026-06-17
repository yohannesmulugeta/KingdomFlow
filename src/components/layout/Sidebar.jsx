import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Wallet, ArrowDownCircle, ArrowUpCircle,
  FolderOpen, Settings, ChevronLeft, ChevronRight, Shield, PieChart, Church, Menu, X, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Transactions',
    items: [
      { label: 'Income', path: '/income', icon: ArrowDownCircle },
      { label: 'Expenses', path: '/expenses', icon: ArrowUpCircle },
      { label: 'Approvals', path: '/approvals', icon: Shield },
    ]
  },
  {
    label: 'Reports',
    items: [
      { label: 'Reports', path: '/reports', icon: PieChart },
    ]
  },
  {
    label: 'Administration',
    items: [
      { label: 'Church Profile', path: '/church-profile', icon: Church },
      { label: 'Branches', path: '/branches', icon: Building2 },
      { label: 'Departments', path: '/departments', icon: FolderOpen },
      { label: 'Funds', path: '/funds', icon: Wallet },
      { label: 'Categories', path: '/categories', icon: Tag },
      { label: 'Users', path: '/users', icon: Users },
      { label: 'Approval Rules', path: '/approval-rules', icon: Shield },
      { label: 'Settings', path: '/settings', icon: Settings },
    ]
  }
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <Church className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-heading text-sm font-semibold text-sidebar-foreground truncate">Church Finance</h1>
            <p className="text-[11px] text-sidebar-foreground/50">Management System</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="hidden lg:block p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform lg:hidden ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="absolute top-4 right-4">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="text-sidebar-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}>
        {sidebarContent}
      </aside>
    </>
  );
}