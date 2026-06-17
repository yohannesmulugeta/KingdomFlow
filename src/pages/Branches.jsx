import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function Branches() {
  const { isAdmin } = useCurrentUser();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', city: '', phone: '', manager_name: '', is_active: true });

  const load = () => {
    base44.entities.Branch.list().then(data => { setBranches(data); setLoading(false); });
  };
  useEffect(load, []);

  const resetForm = () => setForm({ name: '', code: '', address: '', city: '', phone: '', manager_name: '', is_active: true });

  const openNew = () => { resetForm(); setEditing(null); setDialogOpen(true); };
  const openEdit = (b) => { setForm({ name: b.name, code: b.code, address: b.address || '', city: b.city || '', phone: b.phone || '', manager_name: b.manager_name || '', is_active: b.is_active !== false }); setEditing(b); setDialogOpen(true); };

  const handleSave = async () => {
    if (editing) {
      await base44.entities.Branch.update(editing.id, form);
    } else {
      await base44.entities.Branch.create(form);
    }
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.Branch.delete(id);
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Branches" description="Manage your church branches">
        {isAdmin && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Branch</Button>}
      </PageHeader>

      {branches.length === 0 ? (
        <EmptyState icon={Building2} title="No branches yet" description="Create your first branch to get started" actionLabel={isAdmin ? "Add Branch" : undefined} onAction={isAdmin ? openNew : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(b => (
            <Card key={b.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{b.name}</h3>
                    <p className="text-xs text-muted-foreground">{b.code}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${b.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {b.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              {(b.address || b.city) && <p className="text-xs text-muted-foreground mt-3">{[b.address, b.city].filter(Boolean).join(', ')}</p>}
              {b.manager_name && <p className="text-xs text-muted-foreground mt-1">Manager: {b.manager_name}</p>}
              {isAdmin && (
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => openEdit(b)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Branch' : 'New Branch'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Code *</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. BR01" />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Manager Name</Label>
              <Input value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name || !form.code}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}