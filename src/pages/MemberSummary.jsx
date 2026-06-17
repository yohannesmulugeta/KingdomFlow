import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import useCurrentUser from '@/hooks/useCurrentUser';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MemberSummary() {
  const { can } = useCurrentUser();
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = () => {
    Promise.all([
      base44.entities.Transaction.filter({ status: 'approved' }, '-date', 200),
      base44.entities.Branch.list()
    ]).then(([t, b]) => { setTransactions(t); setBranches(b); setLoading(false); });
  };
  useEffect(load, []);

  const filtered = transactions.filter(t => filterBranch === 'all' ? true : t.branch_id === filterBranch);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

  // Monthly breakdown
  const monthly = {};
  filtered.forEach(t => {
    const m = t.date?.substring(0, 7) || 'Unknown';
    if (!monthly[m]) monthly[m] = { income: 0, expense: 0 };
    monthly[m][t.type] = (monthly[m][t.type] || 0) + (t.amount || 0);
  });
  const monthlyData = Object.entries(monthly).sort().map(([month, d]) => ({ month, ...d }));

  // Category breakdown (no sensitive info)
  const byCat = {};
  filtered.forEach(t => {
    const name = t.category_name || 'Uncategorized';
    if (!byCat[name]) byCat[name] = { income: 0, expense: 0 };
    byCat[name][t.type] = (byCat[name][t.type] || 0) + (t.amount || 0);
  });

  // Paginate category list
  const catEntries = Object.entries(byCat);
  const pagedCats = catEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const fmt = (n) => new Intl.NumberFormat().format(n);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Member Financial Summary" description="Church-wide financial overview (public view)" />

      <Card className="p-4 mb-6 flex flex-wrap items-end gap-4">
        <div><Label className="text-xs">Branch</Label><Select value={filterBranch} onValueChange={setFilterBranch}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Branches</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Income</p>
          <p className="text-2xl font-heading font-semibold text-emerald-700 mt-1">{fmt(totalIncome)}</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</p>
          <p className="text-2xl font-heading font-semibold text-red-700 mt-1">{fmt(totalExpenses)}</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Balance</p>
          <p className={`text-2xl font-heading font-semibold mt-1 ${totalIncome - totalExpenses >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(totalIncome - totalExpenses)}</p>
        </Card>
      </div>

      {monthlyData.length > 0 && (
        <Card className="p-5 mb-6">
          <h3 className="text-sm font-semibold mb-4">Monthly Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="income" fill="hsl(142,71%,45%)" name="Income" radius={[4,4,0,0]} />
                <Bar dataKey="expense" fill="hsl(0,84%,60%)" name="Expense" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Income</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Expenses</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net</th>
              </tr>
            </thead>
            <tbody>
              {pagedCats.map(([name, d]) => (
                <tr key={name} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{name}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{fmt(d.income)}</td>
                  <td className="px-4 py-3 text-right text-red-700">{fmt(d.expense)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${d.income - d.expense >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(d.income - d.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {catEntries.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page + 1} of {Math.ceil(catEntries.length / PAGE_SIZE)}</span>
            <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= catEntries.length} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </Card>
    </div>
  );
}