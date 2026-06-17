import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Check, X, ArrowDownCircle, ArrowUpCircle, FileText } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from '@/components/ui/use-toast';

export default function Approvals() {
  const { userId, churchRole, can, userBranchId, accessScope } = useCurrentUser();
  const canApproveTxn = can('can_approve_transaction');
  const canApproveReq = can('can_approve_money_request');
  const [transactions, setTransactions] = useState([]);
  const [moneyRequests, setMoneyRequests] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectType, setRejectType] = useState('transaction');
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    const txnFilter = accessScope === 'assigned_branch' ? { status: 'pending', branch_id: userBranchId } : { status: 'pending' };
    Promise.all([
      base44.entities.Transaction.filter(txnFilter, '-created_date', 50),
      base44.entities.MoneyRequest.filter({ status: { $in: ['submitted', 'pending_approval'] } }, '-created_date', 50),
      base44.entities.ApprovalRule.filter({ is_active: true }, 'approval_order', 20),
    ]).then(([t, mr, r]) => { setTransactions(t); setMoneyRequests(mr); setRules(r); setLoading(false); });
  };
  useEffect(load, [userBranchId, accessScope]);

  const getApplicableRules = (item, type) => {
    const amount = item.amount || 0;
    const itemType = type === 'transaction' ? item.type : 'expense';
    return rules.filter(r => {
      if (r.transaction_type !== 'both' && r.transaction_type !== itemType) return false;
      if (r.min_amount > 0 && amount < r.min_amount) return false;
      if (r.max_amount && amount > r.max_amount) return false;
      return true;
    }).sort((a, b) => (a.approval_order || 0) - (b.approval_order || 0));
  };

  const canCurrentUserApprove = (item, type) => {
    if (item.requested_by_id === userId || item.created_by_id === userId) return false;
    const applicable = getApplicableRules(item, type);
    if (applicable.length === 0) return churchRole === 'church_admin';
    const currentStage = item.approval_stage || 'none';
    const orderMap = { none: 0, department_leader: 1, treasurer: 2, pastor: 3, church_admin: 4 };
    const currentOrder = orderMap[currentStage] || 0;
    for (const rule of applicable) {
      if ((rule.approval_order || 0) > currentOrder) {
        return rule.required_role === churchRole;
      }
    }
    return false;
  };

  const handleApprove = async (id, type) => {
    const fn = type === 'transaction' ? 'approveTransaction' : 'approveMoneyRequest';
    const res = await base44.functions.invoke(fn, { transaction_id: type === 'transaction' ? id : undefined, request_id: type === 'request' ? id : undefined, action: 'approve' });
    if (res.data?.error) { toast({ title: 'Error', description: res.data.error, variant: 'destructive' }); return; }
    toast({ title: res.data?.is_final ? 'Approved (final)' : `Approved (stage: ${res.data?.stage})` });
    load();
  };

  const handleReject = async () => {
    const fn = rejectType === 'transaction' ? 'approveTransaction' : 'approveMoneyRequest';
    const key = rejectType === 'transaction' ? 'transaction_id' : 'request_id';
    const res = await base44.functions.invoke(fn, { [key]: rejectDialog.id, action: 'reject', reason: rejectReason });
    if (res.data?.error) { toast({ title: 'Error', description: res.data.error, variant: 'destructive' }); return; }
    setRejectDialog(null); setRejectReason(''); load(); toast({ title: 'Rejected' });
  };

  const approveTxns = canApproveTxn ? transactions.filter(t => canCurrentUserApprove(t, 'transaction')) : [];
  const otherTxns = canApproveTxn ? transactions.filter(t => !canCurrentUserApprove(t, 'transaction')) : transactions;
  const approveReqs = canApproveReq ? moneyRequests.filter(r => canCurrentUserApprove(r, 'request')) : [];
  const otherReqs = canApproveReq ? moneyRequests.filter(r => !canCurrentUserApprove(r, 'request')) : moneyRequests;

  const fm = (n) => new Intl.NumberFormat().format(n || 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Approvals" description="Review and approve transactions and money requests" />

      {approveTxns.length === 0 && otherTxns.length === 0 && approveReqs.length === 0 && otherReqs.length === 0 && (
        <EmptyState icon={Shield} title="Nothing to review" description="All transactions and requests have been processed" />
      )}

      {/* Transaction Approvals */}
      {canApproveTxn && transactions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-heading font-semibold mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Transaction Approvals</h3>
          {approveTxns.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-emerald-700 mb-2">Waiting for your approval ({approveTxns.length})</p>
              <div className="space-y-2">
                {approveTxns.map(t => (
                  <Card key={t.id} className="p-3 border-l-4 border-l-emerald-500">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        {t.type === 'income' ? <ArrowDownCircle className="w-4 h-4 text-emerald-600" /> : <ArrowUpCircle className="w-4 h-4 text-red-600" />}
                        <div>
                          <span className="text-sm font-medium">{t.transaction_number}</span>
                          <span className="text-xs text-muted-foreground ml-2">{t.description || t.category_name || t.type}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">Stage: {t.approval_stage || 'none'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>{fm(t.amount)}</span>
                        <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(t.id, 'transaction')}><Check className="w-3 h-3 mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 text-red-700 border-red-200 hover:bg-red-50" onClick={() => { setRejectDialog(t); setRejectType('transaction'); setRejectReason(''); }}><X className="w-3 h-3 mr-1" /> Reject</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {otherTxns.length > 0 && (
            <div className="opacity-60 space-y-1">
              <p className="text-xs text-muted-foreground mb-1">Awaiting other approvers ({otherTxns.length})</p>
              {otherTxns.map(t => (
                <Card key={t.id} className="p-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm"><span>{t.transaction_number}</span></div><span className="text-sm">{fm(t.amount)}</span></div></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Money Request Approvals */}
      {canApproveReq && moneyRequests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-heading font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Money Request Approvals</h3>
          {approveReqs.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-emerald-700 mb-2">Waiting for your approval ({approveReqs.length})</p>
              <div className="space-y-2">
                {approveReqs.map(r => (
                  <Card key={r.id} className="p-3 border-l-4 border-l-emerald-500">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <span className="text-sm font-medium">{r.request_number}</span>
                        <span className="text-xs text-muted-foreground ml-2">{r.purpose}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">By: {r.requested_by_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{fm(r.amount)}</span>
                        <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(r.id, 'request')}><Check className="w-3 h-3 mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 text-red-700 border-red-200 hover:bg-red-50" onClick={() => { setRejectDialog(r); setRejectType('request'); setRejectReason(''); }}><X className="w-3 h-3 mr-1" /> Reject</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {otherReqs.length > 0 && (
            <div className="opacity-60 space-y-1">
              <p className="text-xs text-muted-foreground mb-1">Awaiting other approvers ({otherReqs.length})</p>
              {otherReqs.map(r => (
                <Card key={r.id} className="p-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm"><span>{r.request_number}</span></div><span className="text-sm">{fm(r.amount)}</span></div></Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">Reject {rejectType === 'transaction' ? 'Transaction' : 'Request'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2"><div><Label>Reason *</Label><Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} /></div></div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button><Button variant="destructive" onClick={handleReject}>Reject</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}