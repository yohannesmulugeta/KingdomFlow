import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function authorize(user, requiredRoles) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  if (!user.church_role) return { error: 'KingdomFlow role not configured', status: 403 };
  if ((user.status || 'active') !== 'active') return { error: 'Account not active', status: 403 };
  if (user.must_change_password === true) return { error: 'Password change required', status: 403 };
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.church_role)) {
    return { error: `Requires: ${requiredRoles.join(', ')}`, status: 403 };
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const authError = authorize(user, []);
    if (authError) return Response.json({ error: authError.error }, { status: authError.status });

    const branchFilter = user.access_scope === 'assigned_branch' && user.branch_id
      ? { branch_id: user.branch_id }
      : {};

    const transactions = await base44.asServiceRole.entities.Transaction.filter(
      { ...branchFilter, status: { $in: ['approved', 'paid', 'completed'] } },
      'date',
      2000
    );

    // Only return safe aggregated data - NO donor names, vendor details, notes, etc.
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    // Category totals (anonymous)
    const incomeByCategory = {};
    const expenseByCategory = {};
    transactions.forEach(t => {
      const key = t.category_name || t.category_id || 'Uncategorized';
      if (t.type === 'income') {
        incomeByCategory[key] = (incomeByCategory[key] || 0) + (t.amount || 0);
      } else {
        expenseByCategory[key] = (expenseByCategory[key] || 0) + (t.amount || 0);
      }
    });

    // Monthly totals
    const monthlyTotals = {};
    transactions.forEach(t => {
      const month = t.date?.substring(0, 7) || 'unknown';
      if (!monthlyTotals[month]) monthlyTotals[month] = { income: 0, expense: 0 };
      if (t.type === 'income') monthlyTotals[month].income += (t.amount || 0);
      else monthlyTotals[month].expense += (t.amount || 0);
    });

    // Fund progress
    const funds = await base44.asServiceRole.entities.Fund.filter({ is_active: true });
    const fundProgress = funds.map(f => {
      const fTxns = transactions.filter(t => t.fund_id === f.id);
      const fIncome = fTxns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
      const fExpense = fTxns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
      return {
        name: f.name,
        code: f.code,
        balance: (f.opening_balance || 0) + fIncome - fExpense,
        target: f.target_amount,
      };
    });

    return Response.json({
      total_approved_income: totalIncome,
      total_approved_expenses: totalExpenses,
      net_balance: totalIncome - totalExpenses,
      income_by_category: incomeByCategory,
      expense_by_category: expenseByCategory,
      monthly_totals: monthlyTotals,
      fund_progress: fundProgress,
      transaction_count: transactions.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});