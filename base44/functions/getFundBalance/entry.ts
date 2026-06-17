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

    const body = await req.json();
    const { fund_id } = body;

    const fund = await base44.asServiceRole.entities.Fund.get(fund_id);
    if (!fund) return Response.json({ error: 'Fund not found' }, { status: 404 });

    const branchError = checkBranchAccess(user, body.branch_id);
    if (branchError) return Response.json({ error: branchError.error }, { status: branchError.status });

    const branchFilter = user.access_scope === 'assigned_branch'
      ? { branch_id: user.branch_id }
      : (body.branch_id ? { branch_id: body.branch_id } : {});

    const transactions = await base44.asServiceRole.entities.Transaction.filter({
      fund_id,
      ...branchFilter,
      status: { $in: ['approved', 'paid', 'completed', 'pending', 'receipt_needed'] }
    }, 'date', 2000);

    const openingBalance = fund.opening_balance || 0;
    const approvedIncome = transactions
      .filter(t => t.type === 'income' && t.status === 'approved')
      .reduce((s, t) => s + (t.amount || 0), 0);

    const paidExpenses = transactions
      .filter(t => t.type === 'expense' && ['paid', 'completed'].includes(t.status))
      .reduce((s, t) => s + (t.amount || 0), 0);

    const approvedExpenses = transactions
      .filter(t => t.type === 'expense' && t.status === 'approved')
      .reduce((s, t) => s + (t.amount || 0), 0);

    const committedExpenses = transactions
      .filter(t => t.type === 'expense' && t.status === 'pending')
      .reduce((s, t) => s + (t.amount || 0), 0);

    const availableBalance = openingBalance + approvedIncome - paidExpenses - approvedExpenses;
    const remainingAfterCommitments = availableBalance - committedExpenses;
    const targetAmount = fund.target_amount || 0;
    const progressPercent = targetAmount > 0
      ? Math.round(((openingBalance + approvedIncome) / targetAmount) * 100)
      : null;

    return Response.json({
      fund_name: fund.name,
      fund_code: fund.code,
      opening_balance: openingBalance,
      approved_income: approvedIncome,
      paid_expenses: paidExpenses,
      approved_unpaid_expenses: approvedExpenses,
      committed_expenses: committedExpenses,
      available_balance: availableBalance,
      remaining_after_commitments: remainingAfterCommitments,
      target_amount: targetAmount,
      progress_percent: progressPercent,
      total_inflow: openingBalance + approvedIncome,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});