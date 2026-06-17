import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileCheck, Send, Clock, Ban, AlertCircle, Wand2 } from 'lucide-react';
import { isDemoMode } from '@/lib/demoMode';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from '@/components/ui/use-toast';

const STATUS_LABELS = {
  draft: 'Draft', submitted: 'Submitted', pending_approval: 'Pending Approval',
  approved: 'Approved', rejected: 'Rejected', fulfilled: 'Fulfilled', cancelled: 'Cancelled',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700', submitted: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700', fulfilled: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function RequestMoney() {
  const { userId, userBranchId, userDepartmentId, can } = useCurrentUser();
  const canCreate = can('can_create_money_request');
  const [requests, setRequests] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [funds, setFunds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    amount: '', purpose: '', fund_id: '', category_id: '', category_name: '',
    vendor_payee: '', date_needed: new Date().toISOString().split('T')[0], notes: '', status: 'draft',
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.MoneyRequest.filter({ requested_by_id: userId }, '-created_date', 50),
      base44.entities.Branch.list(),
      base44.entities.Department.list(),
      base44.entities.Fund.filter({ is_active: true }),
      base44.entities.ExpenseCategory.filter({ is_active: true }),
    ]).then(([r, b, d, f, c]) => {
      setRequests(r); setBranches(b); setDepartments(d); setFunds(f); setCategories(c);
      setLoading(false);
    });
  };
  useEffect(load, [userId]);

  const fm = (n) => new Intl.NumberFormat().format(n || 0);

  const handleSave = async (status) => {
    if (!form.amount || !form.purpose) { toast({ title: 'Amount and purpose are required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('createMoneyRequest', {
        ...form,
        amount: parseFloat(form.amount),
        status: status,
        branch_id: userBranchId,
        department_id: userDepartmentId,
      });
      if (res.data?.error) {
        toast({ title: 'Error', description: res.data.error, variant: 'destructive' });
      } else {
        toast({ title: status === 'draft' ? 'Draft saved' : 'Request submitted' });
        setFormOpen(false);
        setForm({ amount: '', purpose: '', fund_id: '', category_id: '', category_name: '', vendor_payee: '', date_needed: new Date().toISOString().split('T')[0], notes: '', status: 'draft' });
        load();
      }
    } catch { toast({ title: 'Error', description: 'Failed to save request', variant: 'destructive' }); }
    setSaving(false);
  };

  const handleCancel = async (reqId) => {
    try {
      const res = await base44.functions.invoke('approveMoneyRequest', { request_id: reqId, action: 'cancel' });
      if (res.data?.error) { toast({ title: 'Error', description: res.data.error, variant: 'destructive' }); return; }
      toast({ title: 'Request cancelled' });
      load();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleSubmit = async (reqId) => {
    try {
      const res = await base44.functions.invoke('approveMoneyRequest', { request_id: reqId, action: 'submit' });
      if (res.data?.error) { toast({ title: 'Error', description: res.data.error, variant: 'destructive' }); return; }
      toast({ title: 'Request submitted' });
      load();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  if (!canCreate) return <EmptyState icon={AlertCircle} title="Access Denied" description="You don't have permission to create money requests." />;

  return (
    <div>
      <PageHeader title="Request Money" description="Submit money requests for approval">
        <Button onClick={() => setFormOpen(true)}><FileCheck className="w-4 h-4 mr-2" /> New Request</Button>
      </PageHeader>

      {requests.length === 0 ? (
        <EmptyState icon={FileCheck} title="No requests yet" description="Create your first money request" actionLabel="New Request" onAction={() => setFormOpen(true)} />
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
                  <div className="flex gap-1">
                    {req.status === 'draft' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleSubmit(req.id)}><Send className="w-3 h-3 mr-1" /> Submit</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(req.id)}><Ban className="w-3 h-3" /></Button>
                      </>
                    )}
                    {req.status === 'submitted' && (
                      <Button size="sm" variant="ghost" onClick={() => handleCancel(req.id)}><Ban className="w-3 h-3 mr-1" /> Cancel</Button>
                    )}
                    {req.status === 'rejected' && (
                      <Button size="sm" variant="ghost" onClick={() => handleCancel(req.id)}><Ban className="w-3 h-3" /></Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">New Money Request</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto">
            <div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
            <div><Label>Purpose *</Label><Input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="What is this money for?" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fund</Label><Select value={form.fund_id || 'none'} onValueChange={v => setForm({ ...form, fund_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="Select fund" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{funds.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Category</Label><Select value={form.category_id || 'none'} onValueChange={v => { const cat = categories.find(c => c.id === v); setForm({ ...form, category_id: v === 'none' ? '' : v, category_name: cat?.name || '' }); }}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Vendor / Payee</Label><Input value={form.vendor_payee} onChange={e => setForm({ ...form, vendor_payee: e.target.value })} placeholder="Who will receive payment?" /></div>
            <div><Label>Date Needed</Label><Input type="date" value={form.date_needed} onChange={e => setForm({ ...form, date_needed: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>
              <Clock className="w-4 h-4 mr-2" /> Save Draft
            </Button>
            <Button onClick={() => handleSave('submitted')} disabled={saving}>
              {saving ? 'Submitting...' : <><Send className="w-4 h-4 mr-2" /> Submit</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}