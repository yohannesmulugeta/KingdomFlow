import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { ScrollText, User } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  useEffect(() => {
    base44.entities.AuditLog.list('-created_date', 200).then(d => { setLogs(d); setLoading(false); });
  }, []);

  const paged = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Audit Logs" description="Record of all important system actions" />

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit logs yet" description="Audit entries will appear as actions are taken in the system" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(l => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(l.created_date).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                        {l.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{l.details || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs">{l.performed_by_name || 'System'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="text-xs text-primary hover:underline disabled:opacity-30">Previous</button>
              <span className="text-xs text-muted-foreground">Page {page + 1} of {Math.ceil(logs.length / PAGE_SIZE)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= logs.length} className="text-xs text-primary hover:underline disabled:opacity-30">Next</button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}