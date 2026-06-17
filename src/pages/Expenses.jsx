import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUpCircle, Plus, Pencil, Ban } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/hooks/useCurrentUser';
import { toast } from '@/components/ui/use-toast';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'telebirr', label: 'Telebirr' },
  { value: 'check', label: 'Check' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'other', label: 'Other' },
];

export default function Expenses() {
  const { isBranchSpecific, userBranchId, can } = useCurrentUser();
  const canRecord = can('canRecordDirect');
  const canVoid = can('canApprove');
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [funds, setFunds] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [voidDialog, setVoidDialog] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], description: '', branch_id: '', department_id: '', fund_id: '', category_id: '', category_name: '', payment_method: 'cash', vendor_payee: '', receipt_number: '', receipt_needed: false, receipt_received: false, notes: '' });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = () => {
    Promise.all([
      base44.entities.Transaction.filter({ type: 'expense' }, '-date', 200),
      base44.entities.Branch.list(), base44.entities.ExpenseCategory.list(),
      base44.entities.Fund.list(), base44.entities.Department.list()
    ]).then(([t, b, c, f, d]) => {
      const filtered = isBranchSpecific ? t.filter(x => !x.branch_id || x.branch_id === userBranchId) : t;
      setTransactions(filtered.filter(x => x.status !== 'voided'));
      setBranches(b); setCategories(c); setFunds(f); setDepartments(d);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const openNew = () => { setForm({ amount: '', date: new Date().toISOString().split('T')[0], description: '', branch_id: isBranchSpecific ? userBranchId : '', department_id: '', fund_id: '', category_id: '', category_name: '', payment_method: 'cash', vendor_payee: '', receipt_number: '', receipt_needed: false, receipt_received: false, notes: '' }); setEditing(null); setDialogOpen(true); };
  const openEdit = (t) => { setForm({ amount: t.amount, date: t.date, description: t.description || '', branch_id: t.branch_id || '', department_id: t.department_id || '', fund_id: t.fund_id || '', category_id: t.category_id || '', category_name: t.category_name || '', payment_method: t.payment_method || 'cash', vendor_payee: t.vendor_payee || '', receipt_number: t.receipt_number || '', receipt_needed: t.receipt_needed || false, receipt_received: t.receipt_received || false, notes: t.notes || '' }); setEditing(t); setDialogOpen(true); };

  const handleSave = async () => {
    const payload = { ...form, amount: parseFloat(form.amount) || 0, type: 'expense' };
    if (!payload.amount || payload.amount <= 0) { toast({ title: 'Amount must be greater than zero', variant: 'destructive' }); return; }
    if (!payload.branch_id) { toast({ title: 'Branch is required', variant: 'destructive' }); return; }
    if (editing) {
      await base44.entities.Transaction.update(editing.id, payload);
      toast({ title: 'Updated' });
    } else {
      const res = await base44.functions.invoke('createTransaction', payload);
      if (res.data?.error) { toast({ title: 'Error', description: res.data.error, variant: 'destructive' }); return; }
      toast({ title: 'Expense recorded', description: res.data?.transaction_number });
    }
    setDialogOpen(false); load();
  };

  const handleVoid = async () => {
    await base44.functions.invoke('voidTransaction', { transaction_id: voidDialog.id, reason: voidReason });
    setVoidDialog(null); setVoidReason(''); load();
    toast({ title: 'Transaction voided' });
  };

  const fmt = (n) => new Intl.NumberFormat().format(n);
  const branchName = (id) => branches.find(b => b.id === id)?.name || '';
  const paged = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Expenses" description="Record and manage expense transactions">
        {canRecord && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Record Expense</Button>}
      </PageHeader>
      {transactions.length === 0 ? (
        <EmptyState icon={ArrowUpCircle} title="No expenses recorded" description="Start recording expenses" actionLabel={canRecord ? "Record Expense" : undefined} onAction={canRecord ? openNew : undefined} />
      ) : (
        <Card>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Payee</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th><th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th><th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th></tr></thead><tbody>{paged.map(t => (<tr key={t.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-4 py-3 text-xs text-muted-foreground">{t.transaction_number || '—'}</td><td className="px-4 py-3 text-muted-foreground">{t.date}</td><td className="px-4 py-3">{t.vendor_payee || '—'}</td><td className="px-4 py-3">{t.category_name || '—'}</td><td className="px-4 py-3 text-xs">{branchName(t.branch_id)}</td><td className="px-4 py-3 text-right font-medium text-red-700">{fmt(t.amount)}</td><td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : t.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{t.status}</span></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-1">{canRecord && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="w-3 h-3" /></Button>}{canVoid && t.status !== 'voided' && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setVoidDialog(t); setVoidReason(''); }}><Ban className="w-3 h-3" /></Button>}</div></td></tr>))}</tbody></table></div>
          {transactions.length > PAGE_SIZE && <div className="flex items-center justify-between px-4 py-3 border-t"><Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="text-xs text-muted-foreground">Page {page + 1} of {Math.ceil(transactions.length / PAGE_SIZE)}</span><Button variant="ghost" size="sm" disabled={(page + 1) * PAGE_SIZE >= transactions.length} onClick={() => setPage(p => p + 1)}>Next</Button></div>}
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{editing ? 'Edit Expense' : 'Record Expense'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4"><div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div><div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div></div>
            <div><Label>Branch *</Label><Select value={form.branch_id} onValueChange={v => setForm({ ...form, branch_id: v })} disabled={isBranchSpecific}><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger><SelectContent>{branches.filter(b => b.is_active !== false).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Category</Label><Select value={form.category_id} onValueChange={v => { const c = categories.find(x => x.id === v); setForm({ ...form, category_id: v, category_name: c?.name || '' }); }}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.filter(c => c.is_active !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Payment Method</Label><Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Vendor / Payee</Label><Input value={form.vendor_payee} onChange={e => setForm({ ...form, vendor_payee: e.target.value })} /></div><div><Label>Receipt Number</Label><Input value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} /></div></div>
            <div className="flex items-center gap-4"><div className="flex items-center gap-2"><Switch checked={form.receipt_needed} onCheckedChange={v => setForm({ ...form, receipt_needed: v })} /><Label>Receipt Needed</Label></div><div className="flex items-center gap-2"><Switch checked={form.receipt_received} onCheckedChange={v => setForm({ ...form, receipt_received: v })} /><Label>Receipt Received</Label></div></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Fund</Label><Select value={form.fund_id || 'none'} onValueChange={v => setForm({ ...form, fund_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{funds.filter(f => f.is_active !== false).map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Department</Label><Select value={form.department_id || 'none'} onValueChange={v => setForm({ ...form, department_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{departments.filter(d => d.is_active !== false).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={!form.amount || !form.date || !form.branch_id}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!voidDialog} onOpenChange={() => setVoidDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">Void Transaction</DialogTitle></DialogHeader><div className="space-y-4 mt-2"><p className="text-sm">Void {voidDialog?.transaction_number} ({fmt(voidDialog?.amount)})?</p><div><Label>Reason</Label><Input value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="Reason for voiding" /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setVoidDialog(null)}>Cancel</Button><Button variant="destructive" onClick={handleVoid}>Void</Button></div></div></DialogContent>
      </Dialog>
    </div>
  );
}