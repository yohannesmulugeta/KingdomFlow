import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Shield, TrendingUp, TrendingDown } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import PageHeader from '@/components/shared/PageHeader';
import useCurrentUser from '@/hooks/useCurrentUser';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(221,83%,53%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(262,83%,58%)', 'hsl(0,84%,60%)'];

export default function Dashboard() {
  const { filterByBranch } = useCurrentUser();
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Transaction.list('-created_date', 50),
      base44.entities.Branch.list()
    ]).then(([txns, brs]) => {
      setTransactions(filterByBranch(txns));
      setBranches(brs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalIncome = transactions.filter(t => t.type === 'income' && t.status === 'approved').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'approved').reduce((s, t) => s + (t.amount || 0), 0);
  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const netBalance = totalIncome - totalExpenses;

  const recentTransactions = transactions.slice(0, 8);

  // Monthly data for chart
  const monthlyData = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    const m = d.getMonth();
    const income = transactions.filter(t => {
      const td = new Date(t.date);
      return t.type === 'income' && t.status === 'approved' && td.getMonth() === m && td.getFullYear() === year;
    }).reduce((s, t) => s + (t.amount || 0), 0);
    const expense = transactions.filter(t => {
      const td = new Date(t.date);
      return t.type === 'expense' && t.status === 'approved' && td.getMonth() === m && td.getFullYear() === year;
    }).reduce((s, t) => s + (t.amount || 0), 0);
    monthlyData.push({ month, income, expense });
  }

  // By branch pie
  const branchData = branches.map(b => ({
    name: b.name,
    value: transactions.filter(t => t.branch_id === b.id && t.status === 'approved').reduce((s, t) => s + (t.amount || 0), 0)
  })).filter(d => d.value > 0);

  const fmt = (n) => new Intl.NumberFormat('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <PageHeader title="Dashboard" description="Financial overview of your church" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Income" value={fmt(totalIncome)} icon={ArrowDownCircle} color="success" />
        <StatCard title="Total Expenses" value={fmt(totalExpenses)} icon={ArrowUpCircle} color="destructive" />
        <StatCard title="Net Balance" value={fmt(netBalance)} icon={netBalance >= 0 ? TrendingUp : TrendingDown} color={netBalance >= 0 ? 'primary' : 'destructive'} />
        <StatCard title="Pending Approvals" value={pendingCount} icon={Shield} color="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Income vs Expenses (Last 6 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="income" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="hsl(0,84%,60%)" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">By Branch</h3>
          {branchData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={branchData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
                    {branchData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No branch data yet</div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Transactions</h3>
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No transactions recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Date</th>
                  <th className="pb-2 font-medium text-muted-foreground">Description</th>
                  <th className="pb-2 font-medium text-muted-foreground">Type</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Amount</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(t => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2.5 text-muted-foreground">{t.date}</td>
                    <td className="py-2.5">{t.description || t.category_name || '—'}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        t.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {t.type === 'income' ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-medium">{fmt(t.amount)}</td>
                    <td className="py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        t.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                        t.status === 'rejected' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}