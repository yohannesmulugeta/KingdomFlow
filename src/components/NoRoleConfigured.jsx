import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NoRoleConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-warning/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-warning" />
        </div>
        <h2 className="text-xl font-heading font-semibold text-foreground mb-2">Access Not Configured</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your KingdomFlow access has not been configured. Contact the Church Admin.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}