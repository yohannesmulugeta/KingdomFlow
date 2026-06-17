import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import TransactionForm from '@/components/transactions/TransactionForm';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function Expenses() {
  const { filterByBranch } = useCurrentUser();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    base44.entities.Transaction.filter({ type: 'expense' }, '-date', 50).then(data => {
      setTransactions(filterByBranch(data)); setLoading(false);
    });
  };
  useEffect(load, []);

  const handleDelete = async (id) => { await base44.entities.Transaction.delete(id); load(); };

  const fmt = (n) => new Intl.NumberFormat().format(n);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Expenses" description="Record and manage expense transactions">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Record Expense</Button>
      </PageHeader>

      {transactions.length === 0 ? (
        <EmptyState icon={ArrowUpCircle} title="No expenses recorded" description="Start by recording your first expense" actionLabel="Record Expense" onAction={() => { setEditing(null); setFormOpen(true); }} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{t.date}</td>
                    <td className="px-4 py-3">{t.category_name || '—'}</td>
                    <td className="px-4 py-3">{t.description || '—'}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{(t.payment_method || '').replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-700">{fmt(t.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        t.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                        t.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                      }`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(t); setFormOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <TransactionForm open={formOpen} onOpenChange={setFormOpen} type="expense" editing={editing} onSaved={load} />
    </div>
  );
}