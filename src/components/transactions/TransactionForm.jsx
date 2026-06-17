import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCurrentUser } from '@/contexts/CurrentUserContext';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

export default function TransactionForm({ open, onOpenChange, type, editing, onSaved }) {
  const { accessScope, userBranchId } = useCurrentUser();
  const isBranchSpecific = accessScope === 'assigned_branch';
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [funds, setFunds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    type, amount: '', date: new Date().toISOString().split('T')[0], description: '',
    reference_number: '', branch_id: '', department_id: '', fund_id: '',
    category_id: '', category_name: '', payment_method: 'cash', notes: ''
  });

  useEffect(() => {
    const catEntity = type === 'income' ? base44.entities.IncomeCategory : base44.entities.ExpenseCategory;
    Promise.all([
      base44.entities.Branch.list(),
      base44.entities.Department.list(),
      base44.entities.Fund.list(),
      catEntity.list()
    ]).then(([b, d, f, c]) => {
      setBranches(b);
      setDepartments(d);
      setFunds(f);
      setCategories(c.filter(x => x.is_active !== false));
    });
  }, [type]);

  useEffect(() => {
    if (editing) {
      setForm({
        type: editing.type, amount: editing.amount, date: editing.date,
        description: editing.description || '', reference_number: editing.reference_number || '',
        branch_id: editing.branch_id || '', department_id: editing.department_id || '',
        fund_id: editing.fund_id || '', category_id: editing.category_id || '',
        category_name: editing.category_name || '', payment_method: editing.payment_method || 'cash',
        notes: editing.notes || ''
      });
    } else {
      setForm(prev => ({
        ...prev, type, amount: '', date: new Date().toISOString().split('T')[0],
        description: '', reference_number: '', branch_id: isBranchSpecific ? userBranchId : '',
        department_id: '', fund_id: '', category_id: '', category_name: '',
        payment_method: 'cash', notes: ''
      }));
    }
  }, [editing, type, open]);

  const handleCategoryChange = (catId) => {
    const cat = categories.find(c => c.id === catId);
    setForm({ ...form, category_id: catId, category_name: cat?.name || '' });
  };

  const handleSave = async () => {
    const data = { ...form, amount: parseFloat(form.amount) || 0 };
    if (editing) await base44.entities.Transaction.update(editing.id, data);
    else await base44.entities.Transaction.create(data);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editing ? 'Edit' : 'New'} {type === 'income' ? 'Income' : 'Expense'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Branch *</Label>
            <Select value={form.branch_id} onValueChange={v => setForm({ ...form, branch_id: v })} disabled={isBranchSpecific}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {branches.filter(b => b.is_active !== false).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={handleCategoryChange}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Department</Label>
              <Select value={form.department_id} onValueChange={v => setForm({ ...form, department_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.filter(d => d.is_active !== false).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fund</Label>
              <Select value={form.fund_id} onValueChange={v => setForm({ ...form, fund_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {funds.filter(f => f.is_active !== false).map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <Label>Reference Number</Label>
            <Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder="e.g. Receipt #" />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.amount || !form.date || !form.branch_id}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}