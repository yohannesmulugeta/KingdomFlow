import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fund_id } = body;

    // Branch filter: assigned_branch users only see their branch
    let branchFilter = {};
    if (user.access_scope === 'assigned_branch' && user.branch_id) {
      branchFilter = { branch_id: user.branch_id };
    }

    const transactions = await base44.asServiceRole.entities.Transaction.filter(
      { fund_id, status: { $in: ['approved', 'pending'] }, ...branchFilter },
      'date',
      500
    );

    const fund = await base44.asServiceRole.entities.Fund.get(fund_id);
    const openingBalance = fund?.opening_balance || 0;

    const approvedIncome = transactions
      .filter(t => t.type === 'income' && t.status === 'approved')
      .reduce((s, t) => s + (t.amount || 0), 0);

    const approvedExpenses = transactions
      .filter(t => t.type === 'expense' && t.status === 'approved')
      .reduce((s, t) => s + (t.amount || 0), 0);

    const committedExpenses = transactions
      .filter(t => t.type === 'expense' && t.status === 'pending')
      .reduce((s, t) => s + (t.amount || 0), 0);

    const availableBalance = openingBalance + approvedIncome - approvedExpenses;
    const committedBalance = openingBalance + approvedIncome - approvedExpenses - committedExpenses;

    return Response.json({
      opening_balance: openingBalance,
      total_income: approvedIncome,
      total_expenses: approvedExpenses,
      committed_expenses: committedExpenses,
      available_balance: availableBalance,
      committed_balance: committedBalance,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});