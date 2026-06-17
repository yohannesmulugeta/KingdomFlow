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
    const branchError = checkBranchAccess(user, body.branch_id);
    if (branchError) return Response.json({ error: branchError.error }, { status: branchError.status });

    const branchFilter = {};
    if (user.access_scope === 'assigned_branch') {
      branchFilter.branch_id = user.branch_id;
    } else if (body.branch_id) {
      branchFilter.branch_id = body.branch_id;
    }

    if (body.fund_id) branchFilter.fund_id = body.fund_id;
    if (body.type) branchFilter.type = body.type;

    const statusFilter = body.status
      ? { $in: Array.isArray(body.status) ? body.status : [body.status] }
      : { $in: ['approved', 'paid', 'completed'] };
    branchFilter.status = statusFilter;

    // Date range
    let dateFilter = {};
    if (body.date_from) dateFilter.$gte = body.date_from;
    if (body.date_to) dateFilter.$lte = body.date_to;
    if (Object.keys(dateFilter).length > 0) branchFilter.date = dateFilter;

    const page = parseInt(body.page) || 1;
    const pageSize = Math.min(parseInt(body.pageSize) || 25, 100);
    const skip = (page - 1) * pageSize;

    const [transactions, totalCount] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter(branchFilter, '-date', pageSize, skip),
      base44.asServiceRole.entities.Transaction.filter(branchFilter).then(r => r.length),
    ]);

    // Aggregate for reports
    const totals = await base44.asServiceRole.entities.Transaction.filter(branchFilter);
    const incomeTotal = totals.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expenseTotal = totals.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

    // Category breakdown
    const byCategory = {};
    totals.forEach(t => {
      const key = t.category_name || t.category_id || 'Uncategorized';
      if (!byCategory[key]) byCategory[key] = { income: 0, expense: 0 };
      if (t.type === 'income') byCategory[key].income += (t.amount || 0);
      else byCategory[key].expense += (t.amount || 0);
    });

    return Response.json({
      transactions: transactions.map(t => ({
        id: t.id, transaction_number: t.transaction_number, type: t.type,
        amount: t.amount, date: t.date, status: t.status,
        description: t.description, branch_id: t.branch_id,
        category_name: t.category_name, department_id: t.department_id,
        fund_id: t.fund_id, payment_method: t.payment_method,
        donor_name: t.type === 'income' ? (t.is_anonymous_donor ? 'Anonymous' : (t.donor_name || '')) : undefined,
        vendor_payee: t.type === 'expense' ? (t.vendor_payee || '') : undefined,
        receipt_received: t.receipt_received,
      })),
      totals: {
        income: incomeTotal,
        expense: expenseTotal,
        net: incomeTotal - expenseTotal,
      },
      byCategory,
      pagination: {
        page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});