import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function Funds() {
  const { isAdmin } = useCurrentUser();
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', target_amount: 0, is_active: true });

  const load = () => { base44.entities.Fund.list().then(d => { setFunds(d); setLoading(false); }); };
  useEffect(load, []);

  const openNew = () => { setForm({ name: '', code: '', description: '', target_amount: 0, is_active: true }); setEditing(null); setDialogOpen(true); };
  const openEdit = (f) => { setForm({ name: f.name, code: f.code || '', description: f.description || '', target_amount: f.target_amount || 0, is_active: f.is_active !== false }); setEditing(f); setDialogOpen(true); };

  const handleSave = async () => {
    if (editing) await base44.entities.Fund.update(editing.id, form);
    else await base44.entities.Fund.create(form);
    setDialogOpen(false); load();
  };

  const handleDelete = async (id) => { await base44.entities.Fund.delete(id); load(); };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Funds" description="Manage designated funds">
        {isAdmin && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Fund</Button>}
      </PageHeader>

      {funds.length === 0 ? (
        <EmptyState icon={Wallet} title="No funds yet" description="Create funds like Tithe, Building, Mission, etc." actionLabel={isAdmin ? "Add Fund" : undefined} onAction={isAdmin ? openNew : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funds.map(f => (
            <Card key={f.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-sm">{f.name}</h3>
                  {f.code && <p className="text-xs text-muted-foreground">{f.code}</p>}
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${f.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {f.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              {f.description && <p className="text-xs text-muted-foreground mt-2">{f.description}</p>}
              {f.target_amount > 0 && <p className="text-xs font-medium mt-2">Target: {new Intl.NumberFormat().format(f.target_amount)}</p>}
              {isAdmin && (
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => openEdit(f)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(f.id)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{editing ? 'Edit Fund' : 'New Fund'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Target Amount</Label><Input type="number" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: parseFloat(e.target.value) || 0 })} /></div>
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