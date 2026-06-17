import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tag, Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function Categories() {
  const { isAdmin } = useCurrentUser();
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('income');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', is_active: true });

  const load = () => {
    Promise.all([base44.entities.IncomeCategory.list(), base44.entities.ExpenseCategory.list()]).then(([ic, ec]) => {
      setIncomeCategories(ic); setExpenseCategories(ec); setLoading(false);
    });
  };
  useEffect(load, []);

  const openNew = (type) => { setForm({ name: '', code: '', description: '', is_active: true }); setEditing(null); setDialogType(type); setDialogOpen(true); };
  const openEdit = (cat, type) => { setForm({ name: cat.name, code: cat.code || '', description: cat.description || '', is_active: cat.is_active !== false }); setEditing(cat); setDialogType(type); setDialogOpen(true); };

  const handleSave = async () => {
    const entity = dialogType === 'income' ? base44.entities.IncomeCategory : base44.entities.ExpenseCategory;
    if (editing) await entity.update(editing.id, form);
    else await entity.create(form);
    setDialogOpen(false); load();
  };

  const handleDelete = async (id, type) => {
    const entity = type === 'income' ? base44.entities.IncomeCategory : base44.entities.ExpenseCategory;
    await entity.delete(id); load();
  };

  const renderList = (items, type) => {
    if (items.length === 0) return <EmptyState icon={Tag} title={`No ${type} categories`} description={`Add categories to classify your ${type}`} actionLabel={isAdmin ? "Add Category" : undefined} onAction={isAdmin ? () => openNew(type) : undefined} />;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(c => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {type === 'income' ? <ArrowDownCircle className="w-4 h-4 text-emerald-600" /> : <ArrowUpCircle className="w-4 h-4 text-red-600" />}
                <div>
                  <h3 className="font-medium text-sm">{c.name}</h3>
                  {c.code && <p className="text-[11px] text-muted-foreground">{c.code}</p>}
                </div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                {c.is_active !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
            {c.description && <p className="text-xs text-muted-foreground mt-2">{c.description}</p>}
            {isAdmin && (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => openEdit(c, type)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(c.id, type)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Categories" description="Income and expense categories" />
      <Tabs defaultValue="income">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="income">Income Categories</TabsTrigger>
            <TabsTrigger value="expense">Expense Categories</TabsTrigger>
          </TabsList>
          {isAdmin && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openNew('income')}><Plus className="w-3 h-3 mr-1" /> Income</Button>
              <Button size="sm" variant="outline" onClick={() => openNew('expense')}><Plus className="w-3 h-3 mr-1" /> Expense</Button>
            </div>
          )}
        </div>
        <TabsContent value="income">{renderList(incomeCategories, 'income')}</TabsContent>
        <TabsContent value="expense">{renderList(expenseCategories, 'expense')}</TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{editing ? 'Edit' : 'New'} {dialogType === 'income' ? 'Income' : 'Expense'} Category</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
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