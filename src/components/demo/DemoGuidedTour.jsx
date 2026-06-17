import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Circle, Play } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'View the church financial overview', href: null },
  { id: 2, label: 'Record a sample income', href: null },
  { id: 3, label: 'Create a new fund', href: null },
  { id: 4, label: 'Add a church user', href: null },
  { id: 5, label: 'Submit a money request', href: null },
  { id: 6, label: 'Approve the request', href: null },
  { id: 7, label: 'View the financial report', href: null },
];

export default function DemoGuidedTour() {
  const isDemo = localStorage.getItem('kingdomflow_demo_mode') === 'true';
  const [completed, setCompleted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kingdomflow_demo_steps') || '[]');
    } catch { return []; }
  });
  const [expanded, setExpanded] = useState(false);

  if (!isDemo) return null;

  const toggleStep = (id) => {
    const next = completed.includes(id) ? completed.filter(s => s !== id) : [...completed, id];
    setCompleted(next);
    localStorage.setItem('kingdomflow_demo_steps', JSON.stringify(next));
  };

  return (
    <Card className="border-dashed border-2 border-primary/20 bg-primary/[0.02]">
      <CardContent className="p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-sm font-heading font-semibold"
        >
          <span className="flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            Try KingdomFlow in 5 Minutes
          </span>
          <span className="text-xs text-muted-foreground">{completed.length}/{STEPS.length} done</span>
        </button>
        {expanded && (
          <div className="mt-3 space-y-1.5">
            {STEPS.map(step => (
              <button
                key={step.id}
                onClick={() => toggleStep(step.id)}
                className="w-full flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-muted/50 transition-colors text-left"
              >
                {completed.includes(step.id) ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={completed.includes(step.id) ? 'text-muted-foreground line-through' : ''}>
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}