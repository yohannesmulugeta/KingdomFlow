import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart as PieChartIcon, Download } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import useCurrentUser from '@/hooks/useCurrentUser';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(221,83%,53%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(262,83%,58%)', 'hsl(0,84%,60%)', 'hsl(180,60%,45%)'];

export default function Reports() {
  const { filterByBranch } = useCurrentUser();
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterBranch, setFilterBranch] = useState('all');

  const load = () => {
    Promise.all([base44.entities.Transaction.list('-date', 50), base44.entities.Branch.list()]).then(([t, b]) => {
      setTransactions(filterByBranch(t)); setBranches(b); setLoading(false);
    });
  };
  useEffect(load, []);

  const filtered = transactions.filter(t => {
    if (t.status !== 'approved') return false;
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    if (filterBranch !== 'all' && t.branch_id !== filterBranch) return false;
    return true;
  });

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

  // Category breakdown
  const incomeByCat = {};
  const expenseByCat = {};
  filtered.forEach(t => {
    const name = t.category_name || 'Uncategorized';
    if (t.type === 'income') incomeByCat[name] = (incomeByCat[name] || 0) + (t.amount || 0);
    else expenseByCat[name] = (expenseByCat[name] || 0) + (t.amount || 0);
  });
  const incomePieData = Object.entries(incomeByCat).map(([name, value]) => ({ name, value }));
  const expensePieData = Object.entries(expenseByCat).map(([name, value]) => ({ name, value }));

  // Branch comparison
  const branchCompare = branches.map(b => ({
    name: b.name,
    income: filtered.filter(t => t.branch_id === b.id && t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0),
    expense: filtered.filter(t => t.branch_id === b.id && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
  })).filter(b => b.income > 0 || b.expense > 0);

  const fmt = (n) => new Intl.NumberFormat().format(n);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Reports" description="Financial reports and analytics" />

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div>
          <div>
            <Label className="text-xs">Branch</Label>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
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
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Net</p>
          <p className={`text-2xl font-heading font-semibold mt-1 ${totalIncome - totalExpenses >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(totalIncome - totalExpenses)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Income by Category</h3>
          {incomePieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={incomePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {incomePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-20">No income data</p>}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Expenses by Category</h3>
          {expensePieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {expensePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-20">No expense data</p>}
        </Card>
      </div>

      {branchCompare.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Branch Comparison</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchCompare}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Bar dataKey="income" fill="hsl(142,71%,45%)" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="hsl(0,84%,60%)" name="Expense" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}