import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, TrendingDown, Clock, Receipt, Building2, PlusCircle, ArrowUpCircle, FileCheck, Wallet, Sparkles } from 'lucide-react';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import StatCard from '@/components/shared/StatCard';
import DemoGuidedTour from '@/components/demo/DemoGuidedTour';
import { isDemoMode } from '@/lib/demoMode';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

export default function Dashboard() {
  const { userBranchId, accessScope, mustChangePassword } = useCurrentUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const demoMode = isDemoMode();

  useEffect(() => {
    if (mustChangePassword) return;
    base44.functions.invoke('getDashboardSummary', { branch_id: userBranchId })
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
    if (demoMode) {
      base44.entities.MoneyRequest.filter({ status: { $in: ['submitted', 'pending_approval'] } }).then(rs => setPendingRequests(rs.length)).catch(() => {});
    }
  }, [userBranchId, mustChangePassword, demoMode]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const summary = data || { incomeMTD: 0, expenseMTD: 0, netMTD: 0, pendingCount: 0, receiptNeededCount: 0, sixMonthSummary: [], branchSummary: [], recentTransactions: [], fundBalances: [] };
  const fm = (n) => new Intl.NumberFormat().format(n || 0);

  const buildingFund = summary.fundBalances?.find(f => f.name?.includes('Building')) || null;
  const buildingProgress = buildingFund && buildingFund.target > 0 ? Math.round(((buildingFund.collected || 0) / buildingFund.target) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Demo Welcome */}
      {demoMode && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50/50 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-heading font-semibold">Welcome to KingdomFlow</h2>
              <p className="text-sm text-muted-foreground">Manage church income, expenses, funds, requests, and reports in one place.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link to="/income"><Button size="sm" className="gap-1"><PlusCircle className="w-4 h-4" /> Record Income</Button></Link>
            <Link to="/expenses"><Button size="sm" variant="outline" className="gap-1"><ArrowUpCircle className="w-4 h-4" /> Record Expense</Button></Link>
            <Link to="/request-money"><Button size="sm" variant="outline" className="gap-1"><FileCheck className="w-4 h-4" /> Request Money</Button></Link>
          </div>
        </Card>
      )}

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

      {/* Building Fund Progress */}
      {buildingFund && (
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium flex items-center gap-2"><Building2 className="w-4 h-4" /> {buildingFund.name}</h3>
            <span className="text-xs font-semibold text-primary">{buildingProgress}%</span>
          </div>
          <div className="bg-muted rounded-full h-2 mb-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(buildingProgress, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{fm(buildingFund.collected || 0)} collected</span>
            <span>Target: {fm(buildingFund.target)}</span>
          </div>
        </Card>
      )}

      {/* Pending Requests */}
      {demoMode && pendingRequests > 0 && (
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Receipt className="w-4 h-4 text-amber-600" />
              <span className="text-amber-800">{pendingRequests} money request{pendingRequests !== 1 ? 's' : ''} awaiting approval</span>
            </div>
            <Link to="/approvals"><Button size="sm" variant="outline">View</Button></Link>
          </div>
        </Card>
      )}

      {/* Guided Tour */}
      <DemoGuidedTour />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Income vs Expenses</h3>
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
          <h3 className="text-sm font-medium mb-3">Branch Summary</h3>
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