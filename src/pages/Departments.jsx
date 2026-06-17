import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FolderOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function Departments() {
  const { isAdmin } = useCurrentUser();
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', branch_id: '', description: '', is_active: true });

  const load = () => {
    Promise.all([base44.entities.Department.list(), base44.entities.Branch.list()]).then(([d, b]) => {
      setDepartments(d); setBranches(b); setLoading(false);
    });
  };
  useEffect(load, []);

  const branchName = (id) => branches.find(b => b.id === id)?.name || '—';
  const openNew = () => { setForm({ name: '', code: '', branch_id: '', description: '', is_active: true }); setEditing(null); setDialogOpen(true); };
  const openEdit = (d) => { setForm({ name: d.name, code: d.code || '', branch_id: d.branch_id || '', description: d.description || '', is_active: d.is_active !== false }); setEditing(d); setDialogOpen(true); };

  const handleSave = async () => {
    const data = { ...form };
    if (!data.branch_id) delete data.branch_id;
    if (editing) { await base44.entities.Department.update(editing.id, data); }
    else { await base44.entities.Department.create(data); }
    setDialogOpen(false); load();
  };

  const handleDelete = async (id) => { await base44.entities.Department.delete(id); load(); };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Departments" description="Manage church departments">
        {isAdmin && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Department</Button>}
      </PageHeader>

      {departments.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No departments yet" description="Create departments to categorize your activities" actionLabel={isAdmin ? "Add Department" : undefined} onAction={isAdmin ? openNew : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(d => (
            <Card key={d.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-sm">{d.name}</h3>
                  {d.code && <p className="text-xs text-muted-foreground">{d.code}</p>}
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${d.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {d.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              {d.branch_id && <p className="text-xs text-muted-foreground mt-2">Branch: {branchName(d.branch_id)}</p>}
              {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
              {isAdmin && (
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => openEdit(d)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{editing ? 'Edit Department' : 'New Department'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            </div>
            <div>
              <Label>Branch (optional)</Label>
              <Select value={form.branch_id} onValueChange={v => setForm({ ...form, branch_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Church-wide" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Church-wide</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}