import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Building2, Plus, Pencil, Ban, Phone, MapPin, Globe } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

export default function Branches() {
  const { can } = useCurrentUser();
  const canManage = can('can_manage_branches');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', city: '', phone: '', manager_name: '' });

  const load = () => base44.entities.Branch.list().then(setBranches).finally(() => setLoading(false));
  useEffect(load, []);

  const handleSave = async () => {
    if (!form.name) return;
    if (editing) {
      await base44.entities.Branch.update(editing.id, form);
      toast({ title: 'Branch updated' });
    } else {
      await base44.entities.Branch.create(form);
      toast({ title: 'Branch created' });
    }
    setFormOpen(false); setEditing(null);
    setForm({ name: '', code: '', address: '', city: '', phone: '', manager_name: '' });
    load();
  };

  const toggleActive = async (branch) => {
    await base44.entities.Branch.update(branch.id, { is_active: !branch.is_active });
    load();
  };

  const openEdit = (b) => { setEditing(b); setForm({ name: b.name, code: b.code || '', address: b.address || '', city: b.city || '', phone: b.phone || '', manager_name: b.manager_name || '' }); setFormOpen(true); };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Branches" description="Manage church branches">
        {canManage && <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Branch</Button>}
      </PageHeader>
      {branches.length === 0 ? (
        <EmptyState icon={Building2} title="No branches yet" description="Add your first church branch" actionLabel={canManage ? "Add Branch" : undefined} onAction={canManage ? () => setFormOpen(true) : undefined} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(b => (
            <Card key={b.id} className={`p-4 ${!b.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-sm">{b.name}</h3>
                  {b.code && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{b.code}</span>}
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${b.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {b.address && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.address}</p>}
                {b.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {b.phone}</p>}
              </div>
              {canManage && (
                <div className="flex gap-1 mt-3 pt-3 border-t">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(b)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleActive(b)}><Ban className="w-3 h-3 mr-1" /> {b.is_active ? 'Deactivate' : 'Activate'}</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading">{editing ? 'Edit Branch' : 'New Branch'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3"><div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div><div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
            <div><Label>Manager Name</Label><Input value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button><Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}