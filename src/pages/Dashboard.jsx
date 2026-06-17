import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Clock, Receipt, Building2 } from 'lucide-react';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import StatCard from '@/components/shared/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

export default function Dashboard() {
  const { userBranchId, accessScope, mustChangePassword } = useCurrentUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mustChangePassword) return;
    base44.functions.invoke('getDashboardSummary', { branch_id: userBranchId })
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userBranchId, mustChangePassword]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const summary = data || { incomeMTD: 0, expenseMTD: 0, netMTD: 0, pendingCount: 0, receiptNeededCount: 0, sixMonthSummary: [], branchSummary: [], recentTransactions: [] };
  const fm = (n) => new Intl.NumberFormat().format(n || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Financial overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Income (MTD)" value={fm(summary.incomeMTD)} icon={TrendingUp} color="success" />
        <StatCard title="Expenses (MTD)" value={fm(summary.expenseMTD)} icon={TrendingDown} color="destructive" />
        <StatCard title="Net Balance" value={fm(summary.netMTD)} icon={BarChart3} color="primary" />
        <StatCard title="Pending Approvals" value={summary.pendingCount} icon={Clock} color="warning" />
      </div>

      {summary.receiptNeededCount > 0 && (
        <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50/50">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <Receipt className="w-4 h-4" /> {summary.receiptNeededCount} transaction{summary.receiptNeededCount !== 1 ? 's' : ''} need{summary.receiptNeededCount === 1 ? 's' : ''} receipt{summary.receiptNeededCount !== 1 ? 's' : ''}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">6-Month Summary</h3>
          {summary.sixMonthSummary?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={summary.sixMonthSummary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="income" fill="#22c55e" name="Income" />
                <Bar dataKey="expense" fill="#ef4444" name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Branch Breakdown</h3>
          {summary.branchSummary?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={summary.branchSummary} dataKey="income" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {summary.branchSummary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>}
        </Card>
      </div>

      {summary.recentTransactions?.length > 0 && (
        <Card>
          <div className="p-4 border-b"><h3 className="text-sm font-medium">Recent Transactions</h3></div>
          <div className="divide-y">
            {summary.recentTransactions.map(t => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.transaction_number}</p>
                  <p className="text-xs text-muted-foreground">{t.description || t.category_name || t.type}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{fm(t.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t.date} · {t.status}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}