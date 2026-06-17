import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function authorize(user, requiredRoles) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  if (!user.church_role) return { error: 'KingdomFlow role not configured', status: 403 };
  if ((user.status || 'active') !== 'active') return { error: 'Account not active', status: 403 };
  if (user.must_change_password === true) return { error: 'Password change required', status: 403 };
  if (user.church_role === 'auditor') return { error: 'Auditors have read-only access', status: 403 };
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.church_role)) {
    return { error: `Requires: ${requiredRoles.join(', ')}`, status: 403 };
  }
  return null;
}

function checkBranchAccess(user, targetBranchId) {
  if (user.access_scope === 'all_branches') return null;
  if (!user.branch_id) return { error: 'No branch assigned', status: 403 };
  if (targetBranchId && user.branch_id !== targetBranchId) return { error: 'Cannot access other branch records', status: 403 };
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

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const [transactions, branches, pendingApprovals] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter({ ...branchFilter }, '-date', 20),
      base44.asServiceRole.entities.Branch.list(),
      base44.asServiceRole.entities.Transaction.filter({ status: 'pending', ...branchFilter }),
    ]);

    // Month-to-date
    const thisMonth = transactions.filter(t => t.date >= thisMonthStart);
    const incomeMTD = thisMonth.filter(t => t.type === 'income' && t.status === 'approved').reduce((s, t) => s + (t.amount || 0), 0);
    const expenseMTD = thisMonth.filter(t => t.type === 'expense' && t.status === 'approved').reduce((s, t) => s + (t.amount || 0), 0);

    // All-time totals
    const totalIncome = transactions.filter(t => t.type === 'income' && t.status === 'approved').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense' && ['approved','paid','completed'].includes(t.status)).reduce((s, t) => s + (t.amount || 0), 0);

    const receiptNeeded = transactions.filter(t => t.receipt_needed === true && t.receipt_received !== true && t.status !== 'voided').length;

    // 6-month summary
    const sixMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toLocaleString('default', { month: 'short' });
      const monthStart = d.toISOString().split('T')[0];
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const monthTxns = transactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
      sixMonths.push({
        month: monthKey,
        income: monthTxns.filter(t => t.type === 'income' && t.status === 'approved').reduce((s, t) => s + (t.amount || 0), 0),
        expense: monthTxns.filter(t => t.type === 'expense' && ['approved','paid','completed'].includes(t.status)).reduce((s, t) => s + (t.amount || 0), 0),
      });
    }

    // Branch summary
    const branchSummary = branches.filter(b => {
      if (user.access_scope === 'assigned_branch') return b.id === user.branch_id;
      return true;
    }).map(b => {
      const bTxns = transactions.filter(t => t.branch_id === b.id);
      return {
        id: b.id, name: b.name,
        income: bTxns.filter(t => t.type === 'income' && t.status === 'approved').reduce((s, t) => s + (t.amount || 0), 0),
        expense: bTxns.filter(t => t.type === 'expense' && ['approved','paid','completed'].includes(t.status)).reduce((s, t) => s + (t.amount || 0), 0),
      };
    });

    return Response.json({
      incomeMTD, expenseMTD,
      netMTD: incomeMTD - expenseMTD,
      totalIncome, totalExpense,
      netTotal: totalIncome - totalExpense,
      pendingCount: pendingApprovals.length,
      receiptNeededCount: receiptNeeded,
      sixMonthSummary: sixMonths,
      branchSummary,
      recentTransactions: transactions.slice(0, 10).map(t => ({
        id: t.id, transaction_number: t.transaction_number, type: t.type,
        amount: t.amount, date: t.date, status: t.status,
        description: t.description, branch_id: t.branch_id,
        category_name: t.category_name,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});