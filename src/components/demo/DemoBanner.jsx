import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DemoBanner() {
  const isDemo = localStorage.getItem('kingdomflow_demo_mode') === 'true';
  if (!isDemo) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center">
      <p className="text-xs font-medium text-amber-700 flex items-center justify-center gap-1.5">
        <AlertTriangle className="w-3 h-3" />
        Demo Mode — This application contains sample data only.
      </p>
    </div>
  );
}