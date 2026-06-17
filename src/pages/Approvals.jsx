import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Check, X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function Approvals() {
  const { currentUser, filterByBranch } = useCurrentUser();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    base44.entities.Transaction.filter({ status: 'pending' }, '-created_date', 50).then(data => {
      setTransactions(filterByBranch(data)); setLoading(false);
    });
  };
  useEffect(load, []);

  const handleApprove = async (id) => {
    await base44.entities.Transaction.update(id, {
      status: 'approved',
      approved_by_id: currentUser?.id,
      approved_date: new Date().toISOString()
    });
    load();
  };

  const handleReject = async () => {
    await base44.entities.Transaction.update(rejectDialog.id, {
      status: 'rejected',
      rejection_reason: rejectReason,
      approved_by_id: currentUser?.id,
      approved_date: new Date().toISOString()
    });
    setRejectDialog(null);
    setRejectReason('');
    load();
  };

  const fmt = (n) => new Intl.NumberFormat().format(n);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Pending Approvals" description="Review and approve or reject transactions" />

      {transactions.length === 0 ? (
        <EmptyState icon={Shield} title="No pending approvals" description="All transactions have been reviewed" />
      ) : (
        <div className="space-y-3">
          {transactions.map(t => (
            <Card key={t.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    t.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'
                  }`}>
                    {t.type === 'income' ? <ArrowDownCircle className="w-5 h-5 text-emerald-600" /> : <ArrowUpCircle className="w-5 h-5 text-red-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.description || t.category_name || `${t.type} transaction`}</p>
                    <p className="text-xs text-muted-foreground">{t.date} · {(t.payment_method || '').replace('_', ' ')} · Ref: {t.reference_number || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-semibold ${t.type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {fmt(t.amount)}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => handleApprove(t.id)}>
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" onClick={() => { setRejectDialog(t); setRejectReason(''); }}>
                      <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
              {t.notes && <p className="text-xs text-muted-foreground mt-2 pl-13">Note: {t.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Reject Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Reason for rejection</Label><Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Provide a reason..." /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject}>Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}