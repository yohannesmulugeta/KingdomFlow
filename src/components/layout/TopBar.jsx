import React from 'react';
import { Menu, LogOut, User, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CHURCH_ROLES } from '@/contexts/CurrentUserContext';
import { isDemoMode } from '@/lib/demoMode';

export default function TopBar({ onMenuClick, currentUser }) {
  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  const handleResetDemo = async () => {
    if (!confirm('Reset all demo data? This will restore original sample data.')) return;
    try {
      await base44.functions.invoke('resetDemoData', {});
      localStorage.removeItem('kingdomflow_demo_mode');
      localStorage.removeItem('kingdomflow_demo_steps');
      window.location.href = '/demo-login';
    } catch {
      alert('Reset failed. Please try again.');
    }
  };

  const demoMode = isDemoMode();

  const churchRole = currentUser?.church_role;
  const roleLabel = CHURCH_ROLES[churchRole] || 'Not configured';

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="w-5 h-5" />
      </Button>
      <div className="hidden lg:block text-xs text-muted-foreground font-medium">
        KingdomFlow
      </div>

      <div className="flex items-center gap-3">
        {demoMode && (
          <Button variant="outline" size="sm" className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={handleResetDemo}>
            <RotateCcw className="w-3 h-3 mr-1" /> Reset Demo
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="hidden sm:inline text-sm font-medium">
                {currentUser?.full_name || 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs text-muted-foreground">{currentUser?.email}</DropdownMenuItem>
            <DropdownMenuItem className="text-xs text-muted-foreground">{roleLabel}</DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}