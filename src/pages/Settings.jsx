import React from 'react';
import { Card } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';

export default function Settings() {
  return (
    <div>
      <PageHeader title="Settings" description="KingdomFlow system configuration" />
      <Card className="p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-4"><SettingsIcon className="w-7 h-7 text-muted-foreground" /></div>
        <h3 className="font-heading font-semibold">KingdomFlow Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">Configure your church profile, branches, departments, funds, categories, budgets, and approval rules from the sidebar menu.</p>
      </Card>
    </div>
  );
}