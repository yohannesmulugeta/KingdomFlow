import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart as PieChartIcon } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import useCurrentUser from '@/hooks/useCurrentUser';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(221,83%,53%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(262,83%,58%)', 'hsl(0,84%,60%)', 'hsl(180,60%,45%)'];

export default function Reports() {
  const { isBranchSpecific, userBranchId } = useCurrentUser();
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterBranch, setFilterBranch] = useState('all');

  const load = () => {
    Promise.all([
      base44.entities.Transaction.list('-date', 500),
      base44.entities.Branch.list(),
      base44.entities.Fund.list()
    ]).then(([t, b, f]) => {
      const filtered = isBranchSpecific ? t.filter(x => !x.branch_id || x.branch_id === userBranchId) : t;
      setTransactions(filtered);
      setBranches(b); setFunds(f);
      setLoading(false);
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

  const incomeByCat = {}; const expenseByCat = {};
  filtered.forEach(t => { const name = t.category_name || 'Uncategorized'; if (t.type === 'income') incomeByCat[name] = (incomeByCat[name] || 0) + (t.amount || 0); else expenseByCat[name] = (expenseByCat[name] || 0) + (t.amount || 0); });
  const incomePie = Object.entries(incomeByCat).map(([n, v]) => ({ name: n, value: v }));
  const expensePie = Object.entries(expenseByCat).map(([n, v]) => ({ name: n, value: v }));

  // Fund summary
  const fundSummary = funds.filter(f => f.is_active !== false).map(f => {
    const income = filtered.filter(t => t.fund_id === f.id && t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expense = filtered.filter(t => t.fund_id === f.id && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    return { name: f.name, opening: f.opening_balance || 0, income, expense, available: (f.opening_balance || 0) + income - expense };
  });

  const branchCompare = branches.map(b => ({ name: b.name, income: filtered.filter(t => t.branch_id === b.id && t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0), expense: filtered.filter(t => t.branch_id === b.id && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0) })).filter(b => b.income > 0 || b.expense > 0);

  const fmt = (n) => new Intl.NumberFormat().format(n);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Reports" description="Financial reports and analytics" />
      <Card className="p-4 mb-6 flex flex-wrap items-end gap-4"><div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div><div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div><div><Label className="text-xs">Branch</Label><Select value={filterBranch} onValueChange={setFilterBranch}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div></Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"><Card className="p-5 text-center"><p className="text-xs text-muted-foreground uppercase">Income</p><p className="text-2xl font-heading font-semibold text-emerald-700">{fmt(totalIncome)}</p></Card><Card className="p-5 text-center"><p className="text-xs text-muted-foreground uppercase">Expenses</p><p className="text-2xl font-heading font-semibold text-red-700">{fmt(totalExpenses)}</p></Card><Card className="p-5 text-center"><p className="text-xs text-muted-foreground uppercase">Net</p><p className={`text-2xl font-heading font-semibold ${totalIncome - totalExpenses >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(totalIncome - totalExpenses)}</p></Card></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5"><h3 className="text-sm font-semibold mb-4">Income by Category</h3>{incomePie.length > 0 ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={incomePie} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>{incomePie.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip formatter={v => fmt(v)} /></PieChart></ResponsiveContainer></div> : <p className="text-sm text-muted-foreground text-center py-20">No data</p>}</Card>
        <Card className="p-5"><h3 className="text-sm font-semibold mb-4">Expenses by Category</h3>{expensePie.length > 0 ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expensePie} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>{expensePie.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip formatter={v => fmt(v)} /></PieChart></ResponsiveContainer></div> : <p className="text-sm text-muted-foreground text-center py-20">No data</p>}</Card>
      </div>
      {fundSummary.length > 0 && (
        <Card className="p-5 mb-6"><h3 className="text-sm font-semibold mb-4">Fund Balances</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="pb-2 text-left font-medium text-muted-foreground">Fund</th><th className="pb-2 text-right font-medium text-muted-foreground">Opening</th><th className="pb-2 text-right font-medium text-muted-foreground">Income</th><th className="pb-2 text-right font-medium text-muted-foreground">Expenses</th><th className="pb-2 text-right font-medium text-muted-foreground">Available</th></tr></thead><tbody>{fundSummary.map(f => (<tr key={f.name} className="border-b last:border-0"><td className="py-2.5 font-medium">{f.name}</td><td className="py-2.5 text-right">{fmt(f.opening)}</td><td className="py-2.5 text-right text-emerald-700">{fmt(f.income)}</td><td className="py-2.5 text-right text-red-700">{fmt(f.expense)}</td><td className={`py-2.5 text-right font-medium ${f.available >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(f.available)}</td></tr>))}</tbody></table></div></Card>
      )}
      {branchCompare.length > 0 && <Card className="p-5"><h3 className="text-sm font-semibold mb-4">Branch Comparison</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={branchCompare}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={v => fmt(v)} /><Legend /><Bar dataKey="income" fill="hsl(142,71%,45%)" name="Income" radius={[4,4,0,0]} /><Bar dataKey="expense" fill="hsl(0,84%,60%)" name="Expense" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></Card>}
    </div>
  );
}