import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Clock, Ban, Loader2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from '@/components/ui/use-toast';

const STATUS_LABELS = {
  draft: 'Draft', submitted: 'Submitted', pending_approval: 'Pending Approval',
  approved: 'Approved', rejected: 'Rejected', fulfilled: 'Fulfilled', cancelled: 'Cancelled',
  returned_for_correction: 'Returned',
};
const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700', submitted: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700', fulfilled: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-gray-100 text-gray-500', returned_for_correction: 'bg-orange-100 text-orange-700',
};

export default function MyRequests() {
  const { userId, can } = useCurrentUser();
  const canRequest = can('can_create_money_request');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    base44.entities.MoneyRequest.filter({ requested_by_id: userId }, '-created_date', 50)
      .then(setRequests).finally(() => setLoading(false));
  };
  useEffect(load, [userId]);

  const fm = (n) => new Intl.NumberFormat().format(n || 0);

  const handleCancel = async (reqId) => {
    const res = await base44.functions.invoke('approveMoneyRequest', { request_id: reqId, action: 'cancel' });
    if (res.data?.error) { toast({ title: res.data.error, variant: 'destructive' }); return; }
    toast({ title: 'Cancelled' }); load();
  };

  const handleSubmit = async (reqId) => {
    const res = await base44.functions.invoke('approveMoneyRequest', { request_id: reqId, action: 'submit' });
    if (res.data?.error) { toast({ title: res.data.error, variant: 'destructive' }); return; }
    toast({ title: 'Submitted' }); load();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <PageHeader title="My Requests" description="Track your money requests" />

      {requests.length === 0 ? (
        <EmptyState icon={FileText} title="No requests yet" description="Your submitted money requests will appear here" />
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <Card key={req.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{req.request_number}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[req.status] || req.status}
                    </span>
                  </div>
                  <p className="text-sm">{req.purpose}</p>
                  <p className="text-xs text-muted-foreground">Needed by {req.date_needed} · {req.category_name || '—'}</p>
                  {req.rejection_reason && <p className="text-xs text-red-600 mt-1">Rejected: {req.rejection_reason}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">{fm(req.amount)}</span>
                  {(req.status === 'draft' || req.status === 'submitted') && (
                    <div className="flex gap-1">
                      {req.status === 'draft' && (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => handleSubmit(req.id)}>Submit</Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => handleCancel(req.id)}>Cancel</Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}