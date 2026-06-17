import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpCircle, Ban, Loader2, Wand2 } from 'lucide-react';
import { isDemoMode } from '@/lib/demoMode';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700', pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700', paid: 'bg-blue-100 text-blue-700',
  completed: 'bg-purple-100 text-purple-700', rejected: 'bg-red-100 text-red-700',
  voided: 'bg-red-200 text-red-800', archived: 'bg-gray-200 text-gray-600',
  receipt_needed: 'bg-orange-100 text-orange-700',
};

export default function Expenses() {
  const { can, userBranchId, accessScope } = useCurrentUser();
  const canCreate = can('can_create_expense');
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], description: '', branch_id: userBranchId || '', category_id: '', category_name: '', fund_id: '', payment_method: 'cash', vendor_payee: '', receipt_needed: true, notes: '', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [voidOpen, setVoidOpen] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const demoMode = isDemoMode();

  const load = () => {
    base44.functions.invoke('getReports', {
      type: 'expense', branch_id: accessScope === 'assigned_branch' ? userBranchId : undefined,
      page, pageSize: perPage, status: ['draft','pending','approved','paid','completed','rejected','receipt_needed'],
    }).then(res => { setTransactions(res.data?.transactions || []); setLoading(false); })
    .catch(() => { base44.entities.Transaction.filter({ type: 'expense' }, '-date', perPage, (page-1)*perPage).then(setTransactions).finally(() => setLoading(false)); });
    Promise.all([base44.entities.Branch.list(), base44.entities.ExpenseCategory.filter({ is_active: true }), base44.entities.Fund.filter({ is_active: true })]).then(([b, c, f]) => { setBranches(b); setCategories(c); setFunds(f); });
  };
  useEffect(load, [page, userBranchId]);

  const fm = (n) => new Intl.NumberFormat().format(n || 0);

  const fillSampleExpense = () => {
    setForm({
      amount: '2000', date: new Date().toISOString().split('T')[0],
      description: 'Demo ministry materials', branch_id: userBranchId || '',
      category_id: '', category_name: 'Ministry Expense', fund_id: '',
      payment_method: 'cash', vendor_payee: 'Demo Supplier',
      receipt_needed: true, notes: 'Demo ministry materials', status: 'draft',
    });
  };

  const handleSave = async (status) => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast({ title: 'Valid amount required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('createTransaction', {
        ...form, amount: parseFloat(form.amount), type: 'expense', status,
        branch_id: form.branch_id || userBranchId,
      });
      if (res.data?.error) { toast({ title: 'Error', description: res.data.error, variant: 'destructive' }); }
      else { toast({ title: status === 'draft' ? 'Draft saved' : 'Submitted' }); setFormOpen(false); load(); }
    } catch { toast({ title: 'Error saving', variant: 'destructive' }); }
    setSaving(false);
  };

  const handleVoid = async () => {
    const res = await base44.functions.invoke('voidTransaction', { transaction_id: voidOpen.id, action: 'void', reason: voidReason });
    if (res.data?.error) { toast({ title: 'Error', description: res.data.error, variant: 'destructive' }); return; }
    toast({ title: 'Voided' }); setVoidOpen(null); setVoidReason(''); load();
  };

  const handleSubmit = async (id) => {
    const res = await base44.functions.invoke('voidTransaction', { transaction_id: id, action: 'submit' });
    if (res.data?.error) toast({ title: 'Error', description: res.data.error, variant: 'destructive' });
    else { toast({ title: 'Submitted' }); load(); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <PageHeader title="Expenses" description="Record and manage expense transactions">
        {canCreate && <Button onClick={() => setFormOpen(true)}><ArrowUpCircle className="w-4 h-4 mr-2" /> Record Expense</Button>}
      </PageHeader>

      {transactions.length === 0 ? (
        <EmptyState icon={ArrowUpCircle} title="No expenses recorded" description="Record your first expense" actionLabel={canCreate ? "Record Expense" : undefined} onAction={canCreate ? () => setFormOpen(true) : undefined} />
      ) : (
        <>
          <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="px-4 py-3 text-left">Number</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-left">Payee</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{transactions.map(t => (<tr key={t.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-4 py-3 font-medium text-xs">{t.transaction_number}</td><td className="px-4 py-3 text-muted-foreground">{t.date}</td><td className="px-4 py-3">{t.description || t.category_name || '—'}</td><td className="px-4 py-3 text-muted-foreground">{t.vendor_payee || '—'}</td><td className="px-4 py-3 text-right font-medium text-red-600">-{fm(t.amount)}</td><td className="px-4 py-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] || 'bg-gray-100'}`}>{t.status}</span></td><td className="px-4 py-3 text-right">{t.status === 'draft' && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleSubmit(t.id)}>Submit</Button>}{['approved','paid','completed'].includes(t.status) && <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => { setVoidOpen(t); setVoidReason(''); }}><Ban className="w-3 h-3 mr-1" /> Void</Button>}</td></tr>))}</tbody></table></div></Card>
          <div className="flex justify-center gap-2 mt-4"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="text-sm text-muted-foreground self-center">Page {page}</span><Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>Next</Button></div>
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="font-heading">Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto">
            {demoMode && (
              <Button variant="outline" size="sm" className="w-full gap-1 border-dashed border-2 bg-primary/5" onClick={fillSampleExpense}>
                <Wand2 className="w-3 h-3" /> Add Sample Expense
              </Button>
            )}
            <div className="grid grid-cols-2 gap-3"><div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div><div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Select value={form.category_id || 'none'} onValueChange={v => { const cat = categories.find(c => c.id === v); setForm({ ...form, category_id: v === 'none' ? '' : v, category_name: cat?.name || '' }); }}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Fund</Label><Select value={form.fund_id || 'none'} onValueChange={v => setForm({ ...form, fund_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{funds.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Branch</Label><Select value={form.branch_id || 'none'} onValueChange={v => setForm({ ...form, branch_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Payment Method</Label><Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="telebirr">Telebirr</SelectItem><SelectItem value="check">Check</SelectItem><SelectItem value="mobile_money">Mobile Money</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div></div>
            <div><Label>Vendor / Payee</Label><Input value={form.vendor_payee} onChange={e => setForm({ ...form, vendor_payee: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setShowAdvanced(!showAdvanced)}>{showAdvanced ? 'Hide' : 'Show'} Optional Details</button>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>Save Draft</Button><Button onClick={() => handleSave('pending')} disabled={saving}>{saving ? 'Saving...' : 'Submit'}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!voidOpen} onOpenChange={() => setVoidOpen(null)}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">Void Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2"><div><Label>Reason *</Label><Input value={voidReason} onChange={e => setVoidReason(e.target.value)} /></div></div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setVoidOpen(null)}>Cancel</Button><Button variant="destructive" onClick={handleVoid}>Void</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}