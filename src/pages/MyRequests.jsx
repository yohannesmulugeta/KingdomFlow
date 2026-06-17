import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Plus, XCircle, DollarSign } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/hooks/useCurrentUser';
import { toast } from '@/components/ui/use-toast';

export default function MyRequests() {
  const { userId, can } = useCurrentUser();
  const canCreate = can('myRequests');
  const [requests, setRequests] = useState([]);
  const [branches, setBranches] = useState([]);
  const [funds, setFunds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', purpose: '', fund_id: '', category_id: '', category_name: '', vendor_payee: '', date_needed: new Date().toISOString().split('T')[0], notes: '' });

  const load = () => {
    Promise.all([
      base44.entities.MoneyRequest.filter({ requested_by_id: userId }, '-created_date', 50),
      base44.entities.Branch.list(),
      base44.entities.Fund.list(),
      base44.entities.ExpenseCategory.list()
    ]).then(([r, b, f, c]) => { setRequests(r); setBranches(b); setFunds(f); setCategories(c); setLoading(false); });
  };
  useEffect(load, []);

  const openNew = () => { setForm({ amount: '', purpose: '', fund_id: '', category_id: '', category_name: '', vendor_payee: '', date_needed: new Date().toISOString().split('T')[0], notes: '' }); setDialogOpen(true); };

  const handleSave = async () => {
    const response = await base44.functions.invoke('createMoneyRequest', {
      ...form,
      amount: parseFloat(form.amount) || 0,
      branch_id: branches[0]?.id || '',
    });
    if (response.data?.error) { toast({ title: 'Error', description: response.data.error, variant: 'destructive' }); return; }
    setDialogOpen(false); load();
    toast({ title: 'Request submitted', description: `Request #${response.data.request_number} created` });
  };

  const handleCancel = async (id) => {
    await base44.entities.MoneyRequest.update(id, { status: 'cancelled' });
    load();
    toast({ title: 'Request cancelled' });
  };

  const fmt = (n) => new Intl.NumberFormat().format(n);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="My Requests" description="Submit and track money requests">
        {canCreate && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Request Money</Button>}
      </PageHeader>

      {requests.length === 0 ? (
        <EmptyState icon={Clock} title="No requests yet" description="Submit a money request to request funds from your department" actionLabel={canCreate ? "Request Money" : undefined} onAction={canCreate ? openNew : undefined} />
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{r.request_number}</p>
                  <p className="text-sm">{r.purpose}</p>
                  {r.vendor_payee && <p className="text-xs text-muted-foreground">Payee: {r.vendor_payee}</p>}
                  <p className="text-xs text-muted-foreground">Needed by: {r.date_needed || '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">{fmt(r.amount)}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                    r.status === 'rejected' ? 'bg-red-50 text-red-700' :
                    r.status === 'submitted' ? 'bg-blue-50 text-blue-700' :
                    r.status === 'fulfilled' ? 'bg-purple-50 text-purple-700' :
                    'bg-muted text-muted-foreground'
                  }`}>{r.status}</span>
                  {(r.status === 'draft' || r.status === 'submitted') && (
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleCancel(r.id)}>
                      <XCircle className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Request Money</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Date Needed</Label><Input type="date" value={form.date_needed} onChange={e => setForm({ ...form, date_needed: e.target.value })} /></div>
            </div>
            <div><Label>Purpose *</Label><Input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="What is this money for?" /></div>
            <div><Label>Vendor / Payee</Label><Input value={form.vendor_payee} onChange={e => setForm({ ...form, vendor_payee: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fund</Label><Select value={form.fund_id || 'none'} onValueChange={v => setForm({ ...form, fund_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{funds.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Category</Label><Select value={form.category_id || 'none'} onValueChange={v => { const cat = categories.find(c => c.id === v); setForm({ ...form, category_id: v === 'none' ? '' : v, category_name: cat?.name || '' }); }}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{categories.filter(c => c.is_active !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.amount || !form.purpose}>Submit Request</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}