import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Plus, Pencil, TrendingDown, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from '@/components/ui/use-toast';

const CATEGORY_ENTITY = { income: 'IncomeCategory', expense: 'ExpenseCategory' };

export default function Budgets() {
  const { can } = useCurrentUser();
  const canEdit = can('can_manage_budgets');
  const [budgets, setBudgets] = useState([]);
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear(), type: 'expense', planned_amount: '', branch_id: '', department_id: '', fund_id: '', category_id: '', category_name: '' });
  const [catType, setCatType] = useState('expense');

  const load = () => {
    Promise.all([
      base44.entities.Budget.list('-created_date', 50),
      base44.entities.Branch.list(),
      base44.entities.IncomeCategory.list(),
      base44.entities.ExpenseCategory.list()
    ]).then(([b, br, ic, ec]) => { setBudgets(b); setBranches(br); setCategories([...ic, ...ec]); setLoading(false); });
  };
  useEffect(load, []);

  const openNew = () => { setForm({ name: '', year: new Date().getFullYear(), type: 'expense', planned_amount: '', branch_id: '', department_id: '', fund_id: '', category_id: '', category_name: '' }); setEditing(null); setCatType('expense'); setDialogOpen(true); };
  const openEdit = (b) => { setForm({ name: b.name, year: b.year, type: b.type, planned_amount: b.planned_amount, branch_id: b.branch_id || '', department_id: b.department_id || '', fund_id: b.fund_id || '', category_id: b.category_id || '', category_name: b.category_name || '' }); setEditing(b); setCatType(b.type || 'expense'); setDialogOpen(true); };

  const handleSave = async () => {
    const data = { ...form, planned_amount: parseFloat(form.planned_amount) || 0, year: parseInt(form.year) };
    if (editing) await base44.entities.Budget.update(editing.id, data);
    else await base44.entities.Budget.create(data);
    setDialogOpen(false); load();
    toast({ title: 'Budget saved' });
  };

  const branchName = (id) => branches.find(b => b.id === id)?.name || 'All';
  const fmt = (n) => new Intl.NumberFormat().format(n);
  const remaining = (b) => (b.planned_amount || 0) - (b.spent_amount || 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Budgets" description="Plan and track budgets">
        {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Budget</Button>}
      </PageHeader>

      {budgets.length === 0 ? (
        <EmptyState icon={DollarSign} title="No budgets yet" description="Create budgets to plan your church spending" actionLabel={canEdit ? "Add Budget" : undefined} onAction={canEdit ? openNew : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => {
            const rem = remaining(b);
            const pct = (b.planned_amount || 0) > 0 ? ((b.spent_amount || 0) / b.planned_amount) * 100 : 0;
            return (
              <Card key={b.id} className="p-5">
                <h3 className="font-medium text-sm">{b.name}</h3>
                <p className="text-xs text-muted-foreground">{b.year} · {b.type} · {branchName(b.branch_id)}</p>
                {b.category_name && <p className="text-xs text-muted-foreground">{b.category_name}</p>}
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span>Planned:</span><span className="font-medium">{fmt(b.planned_amount)}</span></div>
                  <div className="flex justify-between"><span>Spent:</span><span className="font-medium text-red-600">{fmt(b.spent_amount || 0)}</span></div>
                  <div className="flex justify-between"><span>Committed:</span><span className="font-medium text-amber-600">{fmt(b.committed_amount || 0)}</span></div>
                  <div className="flex justify-between border-t pt-1"><span className="font-semibold">Remaining:</span><span className={`font-semibold ${rem < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(rem)}</span></div>
                </div>
                <div className="mt-3 bg-muted rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                {pct > 80 && <p className="text-[10px] text-amber-600 mt-1">Budget at {pct.toFixed(0)}%</p>}
                {canEdit && (
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <Button variant="outline" size="sm" onClick={() => openEdit(b)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{editing ? 'Edit Budget' : 'New Budget'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div>
              <div><Label>Planned Amount *</Label><Input type="number" value={form.planned_amount} onChange={e => setForm({ ...form, planned_amount: e.target.value })} /></div>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => { setForm({ ...form, type: v }); setCatType(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Branch</Label><Select value={form.branch_id || 'all'} onValueChange={v => setForm({ ...form, branch_id: v === 'all' ? '' : v })}><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All branches</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name || !form.planned_amount}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}