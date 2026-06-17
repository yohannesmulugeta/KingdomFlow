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
import { toast } from '@/components/ui/use-toast';

export default function Approvals() {
  const { userId, role, can } = useCurrentUser();
  const canApprove = can('canApprove');
  const [transactions, setTransactions] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState({});
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    Promise.all([
      base44.entities.Transaction.filter({ status: 'pending' }, '-created_date', 100),
      base44.entities.ApprovalRule.filter({ is_active: true }, 'approval_order', 20),
      base44.entities.ApprovalHistory.list('-created_date', 100),
    ]).then(([t, r, ah]) => {
      setTransactions(t);
      setRules(r);
      const hist = {};
      ah.forEach(h => { if (h.transaction_id) { if (!hist[h.transaction_id]) hist[h.transaction_id] = []; hist[h.transaction_id].push(h); } });
      setApprovalHistory(hist);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const getApplicableRules = (transaction) => {
    return rules.filter(r => {
      if (r.transaction_type !== 'both' && r.transaction_type !== transaction.type) return false;
      if (r.min_amount > 0 && transaction.amount < r.min_amount) return false;
      if (r.max_amount && transaction.amount > r.max_amount) return false;
      return true;
    }).sort((a, b) => (a.approval_order || 0) - (b.approval_order || 0));
  };

  const canCurrentUserApprove = (transaction) => {
    if (transaction.created_by_id === userId) return false;
    const applicableRules = getApplicableRules(transaction);
    if (applicableRules.length === 0) return role === 'church_admin';
    // Check if current role is the next required stage
    const history = approvalHistory[transaction.id] || [];
    const lastStage = transaction.approval_stage || 'none';
    for (const rule of applicableRules) {
      const ruleOrder = rule.approval_order || 0;
      const lastOrder = { department_leader: 1, treasurer: 2, pastor: 3, church_admin: 4 }[lastStage] || 0;
      if (ruleOrder > lastOrder) {
        return rule.required_role === role;
      }
    }
    return false;
  };

  const handleApprove = async (id) => {
    const res = await base44.functions.invoke('approveTransaction', { transaction_id: id, action: 'approve' });
    if (res.data?.error) { toast({ title: 'Error', description: res.data.error, variant: 'destructive' }); return; }
    toast({ title: res.data?.is_final ? 'Approved (final)' : `Approved (stage: ${res.data?.stage})` });
    load();
  };

  const handleReject = async () => {
    const res = await base44.functions.invoke('approveTransaction', { transaction_id: rejectDialog.id, action: 'reject', reason: rejectReason });
    if (res.data?.error) { toast({ title: 'Error', description: res.data.error, variant: 'destructive' }); return; }
    setRejectDialog(null); setRejectReason(''); load();
    toast({ title: 'Rejected' });
  };

  const fmt = (n) => new Intl.NumberFormat().format(n);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  // Filter to only show transactions the current user can approve
  const approvableTransactions = canApprove ? transactions.filter(t => canCurrentUserApprove(t)) : [];
  const otherPending = canApprove ? transactions.filter(t => !canCurrentUserApprove(t)) : transactions;

  return (
    <div>
      <PageHeader title="Approvals" description="Review and approve or reject transactions" />

      {approvableTransactions.length === 0 && otherPending.length === 0 && (
        <EmptyState icon={Shield} title="No pending transactions" description="All transactions have been reviewed" />
      )}

      {approvableTransactions.length > 0 && (
        <div>
          <p className="text-sm font-medium text-emerald-700 mb-3">Waiting for your approval ({approvableTransactions.length})</p>
          <div className="space-y-3 mb-6">
            {approvableTransactions.map(t => {
              const hist = approvalHistory[t.id] || [];
              return (
                <Card key={t.id} className="p-4 border-l-4 border-l-emerald-500">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {t.type === 'income' ? <ArrowDownCircle className="w-5 h-5 text-emerald-600" /> : <ArrowUpCircle className="w-5 h-5 text-red-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t.transaction_number || '—'}</p>
                        <p className="text-sm">{t.description || t.category_name || `${t.type} transaction`}</p>
                        <p className="text-xs text-muted-foreground">{t.date} · Stage: {t.approval_stage || 'none'}</p>
                        {hist.length > 0 && <p className="text-xs text-muted-foreground mt-1">Prior approvals: {hist.map(h => `${h.stage}(${h.action})`).join(', ')}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-semibold ${t.type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(t.amount)}</span>
                      <div className="flex gap-1">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(t.id)}><Check className="w-4 h-4 mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" onClick={() => { setRejectDialog(t); setRejectReason(''); }}><X className="w-4 h-4 mr-1" /> Reject</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {otherPending.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Awaiting others ({otherPending.length})</p>
          <div className="space-y-2 opacity-60">
            {otherPending.map(t => (
              <Card key={t.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {t.type === 'income' ? <ArrowDownCircle className="w-4 h-4 text-emerald-600" /> : <ArrowUpCircle className="w-4 h-4 text-red-600" />}
                    <span className="text-sm">{t.transaction_number || '—'} — {t.description || t.category_name || t.type}</span>
                  </div>
                  <span className="text-sm font-medium">{fmt(t.amount)}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">Reject Transaction</DialogTitle></DialogHeader><div className="space-y-4 mt-2"><div><Label>Reason</Label><Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button><Button variant="destructive" onClick={handleReject}>Reject</Button></div></div></DialogContent>
      </Dialog>
    </div>
  );
}