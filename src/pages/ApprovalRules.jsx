import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Plus, Pencil, Archive } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser, { ROLE_LABELS } from '@/hooks/useCurrentUser';
import { toast } from '@/components/ui/use-toast';

export default function ApprovalRules() {
  const { can } = useCurrentUser();
  const canManage = can('canManageUsers');
  const [rules, setRules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', transaction_type: 'both', min_amount: 0, max_amount: '', required_role: 'department_leader', approval_order: 1, branch_id: '', is_active: true });

  const load = () => { Promise.all([base44.entities.ApprovalRule.list(), base44.entities.Branch.list()]).then(([r, b]) => { setRules(r); setBranches(b); setLoading(false); }); };
  useEffect(load, []);

  const branchName = (id) => branches.find(b => b.id === id)?.name || 'All branches';
  const openNew = () => { setForm({ name: '', transaction_type: 'both', min_amount: 0, max_amount: '', required_role: 'department_leader', approval_order: 1, branch_id: '', is_active: true }); setEditing(null); setDialogOpen(true); };
  const openEdit = (r) => { setForm({ name: r.name, transaction_type: r.transaction_type || 'both', min_amount: r.min_amount || 0, max_amount: r.max_amount || '', required_role: r.required_role, approval_order: r.approval_order || 1, branch_id: r.branch_id || '', is_active: r.is_active !== false }); setEditing(r); setDialogOpen(true); };

  const handleSave = async () => {
    const data = { ...form, min_amount: parseFloat(form.min_amount) || 0, approval_order: parseInt(form.approval_order) || 1 };
    if (form.max_amount) data.max_amount = parseFloat(form.max_amount);
    if (!data.branch_id) delete data.branch_id;
    if (editing) await base44.entities.ApprovalRule.update(editing.id, data);
    else await base44.entities.ApprovalRule.create(data);
    setDialogOpen(false); load();
    toast({ title: editing ? 'Rule updated' : 'Rule created' });
  };

  const handleDeactivate = async (id) => { await base44.entities.ApprovalRule.update(id, { is_active: false }); load(); toast({ title: 'Rule deactivated' }); };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Approval Rules" description="Sequential approval stages">
        {canManage && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Rule</Button>}
      </PageHeader>
      {rules.length === 0 ? (
        <EmptyState icon={Shield} title="No rules" description="Create sequential approval rules" actionLabel={canManage ? "Add Rule" : undefined} onAction={canManage ? openNew : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map(r => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between"><h3 className="font-medium text-sm">{r.name}</h3><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${r.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>{r.is_active !== false ? 'Active' : 'Inactive'}</span></div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground"><p>Stage {r.approval_order}: {ROLE_LABELS[r.required_role] || r.required_role}</p><p>Type: <span className="capitalize">{r.transaction_type}</span></p><p>Amount: {r.min_amount || 0}{r.max_amount ? ` – ${new Intl.NumberFormat().format(r.max_amount)}` : '+'}</p><p>Branch: {branchName(r.branch_id)}</p></div>
              {canManage && r.is_active !== false && <div className="flex gap-2 mt-4 pt-3 border-t"><Button variant="outline" size="sm" onClick={() => openEdit(r)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button><Button variant="outline" size="sm" className="text-amber-600" onClick={() => handleDeactivate(r.id)}><Archive className="w-3 h-3 mr-1" /> Deactivate</Button></div>}
            </Card>
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">{editing ? 'Edit Rule' : 'New Rule'}</DialogTitle></DialogHeader><div className="space-y-4 mt-2"><div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="grid grid-cols-2 gap-4"><div><Label>Approval Stage</Label><Select value={String(form.approval_order)} onValueChange={v => setForm({ ...form, approval_order: parseInt(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Stage 1</SelectItem><SelectItem value="2">Stage 2</SelectItem><SelectItem value="3">Stage 3</SelectItem><SelectItem value="4">Stage 4</SelectItem></SelectContent></Select></div><div><Label>Required Role</Label><Select value={form.required_role} onValueChange={v => setForm({ ...form, required_role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div></div><div className="grid grid-cols-2 gap-4"><div><Label>Min Amount</Label><Input type="number" value={form.min_amount} onChange={e => setForm({ ...form, min_amount: e.target.value })} /></div><div><Label>Max Amount</Label><Input type="number" value={form.max_amount} onChange={e => setForm({ ...form, max_amount: e.target.value })} placeholder="No limit" /></div></div><div className="grid grid-cols-2 gap-4"><div><Label>Transaction Type</Label><Select value={form.transaction_type} onValueChange={v => setForm({ ...form, transaction_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="both">Both</SelectItem><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent></Select></div><div><Label>Branch</Label><Select value={form.branch_id || 'all'} onValueChange={v => setForm({ ...form, branch_id: v === 'all' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div></div><div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div><div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={!form.name}>Save</Button></div></div></DialogContent>
      </Dialog>
    </div>
  );
}