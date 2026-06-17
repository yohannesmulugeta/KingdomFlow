import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Ban, Building2, Loader2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from '@/components/ui/use-toast';

export default function Departments() {
  const { can } = useCurrentUser();
  const canManage = can('can_manage_departments');
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', branch_id: '', description: '' });

  const load = () => { Promise.all([base44.entities.Department.list(), base44.entities.Branch.list()]).then(([d, b]) => { setDepartments(d); setBranches(b); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const branchName = (id) => branches.find(b => b.id === id)?.name || 'Church-wide';

  const handleSave = async () => {
    if (!form.name) return;
    if (editing) { await base44.entities.Department.update(editing.id, form); toast({ title: 'Department updated' }); }
    else { await base44.entities.Department.create(form); toast({ title: 'Department created' }); }
    setFormOpen(false); setEditing(null); setForm({ name: '', code: '', branch_id: '', description: '' }); load();
  };

  const toggleActive = async (d) => { await base44.entities.Department.update(d.id, { is_active: !d.is_active }); load(); };
  const openEdit = (d) => { setEditing(d); setForm({ name: d.name, code: d.code || '', branch_id: d.branch_id || '', description: d.description || '' }); setFormOpen(true); };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <PageHeader title="Departments" description="Manage church departments">
        {canManage && <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Department</Button>}
      </PageHeader>
      {departments.length === 0 ? (
        <EmptyState icon={Building2} title="No departments yet" description="Add your first department" actionLabel={canManage ? "Add Department" : undefined} onAction={canManage ? () => setFormOpen(true) : undefined} />
      ) : (
        <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>{canManage && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}</tr></thead><tbody>{departments.map(d => (<tr key={d.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-4 py-3 font-medium">{d.name}</td><td className="px-4 py-3 text-muted-foreground">{d.code || '—'}</td><td className="px-4 py-3 text-muted-foreground">{branchName(d.branch_id)}</td><td className="px-4 py-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${d.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{d.is_active ? 'Active' : 'Inactive'}</span></td>{canManage && <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="w-3 h-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(d)}><Ban className="w-3 h-3" /></Button></td>}</tr>))}</tbody></table></div></Card>
      )}

      <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">{editing ? 'Edit Department' : 'New Department'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3"><div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div></div>
            <div><Label>Branch</Label><Select value={form.branch_id || 'none'} onValueChange={v => setForm({ ...form, branch_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger><SelectContent><SelectItem value="none">Church-wide</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button><Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}